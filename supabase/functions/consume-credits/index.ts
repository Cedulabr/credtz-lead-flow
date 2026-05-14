// consume-credits — debits company wallet atomically.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { module_slug, amount = 1, reference_id, metadata = {} } = await req.json();
    if (!module_slug) return new Response(JSON.stringify({ error: "module_slug required" }), { status: 400, headers: corsHeaders });

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // Resolve company
    const { data: uc } = await service
      .from("user_companies")
      .select("company_id")
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!uc?.company_id) {
      return new Response(JSON.stringify({ error: "no company" }), { status: 400, headers: corsHeaders });
    }

    const { data: wallet } = await service
      .from("wallets")
      .select("id, balance")
      .eq("company_id", uc.company_id)
      .eq("module_slug", module_slug)
      .maybeSingle();
    if (!wallet) {
      return new Response(JSON.stringify({ success: false, error: "insufficient_balance", balance: 0 }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: result, error } = await service.rpc("consume_wallet", {
      _wallet_id: wallet.id,
      _amount: amount,
      _reference_id: reference_id ?? null,
      _metadata: metadata,
    });
    if (error) throw error;

    const status = (result as any)?.success ? 200 : 402;
    return new Response(JSON.stringify(result), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
