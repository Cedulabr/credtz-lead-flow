import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_MAP: Record<string, string> = {
  delivered: "delivered",
  undelivered: "failed",
  failed: "failed",
  sent: "sent",
  accepted: "sent",
};

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

    const { data: claims, error: claimsErr } = await supabase.auth.getUser();
    if (claimsErr || !claims?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return new Response(JSON.stringify({ error: "campaign_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch messages with provider_message_id that haven't been confirmed yet
    const { data: messages, error: fetchErr } = await serviceClient
      .from("sms_history")
      .select("id, provider_message_id, provider, status")
      .eq("campaign_id", campaign_id)
      .not("provider_message_id", "is", null)
      .in("status", ["sent", "pending"]);

    if (fetchErr) throw fetchErr;
    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ checked: 0, updated: 0, delivered: 0, failed: 0, undelivered: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const yupId = Deno.env.get("YUP_CHAT_ID");
    const yupToken = Deno.env.get("YUP_CHAT_TOKEN");
    const basicAuth = yupId && yupToken ? btoa(`${yupId}:${yupToken}`) : null;

    let updated = 0;
    let delivered = 0;
    let failed = 0;
    let undelivered = 0;

    for (const msg of messages) {
      if (msg.provider !== "yup_chat" || !basicAuth) continue;

      try {
        const res = await fetch(`https://api.yup.chat/v1/sms/messages/${msg.provider_message_id}`, {
          headers: { Authorization: `Basic ${basicAuth}` },
        });

        if (!res.ok) continue;
        const data = await res.json();
        const rawStatus = (data.status || "").toLowerCase();
        const mappedStatus = STATUS_MAP[rawStatus] || rawStatus;

        if (rawStatus === msg.status) continue;

        const updateData: Record<string, unknown> = {
          delivery_status: rawStatus,
          error_code: data.error_code || null,
          error_message: data.error_message || null,
          carrier: data.carrier || null,
        };

        if (mappedStatus === "delivered") {
          updateData.status = "delivered";
          updateData.delivered_at = new Date().toISOString();
          delivered++;
        } else if (mappedStatus === "failed") {
          updateData.status = "failed";
          if (rawStatus === "undelivered") undelivered++;
          else failed++;
        }

        await serviceClient
          .from("sms_history")
          .update(updateData)
          .eq("id", msg.id);

        updated++;
      } catch (e) {
        console.error(`Error checking message ${msg.provider_message_id}:`, e);
      }
    }

    // Also update campaign delivered_count
    if (delivered > 0) {
      const { data: campaignData } = await serviceClient
        .from("sms_campaigns")
        .select("delivered_count")
        .eq("id", campaign_id)
        .single();

      if (campaignData) {
        await serviceClient
          .from("sms_campaigns")
          .update({ delivered_count: (campaignData.delivered_count || 0) + delivered })
          .eq("id", campaign_id);
      }
    }

    return new Response(
      JSON.stringify({ checked: messages.length, updated, delivered, failed, undelivered }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sms-check-status error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
