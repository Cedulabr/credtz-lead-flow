import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendSmsBody {
  campaign_id?: string;
  phone?: string;
  message?: string;
  televendas_id?: string;
  send_type?: string;
  contact_name?: string;
}

interface SmsResult {
  ok: boolean;
  sid?: string;
  messageId?: string;
  error?: string;
  provider: string;
}

// === Get active provider from DB ===
async function getActiveProvider(serviceClient: any): Promise<string> {
  const { data } = await serviceClient
    .from("sms_providers")
    .select("name")
    .eq("is_active", true)
    .limit(1)
    .single();
  return data?.name || "twilio";
}

// === TWILIO ===
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
  return { ok: false, error: data.message || "Unknown Twilio error", provider: "twilio" };
}

// === YUP CHAT ===
async function sendViaYupChat(phone: string, message: string): Promise<SmsResult> {
  const yupId = Deno.env.get("YUP_CHAT_ID");
  const yupToken = Deno.env.get("YUP_CHAT_TOKEN");

  if (!yupId || !yupToken) {
    return { ok: false, error: "YUP_CHAT_ID ou YUP_CHAT_TOKEN não configurados", provider: "yup_chat" };
  }

  let formatted = phone.replace(/\D/g, "");
  if (formatted.length <= 11) formatted = `55${formatted}`;

  const basicAuth = btoa(`${yupId}:${yupToken}`);

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
}

// === YUP CHAT BATCH (up to 1000 messages per request) ===
async function sendBatchViaYupChat(
  contacts: { phone: string; message: string; name?: string }[]
): Promise<{ results: { phone: string; ok: boolean; messageId?: string; error?: string }[] }> {
  const yupId = Deno.env.get("YUP_CHAT_ID");
  const yupToken = Deno.env.get("YUP_CHAT_TOKEN");

  if (!yupId || !yupToken) {
    return {
      results: contacts.map((c) => ({ phone: c.phone, ok: false, error: "YUP_CHAT_ID ou YUP_CHAT_TOKEN não configurados" })),
    };
  }

  const basicAuth = btoa(`${yupId}:${yupToken}`);

  const messages = contacts.map((c) => {
    let formatted = c.phone.replace(/\D/g, "");
    if (formatted.length <= 11) formatted = `55${formatted}`;
    return { to: formatted, body: c.message };
  });

  const res = await fetch("https://api.yup.chat/v1/sms/messages", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messages, default: { normalize: true } }),
  });

  const data = await res.json();

  if (res.ok && Array.isArray(data)) {
    return {
      results: data.map((item: any, i: number) => ({
        phone: contacts[i]?.phone || "",
        ok: item.status === "accepted" || item.status === "sent",
        messageId: item.id,
        error: item.error_message || (item.status !== "accepted" && item.status !== "sent" ? `Status: ${item.status}` : undefined),
      })),
    };
  }

  return {
    results: contacts.map((c) => ({ phone: c.phone, ok: false, error: data.error || "Yup Chat batch error" })),
  };
}

// === Unified send function ===
async function sendSms(phone: string, message: string, provider: string): Promise<SmsResult> {
  if (provider === "yup_chat") return sendViaYupChat(phone, message);
  return sendViaTwilio(phone, message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = (await req.json()) as SendSmsBody;

    // Get active provider
    const activeProvider = await getActiveProvider(serviceClient);

    // Check if user is admin
    const { data: profileData } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdmin = profileData?.role === "admin";

    // ===== SINGLE SEND MODE =====
    if (body.phone && body.message) {
      if (!isAdmin) {
        const { data: creditData } = await serviceClient
          .from("sms_credits")
          .select("credits_balance")
          .eq("user_id", user.id)
          .single();
        const balance = creditData?.credits_balance ?? 0;
        if (balance < 1) {
          return new Response(
            JSON.stringify({ error: "Créditos SMS insuficientes. Solicite ao administrador." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const result = await sendSms(body.phone, body.message, activeProvider);

      await serviceClient.from("sms_history").insert({
        phone: body.phone,
        contact_name: body.contact_name || null,
        message: body.message,
        status: result.ok ? "sent" : "failed",
        provider_message_id: result.sid || result.messageId || null,
        error_message: result.error || null,
        sent_at: result.ok ? new Date().toISOString() : null,
        sent_by: user.id,
        televendas_id: body.televendas_id || null,
        send_type: body.send_type || "manual",
        provider: activeProvider,
      });

      if (result.ok && !isAdmin) {
        const { data: cur } = await serviceClient
          .from("sms_credits")
          .select("credits_balance")
          .eq("user_id", user.id)
          .single();
        const before = cur?.credits_balance ?? 0;
        const after = Math.max(0, before - 1);
        await serviceClient.from("sms_credits")
          .update({ credits_balance: after, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        await serviceClient.from("sms_credits_history").insert({
          user_id: user.id, admin_id: user.id, action: "consume",
          amount: 1, balance_before: before, balance_after: after,
          reason: "Envio SMS individual",
        });
      }

      return new Response(
        JSON.stringify({ success: result.ok, error: result.error, sid: result.sid, messageId: result.messageId, provider: activeProvider }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== CAMPAIGN SEND MODE =====
    const { campaign_id } = body;
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id or phone+message required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: campaign, error: campErr } = await supabase
      .from("sms_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();

    if (campErr || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      return new Response(
        JSON.stringify({ error: "Campaign already sent or in progress" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: contacts } = await supabase
      .from("sms_contacts")
      .select("id, name, phone")
      .eq("list_id", campaign.contact_list_id);

    if (!contacts || contacts.length === 0) {
      await serviceClient
        .from("sms_campaigns")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", campaign_id);
      return new Response(JSON.stringify({ error: "No contacts in list" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check credits for non-admin
    let creditsBefore = 0;
    if (!isAdmin) {
      const { data: creditData } = await serviceClient
        .from("sms_credits")
        .select("credits_balance")
        .eq("user_id", user.id)
        .single();
      creditsBefore = creditData?.credits_balance ?? 0;
      if (creditsBefore < contacts.length) {
        return new Response(
          JSON.stringify({ 
            error: `Créditos SMS insuficientes. Necessário: ${contacts.length}, disponível: ${creditsBefore}` 
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Mark as sending
    await serviceClient
      .from("sms_campaigns")
      .update({ status: "sending", started_at: new Date().toISOString() })
      .eq("id", campaign_id);

    let sentCount = 0;
    let failedCount = 0;

    // Use batch for Yup Chat, sequential for Twilio
    if (activeProvider === "yup_chat") {
      const batchContacts = contacts.map((contact) => {
        let msg = campaign.message_content;
        msg = msg.replace(/\{\{nome\}\}/gi, contact.name || "");
        return { phone: contact.phone, message: msg, name: contact.name };
      });

      const batchResult = await sendBatchViaYupChat(batchContacts);

      for (let i = 0; i < batchResult.results.length; i++) {
        const r = batchResult.results[i];
        const contact = contacts[i];
        if (r.ok) {
          sentCount++;
          await serviceClient.from("sms_history").insert({
            campaign_id, phone: contact.phone, contact_name: contact.name || null,
            message: batchContacts[i].message, status: "sent",
            provider_message_id: r.messageId || null, sent_at: new Date().toISOString(),
            sent_by: user.id, send_type: "manual", provider: "yup_chat",
          });
        } else {
          failedCount++;
          await serviceClient.from("sms_history").insert({
            campaign_id, phone: contact.phone, contact_name: contact.name || null,
            message: batchContacts[i].message, status: "failed",
            error_message: r.error || "Unknown error", sent_by: user.id,
            send_type: "manual", provider: "yup_chat",
          });
        }
      }
    } else {
      // Twilio - sequential
      for (const contact of contacts) {
        let msg = campaign.message_content;
        msg = msg.replace(/\{\{nome\}\}/gi, contact.name || "");

        const result = await sendViaTwilio(contact.phone, msg);

        if (result.ok) {
          sentCount++;
          await serviceClient.from("sms_history").insert({
            campaign_id, phone: contact.phone, contact_name: contact.name || null,
            message: msg, status: "sent", provider_message_id: result.sid || null,
            sent_at: new Date().toISOString(), sent_by: user.id, send_type: "manual",
            provider: "twilio",
          });
        } else {
          failedCount++;
          await serviceClient.from("sms_history").insert({
            campaign_id, phone: contact.phone, contact_name: contact.name || null,
            message: msg, status: "failed", error_message: result.error || "Unknown error",
            sent_by: user.id, send_type: "manual", provider: "twilio",
          });
        }
      }
    }

    // Deduct credits
    if (!isAdmin && sentCount > 0) {
      const after = Math.max(0, creditsBefore - sentCount);
      await serviceClient.from("sms_credits")
        .update({ credits_balance: after, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      await serviceClient.from("sms_credits_history").insert({
        user_id: user.id, admin_id: user.id, action: "consume",
        amount: sentCount, balance_before: creditsBefore, balance_after: after,
        reason: `Campanha SMS: ${campaign.name} (${sentCount} enviados)`,
      });
    }

    const finalStatus = failedCount === contacts.length ? "failed" : "completed";
    await serviceClient
      .from("sms_campaigns")
      .update({
        status: finalStatus, sent_count: sentCount, failed_count: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount, total: contacts.length, provider: activeProvider }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-sms error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
