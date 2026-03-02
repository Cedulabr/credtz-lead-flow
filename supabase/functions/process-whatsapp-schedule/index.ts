import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TICKETZ_URL = "https://chat.easyn.digital:443/backend/api/messages/send";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch pending scheduled messages that are due
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
      const apiToken = msg.whatsapp_instances?.api_token;
      if (!apiToken) {
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({ status: "failed", error_message: "Token da instância não encontrado" })
          .eq("id", msg.id);
        failed++;
        continue;
      }

      try {
        let ticketzResponse: Response;
        let messageType = "text";

        if (msg.media_base64 && msg.media_name) {
          messageType = "media";
          const binaryStr = atob(msg.media_base64);
          const bytes = new Uint8Array(binaryStr.length);
          for (let i = 0; i < binaryStr.length; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }

          // Send text first if present
          if (msg.message) {
            await fetch(TICKETZ_URL, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                number: msg.phone,
                body: msg.message,
                saveOnTicket: true,
                linkPreview: true,
              }),
            });
          }

          const formData = new FormData();
          formData.append("number", msg.phone);
          formData.append("saveOnTicket", "true");
          const blob = new Blob([bytes], { type: "application/pdf" });
          formData.append("medias", blob, msg.media_name);

          ticketzResponse = await fetch(TICKETZ_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${apiToken}` },
            body: formData,
          });
        } else {
          ticketzResponse = await fetch(TICKETZ_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              number: msg.phone,
              body: msg.message,
              saveOnTicket: true,
              linkPreview: true,
            }),
          });
        }

        const success = ticketzResponse.ok;

        // Update scheduled message status
        await supabase
          .from("whatsapp_scheduled_messages")
          .update({
            status: success ? "sent" : "failed",
            sent_at: success ? new Date().toISOString() : null,
            error_message: success ? null : `HTTP ${ticketzResponse.status}`,
          })
          .eq("id", msg.id);

        // Log in whatsapp_messages
        await supabase.from("whatsapp_messages").insert({
          user_id: msg.user_id,
          phone: msg.phone,
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
