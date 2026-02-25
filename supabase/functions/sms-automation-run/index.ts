import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get automation settings
    const { data: settings } = await serviceClient
      .from("sms_automation_settings")
      .select("setting_key, setting_value");

    const config: Record<string, string> = {};
    (settings || []).forEach((s: any) => { config[s.setting_key] = s.setting_value; });

    const automacaoAtiva = config["automacao_em_andamento_ativa"] === "true";
    const intervaloHoras = parseInt(config["automacao_em_andamento_intervalo_horas"] || "24");
    const msgTemplate = config["msg_em_andamento"] || "Olá {{nome}}, sua proposta está em andamento.";
    const pagoAtiva = config["automacao_pago_ativa"] === "true";
    const msgPago = config["msg_pago_novo_emprestimo"] || "Olá {{nome}}, seu empréstimo foi pago com sucesso.";

    let totalSent = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    // === AUTOMATION: em_andamento proposals ===
    if (automacaoAtiva) {
      const { data: queue } = await serviceClient
        .from("sms_televendas_queue")
        .select("*")
        .eq("automacao_ativa", true)
        .eq("automacao_status", "ativo");

      const now = new Date();

      // === DEDUPLICAÇÃO POR TELEFONE ===
      // Agrupar itens por telefone normalizado para enviar apenas 1 SMS por cliente
      const phoneGroups = new Map<string, any[]>();

      for (const item of (queue || [])) {
        // Skip items that completed their cycle
        if (item.dias_enviados >= item.dias_envio_total) {
          await serviceClient.from("sms_televendas_queue")
            .update({ automacao_status: "finalizado", automacao_ativa: false })
            .eq("id", item.id);
          continue;
        }

        // Only send for em_andamento status proposals of Portabilidade
        if (!["em_andamento", "aguardando", "digitado", "solicitar_digitacao"].includes(item.status_proposta)) {
          totalSkipped++;
          continue;
        }

        if (!item.tipo_operacao?.toLowerCase().includes("portabilidade")) {
          totalSkipped++;
          continue;
        }

        // Normalizar telefone (remover não-dígitos)
        const normalizedPhone = (item.cliente_telefone || "").replace(/\D/g, "");
        if (!normalizedPhone) {
          totalSkipped++;
          continue;
        }

        // Check interval - use the most recent ultimo_envio_at across the group
        if (item.ultimo_envio_at) {
          const lastSent = new Date(item.ultimo_envio_at);
          const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
          if (hoursSince < intervaloHoras) {
            totalSkipped++;
            continue;
          }
        }

        if (!phoneGroups.has(normalizedPhone)) {
          phoneGroups.set(normalizedPhone, []);
        }
        phoneGroups.get(normalizedPhone)!.push(item);
      }

      // Para cada telefone único, enviar apenas 1 SMS
      for (const [phone, items] of phoneGroups) {
        const representative = items[0]; // Usar o primeiro item como representante

        // Build message
        let message = msgTemplate;
        message = message.replace(/\{\{nome\}\}/gi, representative.cliente_nome || "");
        message = message.replace(/\{\{tipo_operacao\}\}/gi, representative.tipo_operacao || "");

        // Send via Twilio - apenas 1 SMS por telefone
        const result = await sendViaTwilio(representative.cliente_telefone, message);

        // Record in history (1 registro para o envio)
        await serviceClient.from("sms_history").insert({
          phone: representative.cliente_telefone,
          contact_name: representative.cliente_nome,
          message,
          status: result.ok ? "sent" : "failed",
          provider_message_id: result.sid || null,
          error_message: result.error || null,
          sent_at: result.ok ? now.toISOString() : null,
          sent_by: representative.user_id,
          televendas_id: representative.televendas_id,
          send_type: "automatico",
        });

        // Update ALL queue items for this phone
        for (const item of items) {
          const newDias = item.dias_enviados + 1;
          const updates: Record<string, any> = {
            dias_enviados: newDias,
            ultimo_envio_at: now.toISOString(),
          };
          if (newDias >= item.dias_envio_total) {
            updates.automacao_status = "finalizado";
            updates.automacao_ativa = false;
          }
          await serviceClient.from("sms_televendas_queue").update(updates).eq("id", item.id);
        }

        if (result.ok) totalSent++;
        else totalFailed++;
      }
    }

    // === AUTOMATION: proposta_paga notifications ===
    if (pagoAtiva) {
      const { data: pagoQueue } = await serviceClient
        .from("sms_televendas_queue")
        .select("*")
        .eq("status_proposta", "proposta_paga")
        .eq("automacao_status", "ativo");

      // Deduplicar por telefone também para pago
      const pagoPhoneGroups = new Map<string, any>();

      for (const item of (pagoQueue || [])) {
        if (!item.tipo_operacao?.toLowerCase().includes("novo")) continue;

        const normalizedPhone = (item.cliente_telefone || "").replace(/\D/g, "");
        if (!normalizedPhone || pagoPhoneGroups.has(normalizedPhone)) {
          // Marcar duplicado como finalizado sem enviar
          await serviceClient.from("sms_televendas_queue")
            .update({ automacao_status: "finalizado", automacao_ativa: false })
            .eq("id", item.id);
          continue;
        }

        pagoPhoneGroups.set(normalizedPhone, item);

        let message = msgPago;
        message = message.replace(/\{\{nome\}\}/gi, item.cliente_nome || "");

        const result = await sendViaTwilio(item.cliente_telefone, message);

        await serviceClient.from("sms_history").insert({
          phone: item.cliente_telefone,
          contact_name: item.cliente_nome,
          message,
          status: result.ok ? "sent" : "failed",
          provider_message_id: result.sid || null,
          error_message: result.error || null,
          sent_at: result.ok ? new Date().toISOString() : null,
          sent_by: item.user_id,
          televendas_id: item.televendas_id,
          send_type: "automatico",
        });

        await serviceClient.from("sms_televendas_queue")
          .update({ automacao_status: "finalizado", automacao_ativa: false })
          .eq("id", item.id);

        if (result.ok) totalSent++;
        else totalFailed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, failed: totalFailed, skipped: totalSkipped }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sms-automation-run error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function sendViaTwilio(phone: string, message: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")!;
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const basicAuth = btoa(`${accountSid}:${authToken}`);

  let formatted = phone.replace(/\D/g, "");
  if (formatted.length <= 11) formatted = `+55${formatted}`;
  else if (!formatted.startsWith("+")) formatted = `+${formatted}`;

  const params = new URLSearchParams({
    To: formatted,
    MessagingServiceSid: messagingServiceSid,
    Body: message,
  });

  try {
    const res = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data = await res.json();
    if (res.ok) return { ok: true, sid: data.sid };
    return { ok: false, error: data.message || "Twilio error" };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
