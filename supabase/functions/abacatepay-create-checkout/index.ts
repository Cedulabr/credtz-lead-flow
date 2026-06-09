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

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user?.email) throw new Error("User not authenticated");

    const body = await req.json();
    const { module_slug, package_id, custom_credits, custom_price_cents } = body;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    let amount = 0;
    let credits = 0;
    let description = "Pagamento Easyn (PIX)";

    if (module_slug) {
      const { data: uc } = await service
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (!uc?.company_id) throw new Error("Usuário sem empresa vinculada");
      const company_id = uc.company_id;

      const { data: mod } = await service
        .from("modules")
        .select("name, credit_price_cents")
        .eq("slug", module_slug)
        .single();

      if (package_id) {
        const { data: pkg } = await service
          .from("credit_packages")
          .select("name, credits, price_cents")
          .eq("id", package_id)
          .single();
        if (!pkg) throw new Error("Pacote inválido");
        amount = pkg.price_cents;
        credits = pkg.credits;
        description = `${mod?.name ?? module_slug} — ${pkg.name}`;
      } else if (custom_credits) {
        credits = parseInt(String(custom_credits), 10);
        amount = credits * (mod?.credit_price_cents ?? 0);
        description = `${mod?.name ?? module_slug} — ${credits} créditos`;
      } else {
        throw new Error("package_id ou custom_credits obrigatório");
      }

      const API_KEY = Deno.env.get("ABACATEPAY_API_KEY");
      const origin = req.headers.get("origin") || "http://localhost:5173";

      const response = await fetch("https://api.abacatepay.com/v1/billing/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          frequency: "ONE_TIME",
          methods: ["PIX"],
          products: [
            {
              externalId: `${module_slug}-${Date.now()}`,
              name: description,
              quantity: 1,
              priceUnit: amount, // Em centavos se a API seguir o padrão Stripe, verificar docs.
            },
          ],
          returnUrl: `${origin}/marketplace?status=success`,
          completionUrl: `${origin}/marketplace?status=success`,
          customerId: user.id, // Opcional se já cadastrado no AbacatePay
          customer: {
            name: user.user_metadata?.full_name || user.email.split('@')[0],
            email: user.email,
            taxId: user.user_metadata?.cpf || "", // Se tiver CPF no metadata
          }
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Erro ao criar cobrança no AbacatePay");
      }

      const billing = data.data;

      // Registrar o pagamento pendente
      await service.from("payments").insert({
        user_id: user.id,
        email: user.email,
        abacatepay_id: billing.id,
        amount,
        currency: "brl",
        status: "pending",
        description,
        metadata: {
          company_id,
          module_slug,
          credits: String(credits),
          user_id: user.id,
        },
      });

      return new Response(JSON.stringify({ url: billing.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("module_slug é obrigatório");
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
