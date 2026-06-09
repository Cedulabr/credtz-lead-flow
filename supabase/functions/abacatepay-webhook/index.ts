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

  // Registro técnico para auditoria
  await supabase
    .from("abacatepay_webhook_logs")
    .insert({ 
      event_id: data.id, 
      event_type: event, 
      payload: body 
    });

  try {
    // Processar pagamento confirmado
    if (event === "billing.paid") {
      const billing = data;
      
      // 1. Atualizar o lead
      const { data: lead, error: leadErr } = await supabase
        .from("leads")
        .update({ 
          payment_status: "paid",
          pix_paid_at: new Date().toISOString()
        })
        .eq("abacatepay_id", billing.id)
        .select("id, assigned_to")
        .single();

      if (leadErr) {
        console.error("Erro ao atualizar lead:", leadErr);
      } else if (lead && lead.assigned_to) {
        // 2. Liberar comissão se houver parceiro vinculado
        // Buscar se já existe registro de comissão pendente
        const { data: commission } = await supabase
          .from("affiliate_commissions")
          .select("id")
          .eq("lead_id", lead.id)
          .eq("status", "pending")
          .single();

        if (commission) {
          await supabase
            .from("affiliate_commissions")
            .update({ 
              status: "released",
              released_at: new Date().toISOString()
            })
            .eq("id", commission.id);
        }
      }
      
      // 3. (Legado) Suporte a créditos se for uma compra de módulo/créditos
      const { data: payment } = await supabase
        .from("payments")
        .select("*")
        .eq("abacatepay_id", billing.id)
        .single();

      if (payment) {
        const md = payment.metadata || {};
        const company_id = md.company_id;
        const module_slug = md.module_slug;
        const credits = parseInt(md.credits || "0", 10);

        if (company_id && module_slug && credits > 0) {
          await supabase
            .from("payments")
            .update({ status: "paid" })
            .eq("abacatepay_id", billing.id);

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

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro no processamento do webhook AbacatePay:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});