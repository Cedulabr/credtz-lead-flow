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
    let clientsQuery = '';
    let queryParams: (string | number)[] = [];

    // Determine search type
    if (cleanDigits.length === 11) {
      // CPF search
      matchType = 'cpf';
      clientsQuery = `
        SELECT c.*, COUNT(*) OVER() as total_count
        FROM baseoff_clients c
        WHERE normalize_cpf(c.cpf) = LPAD($1, 11, '0')
        ORDER BY c.nome
        LIMIT $2 OFFSET $3
      `;
      queryParams = [cleanDigits, search_limit, search_offset];
    } else if (cleanDigits.length >= 8 && cleanDigits.length <= 10 && term === cleanDigits) {
      // NB search
      matchType = 'nb';
      clientsQuery = `
        SELECT c.*, COUNT(*) OVER() as total_count
        FROM baseoff_clients c
        WHERE c.nb LIKE '%' || $1 || '%'
        ORDER BY c.nome
        LIMIT $2 OFFSET $3
      `;
      queryParams = [cleanDigits, search_limit, search_offset];
    } else if (cleanDigits.length >= 10 && cleanDigits.length <= 11) {
      // Phone search
      matchType = 'telefone';
      clientsQuery = `
        SELECT c.*, COUNT(*) OVER() as total_count
        FROM baseoff_clients c
        WHERE c.tel_cel_1 LIKE '%' || $1 || '%'
           OR c.tel_cel_2 LIKE '%' || $1 || '%'
           OR c.tel_fixo_1 LIKE '%' || $1 || '%'
        ORDER BY c.nome
        LIMIT $2 OFFSET $3
      `;
      queryParams = [cleanDigits, search_limit, search_offset];
    } else {
      // Name search
      matchType = 'nome';
      clientsQuery = `
        SELECT c.*, COUNT(*) OVER() as total_count
        FROM baseoff_clients c
        WHERE UPPER(c.nome) LIKE '%' || UPPER($1) || '%'
        ORDER BY c.nome
        LIMIT $2 OFFSET $3
      `;
      queryParams = [term, search_limit, search_offset];
    }

    const clientsResult = await connection.queryObject(clientsQuery, queryParams);
    const clients = clientsResult.rows as any[];
    const totalCount = clients.length > 0 ? parseInt(clients[0].total_count) : 0;

    // Fetch contracts for found clients
    const clientIds = clients.map(c => c.id);
    let contracts: any[] = [];

    if (clientIds.length > 0) {
      const placeholders = clientIds.map((_, i) => `$${i + 1}`).join(',');
      const contractsResult = await connection.queryObject(
        `SELECT * FROM baseoff_contracts WHERE client_id IN (${placeholders}) ORDER BY data_averbacao DESC`,
        clientIds
      );
      contracts = contractsResult.rows as any[];
    }

    connection.release();
    await pool.end();

    // Group contracts by client_id
    const contractsByClient: Record<string, any[]> = {};
    contracts.forEach(c => {
      if (!contractsByClient[c.client_id]) contractsByClient[c.client_id] = [];
      contractsByClient[c.client_id].push(c);
    });

    // Transform results
    const results = clients.map(client => ({
      ...client,
      total_count: totalCount,
      match_type: matchType,
      contracts: contractsByClient[client.id] || [],
      total_contracts: (contractsByClient[client.id] || []).length,
      // Credit opportunities
      credit_opportunities: calculateCreditOpportunities(client, contractsByClient[client.id] || []),
    }));

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

function calculateCreditOpportunities(client: any, contracts: any[]) {
  const mr = parseFloat(client.mr) || 0;
  const margem35 = mr * 0.35;
  const valorRmc = parseFloat(client.valor_rmc) || 0;
  const valorRcc = parseFloat(client.valor_rcc) || 0;

  const activeContracts = contracts.filter(c =>
    c.situacao_emprestimo?.toLowerCase()?.includes('ativ')
  );

  const refinanciableContracts = activeContracts.filter(c => {
    const prazo = parseInt(c.prazo) || 0;
    const parcelas = parseInt(c.competencia_final) || prazo;
    return parcelas > 12;
  });

  const totalSaldoDevedor = activeContracts.reduce((sum, c) => sum + (parseFloat(c.saldo) || 0), 0);
  const totalParcelas = activeContracts.reduce((sum, c) => sum + (parseFloat(c.vl_parcela) || 0), 0);

  return {
    margem_disponivel: mr,
    margem_35: margem35,
    valor_rmc: valorRmc,
    valor_rcc: valorRcc,
    total_contratos_ativos: activeContracts.length,
    contratos_refinanciaveis: refinanciableContracts.length,
    saldo_devedor_total: totalSaldoDevedor,
    total_parcelas: totalParcelas,
    has_portabilidade: activeContracts.some(c => c.tipo_emprestimo?.toLowerCase()?.includes('port')),
  };
}
