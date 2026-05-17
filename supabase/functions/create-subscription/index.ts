// create-subscription — recurring subscription tied to a module.
// Body: { module_slug } — preço lido do catálogo modules.
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user?.email) throw new Error("User not authenticated");
    const user = userData.user;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const module_slug = body.module_slug;
    if (!module_slug) throw new Error("module_slug é obrigatório");

    const { data: uc } = await service
      .from("user_companies").select("company_id")
      .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
    if (!uc?.company_id) throw new Error("Usuário sem empresa vinculada");
    const company_id = uc.company_id;

    const { data: mod } = await service
      .from("modules")
      .select("id, name, monthly_price_cents, billing_type, stripe_price_id, trial_days, active")
      .eq("slug", module_slug).single();
    if (!mod || !mod.active) throw new Error("Módulo não disponível");
    if (mod.billing_type === "credits") throw new Error("Módulo cobrado por créditos");
    if (!mod.monthly_price_cents) throw new Error("Preço mensal não configurado");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    const lineItem = mod.stripe_price_id
      ? { price: mod.stripe_price_id, quantity: 1 }
      : {
          price_data: {
            currency: "brl",
            product_data: { name: `Easyn — ${mod.name}` },
            unit_amount: mod.monthly_price_cents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        };

    const origin = req.headers.get("origin") || "http://localhost:5173";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [lineItem as any],
      mode: "subscription",
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}&module=${module_slug}`,
      cancel_url: `${origin}/billing/cancel?module=${module_slug}`,
      subscription_data: {
        trial_period_days: mod.trial_days || undefined,
        metadata: { company_id, module_slug, user_id: user.id },
      },
      metadata: { company_id, module_slug, user_id: user.id },
    });

    // Pre-register pending row
    await service.from("company_modules").upsert({
      company_id,
      module_id: mod.id,
      module_slug,
      status: "inactive",
    }, { onConflict: "company_id,module_id" });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
