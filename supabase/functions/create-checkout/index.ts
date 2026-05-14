// create-checkout — one-time payment. Now supports credit packages tied to a module.
// Body: { module_slug, package_id?, custom_credits?, custom_price_cents? }
//   OR legacy: { amount, currency?, description? }
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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    let amount: number;
    let credits = 0;
    let module_slug: string | null = body.module_slug ?? null;
    let description = body.description || "Pagamento Easyn";

    if (module_slug) {
      // Resolve company
      const { data: uc } = await service
        .from("user_companies").select("company_id")
        .eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle();
      if (!uc?.company_id) throw new Error("Usuário sem empresa vinculada");
      const company_id = uc.company_id;

      const { data: mod } = await service
        .from("modules").select("name, credit_price_cents").eq("slug", module_slug).single();

      if (body.package_id) {
        const { data: pkg } = await service
          .from("credit_packages").select("name, credits, price_cents")
          .eq("id", body.package_id).single();
        if (!pkg) throw new Error("Pacote inválido");
        amount = pkg.price_cents;
        credits = pkg.credits;
        description = `${mod?.name ?? module_slug} — ${pkg.name}`;
      } else if (body.custom_credits) {
        credits = parseInt(String(body.custom_credits), 10);
        if (!credits || credits < 1) throw new Error("custom_credits inválido");
        amount = credits * (mod?.credit_price_cents ?? 0);
        if (amount < 50) throw new Error("Valor mínimo R$0,50");
        description = `${mod?.name ?? module_slug} — ${credits} créditos`;
      } else {
        throw new Error("package_id ou custom_credits obrigatório");
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{
          price_data: {
            currency: "brl",
            product_data: { name: description },
            unit_amount: amount,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${origin}/marketplace?status=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/marketplace?status=canceled`,
        metadata: {
          company_id,
          module_slug,
          credits: String(credits),
          user_id: user.id,
        },
      });

      await service.from("payments").insert({
        user_id: user.id, email: user.email, stripe_session_id: session.id,
        stripe_customer_id: customerId, amount, currency: "brl",
        status: "pending", description,
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
      });
    }

    // Legacy path
    amount = body.amount;
    if (!amount || amount < 50) throw new Error("Amount inválido");
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{
        price_data: { currency: body.currency || "brl", product_data: { name: description }, unit_amount: amount },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/payment-canceled`,
    });
    await service.from("payments").insert({
      user_id: user.id, email: user.email, stripe_session_id: session.id,
      stripe_customer_id: customerId, amount, currency: body.currency || "brl",
      status: "pending", description,
    });
    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
