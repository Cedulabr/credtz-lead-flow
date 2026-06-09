import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } }
);

Deno.serve(async (req) => {
  const body = await req.json();
  const { event, data } = body;

  console.log(`Recebido evento AbacatePay: ${event}`, data);

  // Idempotência
  const { error: dupErr } = await supabase
    .from("billing_events")
    .insert({ 
      abacatepay_event_id: data.id, 
      type: event, 
      payload: body 
    });

  if (dupErr && dupErr.code === "23505") {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    if (event === "billing.paid") {
      const billing = data;
      
      // Buscar o pagamento original para obter os metadados (company_id, module_slug, credits)
      const { data: payment, error: pErr } = await supabase
        .from("payments")
        .select("*")
        .eq("abacatepay_id", billing.id)
        .single();

      if (pErr || !payment) {
        console.error("Pagamento não encontrado para o ID:", billing.id);
      } else {
        const md = payment.metadata || {};
        const company_id = md.company_id;
        const module_slug = md.module_slug;
        const credits = parseInt(md.credits || "0", 10);

        if (company_id && module_slug && credits > 0) {
          // Atualizar o status do pagamento
          await supabase
            .from("payments")
            .update({ status: "paid" })
            .eq("abacatepay_id", billing.id);

          // Adicionar créditos
          await supabase.rpc("credit_wallet", {
            _company_id: company_id,
            _module_slug: module_slug,
            _amount: credits,
            _type: "purchase",
            _reference_id: billing.id,
            _metadata: { abacatepay_id: billing.id, amount_total: billing.amount },
          });
        }
      }
    }

    await supabase
      .from("billing_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("abacatepay_event_id", data.id);

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro no processamento do webhook AbacatePay:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
