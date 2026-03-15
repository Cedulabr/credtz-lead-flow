import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const JOINBANK_BASE_URL = 'https://api.ajin.io/v3';

// Allowed routes whitelist
const ALLOWED_ROUTES: Record<string, string[]> = {
  'POST': [
    '/loan-products/search/basic',
    '/loan-product-rules/search/basic',
    '/loan-inss-simulations',
    '/loan-inss-simulations/calculation',
    '/loan-inss-simulations/refinanceable-contracts',
    '/query-inss-balances/finder',
    '/query-inss-balances/finder/await',
    '/loans/search',
  ],
  'GET': [],
  'PUT': [],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const JOINBANK_API_KEY = Deno.env.get('JOINBANK_API_KEY');
    if (!JOINBANK_API_KEY) {
      throw new Error('JOINBANK_API_KEY not configured');
    }

    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', '')
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse the request body
    const body = await req.json();
    const { route, method = 'POST', payload } = body;

    if (!route) {
      return new Response(JSON.stringify({ error: 'Route is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if route matches allowed patterns (support dynamic IDs)
    const upperMethod = method.toUpperCase();
    const isAllowed =
      // Static routes
      ALLOWED_ROUTES[upperMethod]?.includes(route) ||
      // Dynamic GET routes: /loan-inss-simulations/:id, /loans/:id, /query-inss-balances/:id
      (upperMethod === 'GET' && /^\/(loan-inss-simulations|loans|query-inss-balances)\/[a-f0-9-]+$/.test(route)) ||
      // Dynamic PUT routes: /loan-inss-simulations/:id
      (upperMethod === 'PUT' && /^\/loan-inss-simulations\/[a-f0-9-]+$/.test(route)) ||
      // Dynamic POST routes: /loan-inss-simulations/:id/actions, /loan-inss-simulations/:id/copy
      (upperMethod === 'POST' && /^\/loan-inss-simulations\/[a-f0-9-]+\/(actions|copy|auth-term)$/.test(route)) ||
      // Signer routes
      (upperMethod === 'POST' && /^\/signer\/[a-zA-Z0-9-]+\/accept$/.test(route)) ||
      // Loans by contract number
      (upperMethod === 'GET' && /^\/loans\/contract-number\/.+$/.test(route));

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Route not allowed: ' + route }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build the request to JoinBank API
    const targetUrl = `${JOINBANK_BASE_URL}${route}`;
    const fetchOptions: RequestInit = {
      method: upperMethod,
      headers: {
        'apikey': JOINBANK_API_KEY,
        'Content-Type': 'application/json',
      },
    };

    if (upperMethod !== 'GET' && payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    console.log(`JoinBank proxy: ${upperMethod} ${route}`);

    const apiResponse = await fetch(targetUrl, fetchOptions);
    const responseData = await apiResponse.text();

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseData);
    } catch {
      parsedResponse = responseData;
    }

    if (!apiResponse.ok) {
      console.error(`JoinBank API error [${apiResponse.status}]: ${responseData}`);
      return new Response(JSON.stringify({
        error: 'JoinBank API error',
        status: apiResponse.status,
        details: parsedResponse,
      }), {
        status: apiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(parsedResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('JoinBank proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
