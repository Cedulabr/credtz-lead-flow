import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Pool } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { search_term, search_limit = 50, search_offset = 0 } = await req.json();

    if (!search_term || search_term.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'Termo de busca deve ter pelo menos 3 caracteres' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pool = new Pool({
      hostname: Deno.env.get('BASEOFF_PG_HOST'),
      port: parseInt(Deno.env.get('BASEOFF_PG_PORT') || '6432'),
      user: Deno.env.get('BASEOFF_PG_USER'),
      password: Deno.env.get('BASEOFF_PG_PASSWORD'),
      database: Deno.env.get('BASEOFF_PG_DATABASE'),
    }, 3, true);

    const connection = await pool.connect();
    const term = search_term.trim();
    const cleanDigits = term.replace(/\D/g, '');

    let matchType = 'nome';
    let query = '';
    let queryParams: (string | number)[] = [];

    if (cleanDigits.length === 11) {
      matchType = 'cpf';
      query = `
        SELECT *, COUNT(*) OVER() as total_count
        FROM mailing_inss
        WHERE REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '') = $1
        ORDER BY nome
        LIMIT $2 OFFSET $3
      `;
      queryParams = [cleanDigits, search_limit, search_offset];
    } else if (cleanDigits.length >= 8 && cleanDigits.length <= 10 && term === cleanDigits) {
      matchType = 'nb';
      query = `
        SELECT *, COUNT(*) OVER() as total_count
        FROM mailing_inss
        WHERE nb LIKE '%' || $1 || '%'
        ORDER BY nome
        LIMIT $2 OFFSET $3
      `;
      queryParams = [cleanDigits, search_limit, search_offset];
    } else {
      matchType = 'nome';
      query = `
        SELECT *, COUNT(*) OVER() as total_count
        FROM mailing_inss
        WHERE UPPER(nome) LIKE '%' || UPPER($1) || '%'
        ORDER BY nome
        LIMIT $2 OFFSET $3
      `;
      queryParams = [term, search_limit, search_offset];
    }

    const result = await connection.queryObject(query, queryParams);
    const rows = result.rows as any[];
    const totalCount = rows.length > 0 ? parseInt(rows[0].total_count) : 0;

    connection.release();
    await pool.end();

    // Group rows by CPF to aggregate contracts per client
    const clientMap = new Map<string, any>();

    for (const row of rows) {
      const cpf = row.cpf || '';
      if (!clientMap.has(cpf)) {
        clientMap.set(cpf, {
          cpf,
          nome: row.nome,
          nb: row.nb,
          data_nascimento: row.dtnascimento,
          mr: parseFloat(row.mr) || 0,
          valor_rmc: parseFloat(row.valorrmc) || 0,
          valor_rcc: parseFloat(row.valorrcc) || 0,
          total_count: totalCount,
          match_type: matchType,
          contracts: [],
        });
      }

      // Add contract info if present
      if (row.contrato || row.bancoemprestimo) {
        clientMap.get(cpf).contracts.push({
          banco_emprestimo: row.bancoemprestimo,
          contrato: row.contrato,
          vl_parcela: parseFloat(row.vlparcela) || 0,
          prazo: parseInt(row.prazo) || 0,
          tipo_emprestimo: row.tipoemprestimo,
          situacao_emprestimo: row.situacaoemprestimo,
        });
      }
    }

    // Transform to final results with credit opportunities
    const results = Array.from(clientMap.values()).map(client => {
      const activeContracts = client.contracts.filter((c: any) =>
        c.situacao_emprestimo?.toLowerCase()?.includes('ativ')
      );
      const refinanciableContracts = activeContracts.filter((c: any) => (c.prazo || 0) > 12);
      const totalParcelas = activeContracts.reduce((sum: number, c: any) => sum + (c.vl_parcela || 0), 0);

      return {
        ...client,
        total_contracts: client.contracts.length,
        credit_opportunities: {
          margem_disponivel: client.mr,
          margem_35: client.mr * 0.35,
          valor_rmc: client.valor_rmc,
          valor_rcc: client.valor_rcc,
          total_contratos_ativos: activeContracts.length,
          contratos_refinanciaveis: refinanciableContracts.length,
          total_parcelas: totalParcelas,
          has_portabilidade: activeContracts.some((c: any) => c.tipo_emprestimo?.toLowerCase()?.includes('port')),
        },
      };
    });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('External query error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
