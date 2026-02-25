import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SmsResult {
  ok: boolean;
  sid?: string;
  messageId?: string;
  error?: string;
  provider: string;
}

function detectCreditError(error: string): boolean {
  const creditKeywords = [
    "insufficient", "balance", "credit", "saldo", "crédito", "credito",
    "funds", "quota", "limit exceeded", "account balance",
  ];
  const lower = error.toLowerCase();
  return creditKeywords.some((k) => lower.includes(k));
}

function formatErrorMessage(result: SmsResult): string | null {
  if (!result.error) return null;
  if (detectCreditError(result.error)) {
    return `CREDITO_INSUFICIENTE: ${result.error}`;
  }
  return result.error;
}

async function getActiveProvider(serviceClient: any): Promise<string> {
  const { data } = await serviceClient
    .from("sms_providers")
    .select("name")
    .eq("is_active", true)
    .limit(1)
    .single();
  return data?.name || "twilio";
}

async function sendViaTwilio(phone: string, message: string): Promise<SmsResult> {
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
    if (res.ok) return { ok: true, sid: data.sid, provider: "twilio" };
    return { ok: false, error: data.message || "Twilio error", provider: "twilio" };
  } catch (e) {
    return { ok: false, error: String(e), provider: "twilio" };
  }
}

async function sendViaYupChat(phone: string, message: string): Promise<SmsResult> {
  const yupId = Deno.env.get("YUP_CHAT_ID");
  const yupToken = Deno.env.get("YUP_CHAT_TOKEN");

  if (!yupId || !yupToken) {
    return { ok: false, error: "YUP_CHAT_ID ou YUP_CHAT_TOKEN não configurados", provider: "yup_chat" };
  }

  let formatted = phone.replace(/\D/g, "");
  if (formatted.length <= 11) formatted = `55${formatted}`;

  const basicAuth = btoa(`${yupId}:${yupToken}`);

  try {
    const res = await fetch("https://api.yup.chat/v1/sms/messages", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [{ to: formatted, body: message }],
        default: { normalize: true },
      }),
    });

    const data = await res.json();
    if (res.ok && Array.isArray(data) && data.length > 0) {
      const first = data[0];
      if (first.status === "accepted" || first.status === "sent") {
        return { ok: true, messageId: first.id, provider: "yup_chat" };
      }
      return { ok: false, error: first.error_message || `Status: ${first.status}`, provider: "yup_chat" };
    }
    return { ok: false, error: data.error || "Yup Chat error", provider: "yup_chat" };
  } catch (e) {
    return { ok: false, error: String(e), provider: "yup_chat" };
  }
}

async function sendSms(phone: string, message: string, provider: string): Promise<SmsResult> {
  if (provider === "yup_chat") return sendViaYupChat(phone, message);
  return sendViaTwilio(phone, message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get active provider
    const activeProvider = await getActiveProvider(serviceClient);

    // Get automation settings
    const { data: settings } = await serviceClient
      .from("sms_automation_settings")
      .select("setting_key, setting_value");

    const config: Record<string, string> = {};
    (settings || []).forEach((s: any) => { config[s.setting_key] = s.setting_value; });

    // === TIME CHECK (Brasilia UTC-3) ===
    const horaInicio = parseInt(config["automacao_horario_inicio"] || "8");
    const horaFim = parseInt(config["automacao_horario_fim"] || "20");
    const nowUtc = new Date();
    const brasiliaHour = (nowUtc.getUTCHours() - 3 + 24) % 24;

    if (brasiliaHour < horaInicio || brasiliaHour >= horaFim) {
      return new Response(
        JSON.stringify({ 
          success: true, sent: 0, failed: 0, skipped: 0, 
          provider: activeProvider, 
          message: `Fora do horário de envio (${horaInicio}h-${horaFim}h Brasília). Hora atual: ${brasiliaHour}h` 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
      const phoneGroups = new Map<string, any[]>();

      for (const item of (queue || [])) {
        if (item.dias_enviados >= item.dias_envio_total) {
          await serviceClient.from("sms_televendas_queue")
            .update({ automacao_status: "finalizado", automacao_ativa: false })
            .eq("id", item.id);
          continue;
        }

        if (!["em_andamento", "aguardando", "digitado", "solicitar_digitacao"].includes(item.status_proposta)) {
          totalSkipped++;
          continue;
        }

        if (!item.tipo_operacao?.toLowerCase().includes("portabilidade")) {
          totalSkipped++;
          continue;
        }

        const normalizedPhone = (item.cliente_telefone || "").replace(/\D/g, "");
        if (!normalizedPhone) { totalSkipped++; continue; }

        if (item.ultimo_envio_at) {
          const lastSent = new Date(item.ultimo_envio_at);
          const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
          if (hoursSince < intervaloHoras) { totalSkipped++; continue; }
        }

        if (!phoneGroups.has(normalizedPhone)) phoneGroups.set(normalizedPhone, []);
        phoneGroups.get(normalizedPhone)!.push(item);
      }

      for (const [_phone, items] of phoneGroups) {
        const representative = items[0];

        let message = msgTemplate;
        message = message.replace(/\{\{nome\}\}/gi, representative.cliente_nome || "");
        message = message.replace(/\{\{tipo_operacao\}\}/gi, representative.tipo_operacao || "");

        const result = await sendSms(representative.cliente_telefone, message, activeProvider);

        await serviceClient.from("sms_history").insert({
          phone: representative.cliente_telefone,
          contact_name: representative.cliente_nome,
          message,
          status: result.ok ? "sent" : "failed",
          provider_message_id: result.sid || result.messageId || null,
          error_message: formatErrorMessage(result),
          sent_at: result.ok ? now.toISOString() : null,
          sent_by: representative.user_id,
          televendas_id: representative.televendas_id,
          send_type: "automatico",
          provider: activeProvider,
          company_id: representative.company_id || null,
        });

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

      const pagoPhoneGroups = new Map<string, any>();

      for (const item of (pagoQueue || [])) {
        if (!item.tipo_operacao?.toLowerCase().includes("novo")) continue;

        const normalizedPhone = (item.cliente_telefone || "").replace(/\D/g, "");
        if (!normalizedPhone || pagoPhoneGroups.has(normalizedPhone)) {
          await serviceClient.from("sms_televendas_queue")
            .update({ automacao_status: "finalizado", automacao_ativa: false })
            .eq("id", item.id);
          continue;
        }

        pagoPhoneGroups.set(normalizedPhone, item);

        let message = msgPago;
        message = message.replace(/\{\{nome\}\}/gi, item.cliente_nome || "");

        const result = await sendSms(item.cliente_telefone, message, activeProvider);

        await serviceClient.from("sms_history").insert({
          phone: item.cliente_telefone,
          contact_name: item.cliente_nome,
          message,
          status: result.ok ? "sent" : "failed",
          provider_message_id: result.sid || result.messageId || null,
          error_message: formatErrorMessage(result),
          sent_at: result.ok ? new Date().toISOString() : null,
          sent_by: item.user_id,
          televendas_id: item.televendas_id,
          send_type: "automatico",
          provider: activeProvider,
          company_id: item.company_id || null,
        });

        await serviceClient.from("sms_televendas_queue")
          .update({ automacao_status: "finalizado", automacao_ativa: false })
          .eq("id", item.id);

        if (result.ok) totalSent++;
        else totalFailed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: totalSent, failed: totalFailed, skipped: totalSkipped, provider: activeProvider }),
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
