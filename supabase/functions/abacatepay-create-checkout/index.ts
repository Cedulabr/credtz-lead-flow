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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const API_KEY = Deno.env.get("ABACATEPAY_API_KEY");

    if (!API_KEY) {
      console.error("ABACATEPAY_API_KEY is not set");
      throw new Error("Configuração do AbacatePay pendente.");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user?.email) {
      console.error("Auth error:", userErr);
      throw new Error("Usuário não autenticado");
    }

    const body = await req.json();
    console.log("Request Body:", JSON.stringify(body));

    const { module_slug, package_id, custom_credits, customer } = body;

    const service = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    let amount = 0;
    let credits = 0;
    let description = "Assinatura Easyn (PIX)";
    let isSubscription = false;

    if (module_slug) {
      const { data: uc } = await service
        .from("user_companies")
        .select("company_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      const company_id = uc?.company_id || null;

      const { data: mod, error: modError } = await service
        .from("modules")
        .select("name, credit_price_cents, monthly_price_cents, billing_type")
        .eq("slug", module_slug)
        .single();

      if (modError || !mod) {
        console.error("Module error:", modError);
        throw new Error("Módulo não encontrado");
      }

      if (package_id) {
        const { data: pkg } = await service
          .from("credit_packages")
          .select("name, credits, price_cents")
          .eq("id", package_id)
          .single();
        if (!pkg) throw new Error("Pacote inválido");
        amount = pkg.price_cents;
        credits = pkg.credits;
        description = `${mod.name} — ${pkg.name}`;
      } else if (custom_credits) {
        credits = parseInt(String(custom_credits), 10);
        amount = credits * (mod.credit_price_cents ?? 0);
        description = `${mod.name} — ${credits} créditos`;
      } else if (mod.billing_type === "subscription") {
        amount = mod.monthly_price_cents;
        description = `Assinatura Módulo: ${mod.name}`;
        isSubscription = true;
      } else {
        throw new Error("Parâmetros de cobrança inválidos");
      }

      const origin = req.headers.get("origin") || "https://easyn.lovable.app";
      const externalProductId = "prod_Y0mn4nhzgjzAwuyHjPEMkD3W";

      const checkoutBody = {
        frequency: isSubscription ? "RECURRING" : "ONE_TIME",
        methods: ["PIX"],
        products: [
          {
            externalId: externalProductId,
            name: description,
            quantity: 1,
            priceUnit: amount,
          },
        ],
        returnUrl: `${origin}/marketplace?status=success`,
        completionUrl: `${origin}/marketplace?status=success`,
        customerId: user.id,
        customer: {
          name: customer?.name || user.user_metadata?.full_name || "Cliente",
          email: customer?.email || user.email,
          taxId: customer?.taxId || "",
          phone: customer?.phone || "",
        }
      };

      console.log("Calling AbacatePay with:", JSON.stringify(checkoutBody));

      const response = await fetch("https://api.abacatepay.com/v1/billing/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(checkoutBody),
      });

      const responseText = await response.text();
      console.log("AbacatePay Response:", responseText);

      if (!response.ok) {
        throw new Error(`Erro na API AbacatePay: ${responseText}`);
      }

      const responseData = JSON.parse(responseText);
      const billing = responseData.data;

      // Log the payment
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
          is_subscription: isSubscription,
        },
      });

      return new Response(JSON.stringify({ url: billing.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("module_slug é obrigatório");
  } catch (err) {
    console.error("Edge Function Error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
