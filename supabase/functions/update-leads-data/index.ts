import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type Strategy = 'all' | 'latest' | 'manual';

interface UpdatePayload {
  fields: string[]; // chaves de coluna a atualizar
  mapping: Record<string, string>; // systemField -> fileColumn
  rows: Record<string, any>[];
  strategy: Strategy;
  file_name?: string;
  manual_selection?: Record<string, string>; // cpf -> lead_id (quando strategy='manual')
}

const normalizeCpf = (raw: any): string | null => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits || digits.length > 11) return null;
  return digits.padStart(11, '0');
};

const toNumber = (raw: any): number | null => {
  if (raw == null || raw === '') return null;
  const s = String(raw).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};
const toInt = (raw: any): number | null => {
  const n = toNumber(raw);
  return n == null ? null : Math.trunc(n);
};
const toDate = (raw: any): string | null => {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  return null;
};

const NUMERIC_FIELDS = new Set(['margem_disponivel', 'margem_total', 'parcela']);
const INT_FIELDS = new Set(['parcelas_em_aberto', 'parcelas_pagas']);
const DATE_FIELDS = new Set(['deferimento', 'ultimo_desconto', 'ultima_parcela', 'data_nascimento']);

const castValue = (key: string, raw: any) => {
  if (NUMERIC_FIELDS.has(key)) return toNumber(raw);
  if (INT_FIELDS.has(key)) return toInt(raw);
  if (DATE_FIELDS.has(key)) return toDate(raw);
  if (raw == null) return null;
  const s = String(raw).trim();
  return s === '' ? null : s;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthenticated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: uc } = await adminClient.from('user_companies').select('company_id').eq('user_id', user.id).limit(1).maybeSingle();
    const company_id = uc?.company_id ?? null;

    const payload = await req.json() as UpdatePayload;
    const { fields, mapping, rows, strategy, file_name, manual_selection } = payload;

    if (!fields?.length || !mapping || !Array.isArray(rows)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const get = (row: Record<string, any>, key: string) => {
      const col = mapping[key];
      return col ? row[col] : undefined;
    };

    // Preview/aplicação: agrupa por CPF
    const byCpf = new Map<string, { row: any; updates: Record<string, any> }>();
    const skipped: Array<{ cpf?: string; reason: string; row?: any }> = [];
    let invalid = 0;
    for (const row of rows) {
      const cpf = normalizeCpf(get(row, 'cpf'));
      if (!cpf) { invalid++; skipped.push({ reason: 'CPF inválido', row }); continue; }
      const updates: Record<string, any> = {};
      for (const f of fields) {
        const raw = get(row, f);
        if (raw !== undefined && raw !== '') updates[f] = castValue(f, raw);
      }
      if (Object.keys(updates).length === 0) {
        skipped.push({ cpf, reason: 'Nenhum campo válido na linha', row });
        continue;
      }
      byCpf.set(cpf, { row, updates });
    }

    const cpfs = Array.from(byCpf.keys());

    // Busca leads existentes
    const allLeads = new Map<string, Array<{ id: string; created_at: string; margem_disponivel: number | null }>>();
    for (let i = 0; i < cpfs.length; i += 500) {
      const chunk = cpfs.slice(i, i + 500);
      const { data } = await adminClient
        .from('leads_database')
        .select('id, cpf, created_at, margem_disponivel')
        .in('cpf', chunk);
      for (const r of data ?? []) {
        if (!allLeads.has(r.cpf)) allLeads.set(r.cpf, []);
        allLeads.get(r.cpf)!.push(r as any);
      }
    }

    let updated = 0;
    let notFound = 0;
    const marginHistory: any[] = [];

    for (const [cpf, { row, updates }] of byCpf) {
      const leads = allLeads.get(cpf) ?? [];
      if (leads.length === 0) {
        notFound++;
        skipped.push({ cpf, reason: 'CPF não encontrado na base', row });
        continue;
      }

      let targets: typeof leads = [];
      if (leads.length === 1 || strategy === 'all') {
        targets = leads;
      } else if (strategy === 'latest') {
        targets = [leads.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0]];
      } else if (strategy === 'manual') {
        const id = manual_selection?.[cpf];
        const t = leads.find(l => l.id === id);
        targets = t ? [t] : [];
        if (!t) { skipped.push({ cpf, reason: 'Múltiplos contratos sem seleção manual', row }); continue; }
      }

      const finalUpdates = { ...updates } as any;
      if ('margem_disponivel' in updates) {
        finalUpdates.margem_atualizada_em = new Date().toISOString();
      }

      for (const t of targets) {
        if ('margem_disponivel' in updates && t.margem_disponivel != null && updates.margem_disponivel !== t.margem_disponivel) {
          marginHistory.push({
            lead_id: t.id,
            cpf,
            margem_anterior: t.margem_disponivel,
            margem_nova: updates.margem_disponivel,
            changed_by: user.id,
          });
          finalUpdates.margem_anterior = t.margem_disponivel;
        }
        const { error } = await adminClient.from('leads_database').update(finalUpdates).eq('id', t.id);
        if (error) {
          skipped.push({ cpf, reason: error.message, row });
        } else {
          updated++;
        }
      }
    }

    if (marginHistory.length > 0) {
      // best-effort: ignora erro se tabela não existir
      await adminClient.from('leads_margem_history').insert(marginHistory).then(() => {}, () => {});
    }

    // Log
    await adminClient.from('import_logs').insert({
      module: 'leads_premium',
      file_name: file_name ?? 'update.xlsx',
      total_records: rows.length,
      success_count: updated,
      error_count: invalid,
      duplicate_count: 0,
      status: 'completed',
      imported_by: user.id,
      company_id,
      tipo: 'update',
      fields_updated: fields,
      skipped_detail: skipped.slice(0, 5000),
    });

    return new Response(JSON.stringify({
      success: true,
      updated,
      not_found: notFound,
      invalid,
      skipped_sample: skipped.slice(0, 50),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error('update-leads-data error', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
