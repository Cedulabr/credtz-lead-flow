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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { apiToken, number, message, mediaBase64, mediaName, clientName } = body;

    if (!apiToken || !number) {
      return new Response(
        JSON.stringify({ error: "apiToken and number are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TICKETZ_URL = "https://chat.easyn.digital:443/backend/api/messages/send";
    let ticketzResponse: Response;
    let messageType = "text";

    if (mediaBase64 && mediaName) {
      // Media message - convert base64 to blob and send as multipart/form-data
      messageType = "media";
      const binaryStr = atob(mediaBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const formData = new FormData();
      formData.append("number", number);
      formData.append("saveOnTicket", "true");
      
      const blob = new Blob([bytes], { type: "application/pdf" });
      formData.append("medias", blob, mediaName);

      // If there's also a text message, send it first
      if (message) {
        await fetch(TICKETZ_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number,
            body: message,
            saveOnTicket: true,
            linkPreview: true,
          }),
        });
      }

      ticketzResponse = await fetch(TICKETZ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        body: formData,
      });
    } else {
      // Text message
      if (!message) {
        return new Response(
          JSON.stringify({ error: "message is required for text messages" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      ticketzResponse = await fetch(TICKETZ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          number,
          body: message,
          saveOnTicket: true,
          linkPreview: true,
        }),
      });
    }

    const responseText = await ticketzResponse.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    const success = ticketzResponse.ok;

    // Log message in database
    await supabase.from("whatsapp_messages").insert({
      user_id: user.id,
      phone: number,
      message: message || `[Media: ${mediaName}]`,
      status: success ? "sent" : "failed",
      sent_at: success ? new Date().toISOString() : null,
      direction: "outgoing",
      message_type: messageType,
      client_name: clientName || null,
    });

    if (!success) {
      console.error("Ticketz API error:", responseText);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to send message", details: responseData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-whatsapp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
