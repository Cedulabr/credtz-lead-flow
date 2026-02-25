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

async function sendViaTwilio(phone: string, message: string): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
  const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")!;
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const basicAuth = btoa(`${accountSid}:${authToken}`);

  let formatted = phone.replace(/\D/g, "");
  if (formatted.length <= 11) {
    formatted = `+55${formatted}`;
  } else if (!formatted.startsWith("+")) {
    formatted = `+${formatted}`;
  }

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
  if (res.ok) {
    return { ok: true, sid: data.sid };
  }
  return { ok: false, error: data.message || "Unknown Twilio error" };
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

    // Check if user is admin (admins bypass credit check)
    const { data: profileData } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const isAdmin = profileData?.role === "admin";

    // ===== SINGLE SEND MODE =====
    if (body.phone && body.message) {
      // Check credits for non-admin
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

      const result = await sendViaTwilio(body.phone, body.message);

      await serviceClient.from("sms_history").insert({
        phone: body.phone,
        contact_name: body.contact_name || null,
        message: body.message,
        status: result.ok ? "sent" : "failed",
        provider_message_id: result.sid || null,
        error_message: result.error || null,
        sent_at: result.ok ? new Date().toISOString() : null,
        sent_by: user.id,
        televendas_id: body.televendas_id || null,
        send_type: body.send_type || "manual",
      });

      // Deduct 1 credit on success for non-admin
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
        JSON.stringify({ success: result.ok, error: result.error, sid: result.sid }),
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

    // Fetch contacts to know count
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

    // Check credits for non-admin (need enough for all contacts)
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

    for (const contact of contacts) {
      let msg = campaign.message_content;
      msg = msg.replace(/\{\{nome\}\}/gi, contact.name || "");

      const result = await sendViaTwilio(contact.phone, msg);

      if (result.ok) {
        sentCount++;
        await serviceClient.from("sms_history").insert({
          campaign_id,
          phone: contact.phone,
          contact_name: contact.name || null,
          message: msg,
          status: "sent",
          provider_message_id: result.sid || null,
          sent_at: new Date().toISOString(),
          sent_by: user.id,
          send_type: "manual",
        });
      } else {
        failedCount++;
        await serviceClient.from("sms_history").insert({
          campaign_id,
          phone: contact.phone,
          contact_name: contact.name || null,
          message: msg,
          status: "failed",
          error_message: result.error || "Unknown error",
          sent_by: user.id,
          send_type: "manual",
        });
      }
    }

    // Deduct credits for successful sends (non-admin)
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

    // Always update final status
    const finalStatus = failedCount === contacts.length ? "failed" : "completed";
    await serviceClient
      .from("sms_campaigns")
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        completed_at: new Date().toISOString(),
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, failed: failedCount, total: contacts.length }),
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
