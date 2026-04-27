import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NV_TOKEN_URL = "https://wsnv.novavidati.com.br/WSLocalizador.asmx";

function b64(s: string) {
  return btoa(unescape(encodeURIComponent(s)));
}

async function getValidToken(
  admin: ReturnType<typeof createClient>,
  companyId: string,
  opts: { forceRefresh?: boolean } = {},
): Promise<{ token?: string; error?: string }> {
  // 1. cache lookup (skipped when forceRefresh)
  if (!opts.forceRefresh) {
    const { data: cached } = await admin
      .from("novavida_token_cache")
      .select("token, expires_at")
      .eq("company_id", companyId)
      .maybeSingle();

    if (cached && new Date(cached.expires_at as string) > new Date()) {
      return { token: cached.token as string };
    }
  }

  // 2. credentials
  const { data: creds } = await admin
    .from("novavida_credentials")
    .select("usuario, senha, cliente, active")
    .eq("company_id", companyId)
    .eq("active", true)
    .maybeSingle();

  if (!creds) return { error: "credentials_not_configured" };

  // 3. SOAP request
  const usuario = b64(creds.usuario as string);
  const senha = b64(creds.senha as string);
  const cliente = b64(creds.cliente as string);

  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GerarToken xmlns="http://tempuri.org/">
      <usuario>${usuario}</usuario>
      <senha>${senha}</senha>
      <cliente>${cliente}</cliente>
    </GerarToken>
  </soap:Body>
</soap:Envelope>`;

  const resp = await fetch(NV_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: '"http://tempuri.org/GerarToken"',
    },
    body: envelope,
  });

  const text = await resp.text();
  if (!resp.ok) return { error: `nv_http_${resp.status}: ${text.slice(0, 200)}` };

  const match = text.match(/<GerarTokenResult>([\s\S]*?)<\/GerarTokenResult>/);
  if (!match) return { error: "token_parse_failed" };
  const token = match[1].trim();

  if (
    !token ||
    /USUARIO, SENHA OU CLIENTE INCORRETO/i.test(token) ||
    /SEM ACESSO AO SISTEMA/i.test(token)
  ) {
    return { error: "auth_error" };
  }

  // 4. cache upsert
  const expires_at = new Date(Date.now() + (23 * 60 + 50) * 60 * 1000).toISOString();
  await admin
    .from("novavida_token_cache")
    .upsert(
      { company_id: companyId, token, generated_at: new Date().toISOString(), expires_at },
      { onConflict: "company_id" },
    );

  return { token };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claimsData?.claims) return json({ error: "unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    let body: {
      company_id?: string;
      force_refresh?: boolean;
      manual_token?: string;
    } = {};
    try {
      body = await req.json();
    } catch {
      // empty body ok
    }

    let companyId = body.company_id;
    if (!companyId) {
      const { data: uc } = await admin
        .from("user_companies")
        .select("company_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      companyId = uc?.company_id as string | undefined;
    }
    if (!companyId) return json({ error: "no_company" }, 400);

    // Manual token override: persist the user-supplied token for 24h
    if (body.manual_token && typeof body.manual_token === "string") {
      const token = body.manual_token.trim();
      if (token.length < 20) return json({ error: "invalid_manual_token" }, 400);
      const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const { error: upErr } = await admin
        .from("novavida_token_cache")
        .upsert(
          {
            company_id: companyId,
            token,
            generated_at: new Date().toISOString(),
            expires_at,
          },
          { onConflict: "company_id" },
        );
      if (upErr) return json({ error: upErr.message }, 500);
      return json({ token, manual: true, expires_at });
    }

    const result = await getValidToken(admin, companyId, {
      forceRefresh: body.force_refresh === true,
    });
    if (result.error) return json({ error: result.error }, 400);
    return json({ token: result.token });
  } catch (e) {
    console.error("novavida-get-token error", e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
