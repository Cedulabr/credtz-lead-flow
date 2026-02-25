import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SendSmsBody {
  campaign_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
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

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaign_id } = (await req.json()) as SendSmsBody;
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch campaign
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

    // Mark as sending
    await supabase
      .from("sms_campaigns")
      .update({ status: "sending" })
      .eq("id", campaign_id);

    // Fetch contacts from the list
    const { data: contacts } = await supabase
      .from("sms_contacts")
      .select("id, name, phone")
      .eq("list_id", campaign.contact_list_id);

    if (!contacts || contacts.length === 0) {
      await supabase
        .from("sms_campaigns")
        .update({ status: "failed" })
        .eq("id", campaign_id);
      return new Response(JSON.stringify({ error: "No contacts in list" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Twilio credentials
    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID")!;
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN")!;
    const messagingServiceSid = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID")!;
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const basicAuth = btoa(`${accountSid}:${authToken}`);

    let sentCount = 0;
    let failedCount = 0;

    // Use service client for history inserts
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    for (const contact of contacts) {
      // Replace variables in message
      let message = campaign.message_content;
      message = message.replace(/\{\{nome\}\}/gi, contact.name || "");

      // Format phone to E.164
      let phone = contact.phone.replace(/\D/g, "");
      if (phone.length <= 11) {
        phone = `+55${phone}`;
      } else if (!phone.startsWith("+")) {
        phone = `+${phone}`;
      }

      try {
        const params = new URLSearchParams({
          To: phone,
          MessagingServiceSid: messagingServiceSid,
          Body: message,
        });

        const twilioRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            Authorization: `Basic ${basicAuth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        const twilioData = await twilioRes.json();

        if (twilioRes.ok) {
          sentCount++;
          await serviceClient.from("sms_history").insert({
            campaign_id: campaign_id,
            contact_id: contact.id,
            phone: phone,
            message_content: message,
            status: "sent",
            provider_message_id: twilioData.sid,
            sent_at: new Date().toISOString(),
          });
        } else {
          failedCount++;
          await serviceClient.from("sms_history").insert({
            campaign_id: campaign_id,
            contact_id: contact.id,
            phone: phone,
            message_content: message,
            status: "failed",
            error_message: twilioData.message || "Unknown error",
          });
        }
      } catch (err) {
        failedCount++;
        await serviceClient.from("sms_history").insert({
          campaign_id: campaign_id,
          contact_id: contact.id,
          phone: phone,
          message_content: message,
          status: "failed",
          error_message: String(err),
        });
      }
    }

    // Update campaign status
    const finalStatus = failedCount === contacts.length ? "failed" : "completed";
    await serviceClient
      .from("sms_campaigns")
      .update({
        status: finalStatus,
        sent_count: sentCount,
        failed_count: failedCount,
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaign_id);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: contacts.length,
      }),
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
