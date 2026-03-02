import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BRDID_BASE = "https://brdid.com.br/br-did/api/public";

const ACTION_MAP: Record<string, { endpoint: string; method: "GET" | "POST" }> = {
  buscar_localidades:        { endpoint: "buscar_localidades",           method: "GET" },
  buscar_numeros:            { endpoint: "buscar_numeros_by_area_local", method: "GET" },
  consultar_did:             { endpoint: "consultar_did",                method: "GET" },
  adquirir_did:              { endpoint: "adquirir_novo_did",            method: "POST" },
  cancelar_did:              { endpoint: "cancelar_did",                 method: "POST" },
  configurar_sip:            { endpoint: "configurar_siga_me",           method: "POST" },
  desconfigurar_sip:         { endpoint: "desconfigurar_siga_me",        method: "POST" },
  whatsapp_configurar:       { endpoint: "whatsapp_configurar",          method: "POST" },
  get_cdrs:                  { endpoint: "get_dids_cdrs",                method: "GET" },
  criar_plano:               { endpoint: "criar_plano",                  method: "POST" },
  criar_cliente:             { endpoint: "criar_cliente",                method: "POST" },
  montar_cliente_plano_dids: { endpoint: "montar_cliente_plano_dids",    method: "POST" },
  listar_clientes:           { endpoint: "listar_clientes",              method: "GET" },
  listar_planos:             { endpoint: "listar_planos",                method: "GET" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, params = {} } = await req.json();

    const mapping = ACTION_MAP[action];
    if (!mapping) {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const BRDID_TOKEN = Deno.env.get("BRDID_API_TOKEN");
    if (!BRDID_TOKEN) {
      return new Response(JSON.stringify({ error: "BR DID token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build URL - ALL params go as query string (BR DID API requirement)
    const url = new URL(`${BRDID_BASE}/${mapping.endpoint}`);
    url.searchParams.set("TOKEN", BRDID_TOKEN);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }

    console.log(`BR DID API call: ${action} -> ${mapping.method} ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: mapping.method,
    });
    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { raw: responseText };
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("BR DID API error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
