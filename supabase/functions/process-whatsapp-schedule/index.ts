import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evocloud.werkonnect.com";
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ error: "EVOLUTION_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const evoHeaders = {
      "apikey": EVOLUTION_API_KEY,
      "Content-Type": "application/json",
    };

    // Fetch pending scheduled messages that are due
    // api_token now stores the Evolution instance name
    const { data: pendingMessages, error: fetchError } = await supabase
      .from("whatsapp_scheduled_messages")
      .select("*, whatsapp_instances(api_token)")
      .eq("status", "pending")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50);

    if (fetchError) {
      console.error("Error fetching scheduled messages:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    let failed = 0;

    for (const msg of pendingMessages) {
      const instanceName = msg.whatsapp_instances?.api_token;
      if (!instanceName) {
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({ status: "failed", error_message: "Nome da instância não encontrado" })
          .eq("id", msg.id);
        failed++;
        continue;
      }

      // Normalize phone
      let phone = msg.phone.replace(/\D/g, "");
      if (phone.length <= 11) phone = "55" + phone;

      try {
        let messageType = "text";
        let evoResponse: Response;

        if (msg.media_base64 && msg.media_name) {
          messageType = "media";

          // Send text first if present
          if (msg.message) {
            await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
              method: "POST",
              headers: evoHeaders,
              body: JSON.stringify({
                number: phone,
                text: msg.message,
              }),
            });
          }

          // Detect media type
          const ext = (msg.media_name || '').split('.').pop()?.toLowerCase();
          const mediaTypeMap: Record<string, string> = {
            pdf: 'document', mp3: 'audio', ogg: 'audio', wav: 'audio',
            png: 'image', jpg: 'image', jpeg: 'image',
          };
          const mediatype = mediaTypeMap[ext || ''] || 'document';

          evoResponse = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
            method: "POST",
            headers: evoHeaders,
            body: JSON.stringify({
              number: phone,
              mediatype,
              media: `data:application/octet-stream;base64,${msg.media_base64}`,
              fileName: msg.media_name,
            }),
          });
        } else {
          evoResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
            method: "POST",
            headers: evoHeaders,
            body: JSON.stringify({
              number: phone,
              text: msg.message,
            }),
          });
        }

        const success = evoResponse.ok;

        // Update scheduled message status
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({
            status: success ? "sent" : "failed",
            sent_at: success ? new Date().toISOString() : null,
            error_message: success ? null : `HTTP ${evoResponse.status}`,
          })
          .eq("id", msg.id);

        // Log in whatsapp_messages
        await supabase.from("whatsapp_messages").insert({
          user_id: msg.user_id,
          phone,
          message: msg.message || `[Media: ${msg.media_name}]`,
          status: success ? "sent" : "failed",
          sent_at: success ? new Date().toISOString() : null,
          direction: "outgoing",
          message_type: messageType,
          client_name: msg.client_name || null,
        });

        if (success) sent++;
        else failed++;
      } catch (sendError) {
        console.error(`Error sending scheduled message ${msg.id}:`, sendError);
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({ status: "failed", error_message: sendError.message })
          .eq("id", msg.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: pendingMessages.length, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-whatsapp-schedule:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
