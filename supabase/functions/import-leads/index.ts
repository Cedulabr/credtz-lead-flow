import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ImportPayload {
  convenio: string;
  subtipo?: string | null;
  estado?: string | null;
  mapping: Record<string, string>; // systemField -> fileColumn
  rows: Record<string, any>[];
  file_name?: string;
  file_hash?: string;
  file_size_bytes?: number;
  required_fields?: string[]; // configurável por empresa
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
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const yy = y.length === 2 ? `20${y}` : y;
    return `${yy}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
  return null;
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

    // Resolve company_id
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: uc } = await adminClient
      .from('user_companies')
      .select('company_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    const company_id = uc?.company_id ?? null;

    const payload = await req.json() as ImportPayload;
    const { convenio, subtipo, estado, mapping, rows, file_name, file_hash, file_size_bytes, required_fields } = payload;

    if (!convenio || !mapping || !Array.isArray(rows)) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Conjunto de campos exigidos por validação. Se vier vazio do cliente,
    // mantém comportamento histórico (cpf + name obrigatórios).
    const requiredSet = new Set(
      (required_fields && required_fields.length > 0)
        ? required_fields
        : ['cpf', 'name']
    );

    // Cria import log inicial
    const { data: importLog } = await adminClient.from('import_logs').insert({
      module: 'leads_premium',
      file_name: file_name ?? 'import.xlsx',
      total_records: rows.length,
      success_count: 0,
      error_count: 0,
      duplicate_count: 0,
      status: 'processing',
      imported_by: user.id,
      company_id,
      file_hash,
      file_size_bytes,
      convenio,
      subtipo,
      estado,
      tipo: 'import',
    }).select('id').single();

    const importLogId = importLog?.id;

    const get = (row: Record<string, any>, key: string) => {
      const col = mapping[key];
      return col ? row[col] : undefined;
    };

    const skipped: Array<{ cpf?: string; reason: string; row?: any }> = [];
    const toInsert: any[] = [];
    let invalid = 0;

    // Pré-coleta para checagem em lote de duplicidade
    const candidates: Array<{ row: any; payload: any; key: string | null }> = [];

    for (const row of rows) {
      const cpf = normalizeCpf(get(row, 'cpf'));
      const name = String(get(row, 'name') ?? '').trim();
      if (!cpf || !name) {
        invalid++;
        skipped.push({ cpf: cpf ?? undefined, reason: 'CPF ou nome inválido', row });
        continue;
      }

      const banco = String(get(row, 'banco') ?? '').trim() || null;
      const parcela = toNumber(get(row, 'parcela'));
      const parcelas_em_aberto = toInt(get(row, 'parcelas_em_aberto'));

      const ddd = String(get(row, 'ddd') ?? '').replace(/\D/g, '');
      const phoneRaw = String(get(row, 'phone') ?? '').replace(/\D/g, '');
      const phone = phoneRaw ? (ddd && !phoneRaw.startsWith(ddd) ? ddd + phoneRaw : phoneRaw) : null;

      const leadPayload: any = {
        cpf,
        name,
        phone,
        convenio: String(get(row, 'convenio') ?? convenio),
        banco,
        matricula: String(get(row, 'matricula') ?? '').trim() || null,
        margem_disponivel: toNumber(get(row, 'margem_disponivel')),
        margem_total: toNumber(get(row, 'margem_total')),
        situacao: String(get(row, 'situacao') ?? '').trim() || null,
        ade: String(get(row, 'ade') ?? '').trim() || null,
        tipo_servico_servidor: String(get(row, 'tipo_servico_servidor') ?? '').trim() || null,
        tipo_beneficio: String(get(row, 'tipo_beneficio') ?? '').trim() || null,
        parcela,
        parcelas_em_aberto,
        parcelas_pagas: toInt(get(row, 'parcelas_pagas')),
        deferimento: toDate(get(row, 'deferimento')),
        ultimo_desconto: toDate(get(row, 'ultimo_desconto')),
        ultima_parcela: toDate(get(row, 'ultima_parcela')),
        data_nascimento: toDate(get(row, 'data_nascimento')),
        origem_base: convenio,
        subtipo: subtipo ?? null,
        estado: estado ?? null,
        is_available: true,
        import_log_id: importLogId,
      };

      const dedupKey = (banco && parcela != null && parcelas_em_aberto != null)
        ? `${cpf}|${banco}|${parcela}|${parcelas_em_aberto}`
        : null;

      candidates.push({ row, payload: leadPayload, key: dedupKey });
    }

    // Checa duplicidade no banco em lote
    const cpfsToCheck = Array.from(new Set(candidates.filter(c => c.key).map(c => c.payload.cpf)));
    let existingMap = new Set<string>();
    if (cpfsToCheck.length > 0) {
      // chunked select
      for (let i = 0; i < cpfsToCheck.length; i += 500) {
        const chunk = cpfsToCheck.slice(i, i + 500);
        const { data } = await adminClient
          .from('leads_database')
          .select('cpf,banco,parcela,parcelas_em_aberto')
          .in('cpf', chunk);
        for (const r of data ?? []) {
          if (r.banco && r.parcela != null && r.parcelas_em_aberto != null) {
            existingMap.add(`${r.cpf}|${r.banco}|${r.parcela}|${r.parcelas_em_aberto}`);
          }
        }
      }
    }

    const seenInBatch = new Set<string>();
    const cpfsBefore = new Set<string>();
    const cpfsAdded = new Set<string>();

    // Quais CPFs já existem ANTES (qualquer registro)?
    if (cpfsToCheck.length > 0) {
      for (let i = 0; i < cpfsToCheck.length; i += 500) {
        const chunk = cpfsToCheck.slice(i, i + 500);
        const { data } = await adminClient.from('leads_database').select('cpf').in('cpf', chunk);
        for (const r of data ?? []) cpfsBefore.add(r.cpf);
      }
    }

    let duplicates = 0;
    for (const c of candidates) {
      if (c.key) {
        if (existingMap.has(c.key) || seenInBatch.has(c.key)) {
          duplicates++;
          skipped.push({ cpf: c.payload.cpf, reason: 'Contrato já existe (mesmo CPF, banco e parcela)', row: c.row });
          continue;
        }
        seenInBatch.add(c.key);
      }
      toInsert.push(c.payload);
      if (!cpfsBefore.has(c.payload.cpf)) cpfsAdded.add(c.payload.cpf);
    }

    // Insere em lotes
    let imported = 0;
    for (let i = 0; i < toInsert.length; i += 500) {
      const chunk = toInsert.slice(i, i + 500);
      const { error } = await adminClient.from('leads_database').insert(chunk);
      if (error) {
        // tenta um a um para isolar erros (raro)
        for (const row of chunk) {
          const { error: e2 } = await adminClient.from('leads_database').insert(row);
          if (e2) {
            invalid++;
            skipped.push({ cpf: row.cpf, reason: e2.message, row });
          } else imported++;
        }
      } else {
        imported += chunk.length;
      }
    }

    // Atualiza log
    await adminClient.from('import_logs').update({
      success_count: imported,
      duplicate_count: duplicates,
      error_count: invalid,
      status: 'completed',
      skipped_detail: skipped.slice(0, 5000),
    }).eq('id', importLogId);

    const cpfsExistingWithNew = new Set(toInsert.map(r => r.cpf).filter(c => cpfsBefore.has(c)));

    return new Response(JSON.stringify({
      success: true,
      import_log_id: importLogId,
      imported,
      duplicates,
      invalid,
      cpfs_unique_added: cpfsAdded.size,
      cpfs_existing_with_new_contract: cpfsExistingWithNew.size,
      skipped_sample: skipped.slice(0, 50),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (e: any) {
    console.error('import-leads error', e);
    return new Response(JSON.stringify({ error: e?.message ?? 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
