import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    const JOINBANK_LOGIN_ID = Deno.env.get('JOINBANK_LOGIN_ID');
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

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
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
      ALLOWED_ROUTES[upperMethod]?.includes(route) ||
      (upperMethod === 'GET' && /^\/(loan-inss-simulations|loans|query-inss-balances)\/[a-f0-9-]+$/.test(route)) ||
      (upperMethod === 'PUT' && /^\/loan-inss-simulations\/[a-f0-9-]+$/.test(route)) ||
      (upperMethod === 'POST' && /^\/loan-inss-simulations\/[a-f0-9-]+\/(actions|copy|auth-term)$/.test(route)) ||
      (upperMethod === 'POST' && /^\/signer\/[a-zA-Z0-9-]+\/accept$/.test(route)) ||
      (upperMethod === 'GET' && /^\/loans\/contract-number\/.+$/.test(route));

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Route not allowed: ' + route }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine auth headers based on route
    // Rules endpoint uses Bearer token, others use apikey header
    const isRulesEndpoint = route.includes('/loan-product-rules/');
    const apiHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (isRulesEndpoint && JOINBANK_LOGIN_ID) {
      apiHeaders['Authorization'] = `Bearer ${JOINBANK_LOGIN_ID}`;
    } else {
      apiHeaders['apikey'] = JOINBANK_API_KEY;
    }

    // Build the request to JoinBank API
    const targetUrl = `${JOINBANK_BASE_URL}${route}`;
    const fetchOptions: RequestInit = {
      method: upperMethod,
      headers: apiHeaders,
    };

    if (upperMethod !== 'GET' && payload) {
      fetchOptions.body = JSON.stringify(payload);
    }

    console.log(`JoinBank proxy: ${upperMethod} ${route} [auth: ${isRulesEndpoint ? 'Bearer' : 'apikey'}]`);

    const apiResponse = await fetch(targetUrl, fetchOptions);
    const responseData = await apiResponse.text();

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseData);
    } catch {
      parsedResponse = responseData;
    }

    if (!apiResponse.ok) {
      console.error(`JoinBank API error [${apiResponse.status}]: ${responseData.substring(0, 500)}`);
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
