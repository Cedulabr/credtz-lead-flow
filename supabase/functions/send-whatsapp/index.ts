import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evocloud.werkonnect.com";
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ error: "EVOLUTION_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const { instanceName: directInstanceName, apiToken, number, message, mediaBase64, mediaName, clientName, testMode, instanceId, sourceModule } = body;

    // Prefer instanceName; fall back to apiToken for backward compatibility
    const instanceName = directInstanceName || apiToken;

    if (!instanceName) {
      return new Response(
        JSON.stringify({ error: "instanceName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test mode: check connection state via Evolution API
    if (testMode) {
      try {
        const stateResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
          method: "GET",
          headers: { "apikey": EVOLUTION_API_KEY },
        });
        const stateText = await stateResponse.text();
        console.log("Connection state response:", stateResponse.status, stateText);

        if (!stateResponse.ok) {
          return new Response(
            JSON.stringify({ success: false, testMode: true, error: `Instância "${instanceName}" não encontrada ou erro na Evolution API.`, details: stateText }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let stateData;
        try { stateData = JSON.parse(stateText); } catch { stateData = {}; }

        const state = stateData?.instance?.state || stateData?.state;
        const isConnected = state === "open";

        return new Response(
          JSON.stringify({
            success: isConnected,
            testMode: true,
            connected: isConnected,
            state: state || "unknown",
            error: isConnected ? null : `Instância "${instanceName}" está desconectada (estado: ${state || "unknown"}).`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        console.error("Test mode error:", e);
        return new Response(
          JSON.stringify({ success: false, testMode: true, error: e.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    if (!number) {
      return new Response(
        JSON.stringify({ error: "number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone number - ensure it has country code
    let normalizedNumber = number.replace(/\D/g, "");
    if (normalizedNumber.length <= 11) {
      normalizedNumber = "55" + normalizedNumber;
    }

    console.log(`Sending to: ${normalizedNumber}, instance: ${instanceName}, type: ${mediaBase64 ? 'media' : 'text'}`);

    const evoHeaders = {
      "apikey": EVOLUTION_API_KEY,
      "Content-Type": "application/json",
    };

    let evoResponse: Response;
    let messageType = "text";

    if (mediaBase64 && mediaName) {
      messageType = "media";

      // Detect media type from extension
      const ext = (mediaName || '').split('.').pop()?.toLowerCase();
      const mediaTypeMap: Record<string, string> = {
        pdf: 'document',
        doc: 'document',
        docx: 'document',
        xls: 'document',
        xlsx: 'document',
        mp3: 'audio',
        ogg: 'audio',
        wav: 'audio',
        m4a: 'audio',
        opus: 'audio',
        webm: 'audio',
        png: 'image',
        jpg: 'image',
        jpeg: 'image',
        gif: 'image',
        mp4: 'video',
      };
      const mediatype = mediaTypeMap[ext || ''] || 'document';

      // If there's also a text message, send it first
      if (message) {
        await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
          method: "POST",
          headers: evoHeaders,
          body: JSON.stringify({
            number: normalizedNumber,
            text: message,
          }),
        });
      }

      // Send media
      evoResponse = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
        method: "POST",
        headers: evoHeaders,
        body: JSON.stringify({
          number: normalizedNumber,
          mediatype,
          media: `data:application/octet-stream;base64,${mediaBase64}`,
          fileName: mediaName,
        }),
      });
      console.log("Media send response status:", evoResponse.status);
    } else {
      if (!message) {
        return new Response(
          JSON.stringify({ error: "message is required for text messages" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      evoResponse = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
        method: "POST",
        headers: evoHeaders,
        body: JSON.stringify({
          number: normalizedNumber,
          text: message,
        }),
      });
    }

    const responseText = await evoResponse.text();
    console.log("Evolution response:", evoResponse.status, responseText);

    let responseData;
    try { responseData = JSON.parse(responseText); } catch { responseData = { raw: responseText }; }

    const success = evoResponse.ok;

    // Log message in database
    await supabase.from("whatsapp_messages").insert({
      user_id: user.id,
      phone: normalizedNumber,
      message: message || `[Media: ${mediaName}]`,
      status: success ? "sent" : "failed",
      sent_at: success ? new Date().toISOString() : null,
      direction: "outgoing",
      message_type: messageType,
      client_name: clientName || null,
      instance_id: instanceId || null,
      source_module: sourceModule || null,
    });

    if (!success) {
      console.error("Evolution API error:", evoResponse.status, responseText);
      return new Response(
        JSON.stringify({ success: false, error: responseData?.error || responseData?.message || "Falha ao enviar mensagem", details: responseData, sentTo: normalizedNumber }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
