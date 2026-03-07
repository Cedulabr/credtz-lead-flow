import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_RESULTS = 5000;

// Safe cast expressions that skip non-numeric values (e.g. header rows like "VLPARCELA")
const SAFE_NUMERIC = (col: string) => `CASE WHEN ${col} ~ '^[0-9]+(\\.[0-9]+)?$' THEN ${col}::numeric ELSE NULL END`;
const SAFE_INT = (col: string) => `CASE WHEN ${col} ~ '^[0-9]+$' THEN ${col}::integer ELSE NULL END`;

interface RadarFilters {
  uf?: string;
  cidade?: string;
  banco_emprestimo?: string;
  parcelas_pagas_min?: number;
  qtd_contratos_min?: number;
  valor_parcela_min?: number;
  saldo_min?: number;
  esp_filter?: string;
  ddb_range?: string;
  representante?: string;
  smart_filter?: string;
}

function buildWhereClause(filters: RadarFilters): { where: string; params: (string | number)[] } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  let paramIndex = 1;

  // Always exclude header/garbage rows
  conditions.push(`cpf ~ '^[0-9]'`);

  if (filters.uf) {
    conditions.push(`uf = $${paramIndex++}`);
    params.push(filters.uf);
  }
  if (filters.cidade) {
    conditions.push(`UPPER(municipio) LIKE '%' || UPPER($${paramIndex++}) || '%'`);
    params.push(filters.cidade);
  }
  if (filters.banco_emprestimo) {
    conditions.push(`bancoemprestimo = $${paramIndex++}`);
    params.push(filters.banco_emprestimo);
  }
  if (filters.valor_parcela_min) {
    conditions.push(`${SAFE_NUMERIC('vlparcela')} >= $${paramIndex++}`);
    params.push(filters.valor_parcela_min);
  }
  if (filters.saldo_min) {
    conditions.push(`${SAFE_NUMERIC('saldo')} >= $${paramIndex++}`);
    params.push(filters.saldo_min);
  }
  if (filters.parcelas_pagas_min) {
    conditions.push(`${SAFE_INT('prazo')} >= $${paramIndex++}`);
    params.push(filters.parcelas_pagas_min);
  }
  if (filters.representante === 'sim') {
    conditions.push(`representante IS NOT NULL AND representante != '' AND representante != 'NAO TEM'`);
  } else if (filters.representante === 'nao') {
    conditions.push(`(representante IS NULL OR representante = '' OR representante = 'NAO TEM')`);
  }

  if (filters.esp_filter) {
    switch (filters.esp_filter) {
      case 'consignaveis_exceto_32_92':
        conditions.push(`esp NOT IN ('32', '92')`);
        break;
      case 'consignaveis_exceto_32_92_21_01':
        conditions.push(`esp NOT IN ('32', '92', '21', '01')`);
        break;
      case 'consignaveis_exceto_loas':
        conditions.push(`esp NOT ILIKE '%loas%' AND esp NOT IN ('87', '88')`);
        break;
      case 'consignaveis_exceto_32_92_21_01_loas':
        conditions.push(`esp NOT IN ('32', '92', '21', '01') AND esp NOT ILIKE '%loas%' AND esp NOT IN ('87', '88')`);
        break;
    }
  }

  if (filters.ddb_range) {
    switch (filters.ddb_range) {
      case 'ate_1_ano':
        conditions.push(`ddb IS NOT NULL AND ddb != '' AND ddb ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' AND TO_DATE(ddb, 'DD/MM/YYYY') >= NOW() - INTERVAL '1 year'`);
        break;
      case '1_5_anos':
        conditions.push(`ddb IS NOT NULL AND ddb != '' AND ddb ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' AND TO_DATE(ddb, 'DD/MM/YYYY') BETWEEN NOW() - INTERVAL '5 years' AND NOW() - INTERVAL '1 year'`);
        break;
      case '5_mais':
        conditions.push(`ddb IS NOT NULL AND ddb != '' AND ddb ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' AND TO_DATE(ddb, 'DD/MM/YYYY') < NOW() - INTERVAL '5 years'`);
        break;
    }
  }

  if (filters.smart_filter) {
    switch (filters.smart_filter) {
      case 'alta_rentabilidade':
        conditions.push(`(${SAFE_NUMERIC('vlparcela')} >= 400 OR ${SAFE_NUMERIC('saldo')} >= 5000)`);
        break;
      case 'refinanciamento_forte':
        conditions.push(`${SAFE_INT('prazo')} >= 36`);
        break;
      case 'parcelas_altas':
        conditions.push(`${SAFE_NUMERIC('vlparcela')} >= 600`);
        break;
      case 'muitos_contratos':
        break;
      case 'contratos_antigos':
        conditions.push(`${SAFE_INT('prazo')} >= 24`);
        break;
    }
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  return { where, params };
}

function calculateScore(client: any): { score: number; classification: string } {
  let score = 0;
  const maxParcela = client.max_parcela || 0;
  const maxSaldo = client.max_saldo || 0;
  const totalContratos = client.total_contratos || 0;
  const maxPrazo = client.max_prazo || 0;

  if (maxParcela >= 800) score += 30;
  else if (maxParcela >= 600) score += 20;
  else if (maxParcela >= 400) score += 10;

  if (maxSaldo >= 10000) score += 25;
  else if (maxSaldo >= 5000) score += 15;

  if (totalContratos >= 6) score += 15;
  else if (totalContratos >= 3) score += 10;

  if (maxPrazo >= 36) score += 20;
  else if (maxPrazo >= 24) score += 10;

  let classification = 'Baixa';
  if (score >= 70) classification = 'Premium';
  else if (score >= 50) classification = 'Alta';
  else if (score >= 30) classification = 'Média';

  return { score, classification };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filters = {}, page = 1, per_page = 50, mode = 'search' } = await req.json();

    const pool = new Pool({
      hostname: Deno.env.get('BASEOFF_PG_HOST'),
      port: parseInt(Deno.env.get('BASEOFF_PG_PORT') || '6432'),
      user: Deno.env.get('BASEOFF_PG_USER'),
      password: Deno.env.get('BASEOFF_PG_PASSWORD'),
      database: Deno.env.get('BASEOFF_PG_DATABASE'),
    }, 3, true);

    const connection = await pool.connect();

    try {
      // Base condition to always exclude header rows
      const headerFilter = `cpf ~ '^[0-9]'`;

      if (mode === 'stats') {
        const statsQueries = [
          { key: 'alta_rentabilidade', sql: `SELECT COUNT(DISTINCT cpf) as cnt FROM mailing_inss WHERE ${headerFilter} AND (${SAFE_NUMERIC('vlparcela')} >= 400 OR ${SAFE_NUMERIC('saldo')} >= 5000)` },
          { key: 'refinanciamento_forte', sql: `SELECT COUNT(DISTINCT cpf) as cnt FROM mailing_inss WHERE ${headerFilter} AND ${SAFE_INT('prazo')} >= 36` },
          { key: 'parcelas_altas', sql: `SELECT COUNT(DISTINCT cpf) as cnt FROM mailing_inss WHERE ${headerFilter} AND ${SAFE_NUMERIC('vlparcela')} >= 600` },
          { key: 'muitos_contratos', sql: `SELECT COUNT(*) as cnt FROM (SELECT cpf FROM mailing_inss WHERE ${headerFilter} GROUP BY cpf HAVING COUNT(*) >= 6) sub` },
        ];

        const stats: Record<string, number> = {};
        for (const sq of statsQueries) {
          try {
            const r = await connection.queryObject(sq.sql);
            stats[sq.key] = parseInt((r.rows[0] as any)?.cnt || '0');
          } catch {
            stats[sq.key] = 0;
          }
        }

        connection.release();
        await pool.end();

        return new Response(JSON.stringify({ stats }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // mode === 'search'
      const { where, params } = buildWhereClause(filters);
      const offset = (page - 1) * per_page;
      const isMuitosContratos = filters.smart_filter === 'muitos_contratos';

      let countQuery: string;
      let countParams: (string | number)[];

      if (isMuitosContratos) {
        countQuery = `SELECT COUNT(*) as cnt FROM (SELECT cpf FROM mailing_inss ${where} GROUP BY cpf HAVING COUNT(*) >= 6) sub`;
        countParams = [...params];
      } else {
        countQuery = `SELECT COUNT(DISTINCT cpf) as cnt FROM mailing_inss ${where}`;
        countParams = [...params];
      }

      const countResult = await connection.queryObject(countQuery, countParams);
      const totalReal = parseInt((countResult.rows[0] as any)?.cnt || '0');
      const totalCapped = Math.min(totalReal, MAX_RESULTS);
      const capped = totalReal > MAX_RESULTS;

      const effectiveOffset = Math.min(offset, Math.max(0, totalCapped - per_page));

      const havingClause = isMuitosContratos ? 'HAVING COUNT(*) >= 6' : '';

      const query = `
        SELECT 
          cpf, 
          MAX(nome) as nome, 
          MAX(uf) as uf, 
          MAX(municipio) as municipio,
          MAX(esp) as esp,
          MAX(dtnascimento) as dtnascimento,
          MAX(bancoemprestimo) as banco_principal,
          MAX(${SAFE_NUMERIC('vlparcela')}) as max_parcela,
          MAX(${SAFE_NUMERIC('saldo')}) as max_saldo,
          MAX(${SAFE_INT('prazo')}) as max_prazo,
          COUNT(*) as total_contratos,
          array_agg(DISTINCT NULLIF(COALESCE(telefone1, ''), '')) FILTER (WHERE telefone1 IS NOT NULL AND telefone1 != '') as telefones_1,
          array_agg(DISTINCT NULLIF(COALESCE(telefone2, ''), '')) FILTER (WHERE telefone2 IS NOT NULL AND telefone2 != '') as telefones_2
        FROM mailing_inss
        ${where}
        GROUP BY cpf
        ${havingClause}
        ORDER BY MAX(${SAFE_NUMERIC('vlparcela')}) DESC NULLS LAST
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      const queryParams = [...params, per_page, effectiveOffset];

      const result = await connection.queryObject(query, queryParams);
      const rows = result.rows as any[];

      const clients = rows.map((row) => {
        const { score, classification } = calculateScore({
          max_parcela: parseFloat(row.max_parcela) || 0,
          max_saldo: parseFloat(row.max_saldo) || 0,
          total_contratos: parseInt(row.total_contratos) || 0,
          max_prazo: parseInt(row.max_prazo) || 0,
        });

        let idade = null;
        if (row.dtnascimento) {
          try {
            const parts = row.dtnascimento.split('/');
            if (parts.length === 3) {
              const birthDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
              const ageDiff = Date.now() - birthDate.getTime();
              idade = Math.floor(ageDiff / (365.25 * 24 * 60 * 60 * 1000));
            }
          } catch { /* ignore */ }
        }

        const phones: string[] = [];
        const seen = new Set<string>();
        for (const arr of [row.telefones_1, row.telefones_2]) {
          if (Array.isArray(arr)) {
            for (const p of arr) {
              if (p && !seen.has(p)) { seen.add(p); phones.push(p); }
            }
          }
        }

        return {
          cpf: row.cpf,
          nome: row.nome,
          uf: row.uf,
          municipio: row.municipio,
          esp: row.esp,
          idade,
          banco_principal: row.banco_principal,
          max_parcela: parseFloat(row.max_parcela) || 0,
          max_saldo: parseFloat(row.max_saldo) || 0,
          max_prazo: parseInt(row.max_prazo) || 0,
          total_contratos: parseInt(row.total_contratos) || 0,
          opportunity_score: score,
          classification,
          telefones: phones,
        };
      });

      connection.release();
      await pool.end();

      const totalPages = Math.ceil(totalCapped / per_page);

      return new Response(JSON.stringify({
        clients,
        total: totalCapped,
        total_real: totalReal,
        capped,
        page,
        per_page,
        total_pages: totalPages,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (queryError) {
      connection.release();
      throw queryError;
    }

  } catch (error) {
    console.error('Radar query error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
