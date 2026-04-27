// Cron worker: refreshes Nova Vida TI tokens daily for all active credentials.
// Invoked by pg_cron via pg_net once per day.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NV_TOKEN_URL = "https://wsnv.novavidati.com.br/WSLocalizador.asmx";

function b64(s: string) {
  return btoa(unescape(encodeURIComponent(s)));
}

async function refreshOne(
  admin: ReturnType<typeof createClient>,
  cred: { company_id: string; usuario: string; senha: string; cliente: string },
): Promise<{ ok: boolean; error?: string }> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GerarToken xmlns="http://tempuri.org/">
      <usuario>${b64(cred.usuario)}</usuario>
      <senha>${b64(cred.senha)}</senha>
      <cliente>${b64(cred.cliente)}</cliente>
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
  if (!resp.ok) return { ok: false, error: `http_${resp.status}` };
  const m = text.match(/<GerarTokenResult>([\s\S]*?)<\/GerarTokenResult>/);
  if (!m) return { ok: false, error: "parse_failed" };
  const token = m[1].trim();
  if (!token || /INCORRETO/i.test(token) || /SEM ACESSO/i.test(token)) {
    return { ok: false, error: "auth_error" };
  }
  const expires_at = new Date(Date.now() + (23 * 60 + 50) * 60 * 1000).toISOString();
  const { error } = await admin.from("novavida_token_cache").upsert(
    {
      company_id: cred.company_id,
      token,
      generated_at: new Date().toISOString(),
      expires_at,
    },
    { onConflict: "company_id" },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: creds, error } = await admin
    .from("novavida_credentials")
    .select("company_id, usuario, senha, cliente")
    .eq("active", true);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ company_id: string; ok: boolean; error?: string }> = [];
  for (const c of creds || []) {
    try {
      const r = await refreshOne(admin, c as any);
      results.push({ company_id: (c as any).company_id, ...r });
    } catch (e: any) {
      results.push({ company_id: (c as any).company_id, ok: false, error: String(e?.message ?? e) });
    }
  }

  // log to system_activity_logs (best-effort)
  try {
    await admin.from("system_activity_logs").insert({
      action: "novavida_token_refresh",
      details: { results, ran_at: new Date().toISOString() } as any,
    } as any);
  } catch {
    /* ignore */
  }

  return new Response(JSON.stringify({ refreshed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
