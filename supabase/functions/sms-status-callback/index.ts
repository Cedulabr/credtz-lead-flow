import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map Yup Chat status → internal status
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
    const body = await req.json();
    console.log("SMS callback received:", JSON.stringify(body));

    const {
      id,
      status,
      error_code,
      error_message,
      carrier,
    } = body;

    if (!id || !status) {
      return new Response(JSON.stringify({ error: "Missing id or status" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const mappedStatus = STATUS_MAP[status.toLowerCase()] || status.toLowerCase();

    const updateData: Record<string, unknown> = {
      delivery_status: status.toLowerCase(),
      error_code: error_code || null,
      carrier: carrier || null,
    };

    // Update main status
    if (mappedStatus === "delivered") {
      updateData.status = "delivered";
      updateData.delivered_at = new Date().toISOString();
    } else if (mappedStatus === "failed") {
      updateData.status = "failed";
      if (error_message) updateData.error_message = error_message;
    }

    const { error } = await serviceClient
      .from("sms_history")
      .update(updateData)
      .eq("provider_message_id", id);

    if (error) {
      console.error("Failed to update sms_history:", error);
      return new Response(JSON.stringify({ error: "DB update failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`SMS ${id} updated to ${mappedStatus}`);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("sms-status-callback error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
