import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TICKETZ_URL = "https://chat.easyn.digital:443/backend/api/messages/send";

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
    const { apiToken, number, message, mediaBase64, mediaName, clientName, testMode } = body;

    if (!apiToken) {
      return new Response(
        JSON.stringify({ error: "apiToken is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }


    // Test mode: validate token by sending to a dummy number
    if (testMode) {
      try {
        const testResponse = await fetch(TICKETZ_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: "5500000000000",
            body: "Teste de conexão",
            saveOnTicket: false,
          }),
        });
        const testText = await testResponse.text();
        console.log("Test mode response:", testResponse.status, testText);
        
        // If status < 500, the token is valid (even 4xx means auth worked)
        if (testResponse.status < 500) {
          return new Response(
            JSON.stringify({ success: true, testMode: true, status: testResponse.status }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ success: false, testMode: true, error: "API server error", details: testText }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
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

    console.log(`Sending to: ${normalizedNumber}, type: ${mediaBase64 ? 'media' : 'text'}`);

    let ticketzResponse: Response;
    let messageType = "text";

    if (mediaBase64 && mediaName) {
      messageType = "media";
      const binaryStr = atob(mediaBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const formData = new FormData();
      formData.append("number", normalizedNumber);
      formData.append("saveOnTicket", "true");
      
      const blob = new Blob([bytes], { type: "application/pdf" });
      formData.append("medias", blob, mediaName);

      // If there's also a text message, send it first
      if (message) {
        const textResp = await fetch(TICKETZ_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: normalizedNumber,
            body: message,
            saveOnTicket: true,
            linkPreview: true,
          }),
        });
        const textResult = await textResp.text();
        console.log("Text before media response:", textResp.status, textResult);
      }

      ticketzResponse = await fetch(TICKETZ_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        body: formData,
      });
    } else {
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
          number: normalizedNumber,
          body: message,
          saveOnTicket: true,
          linkPreview: true,
        }),
      });
    }

    const responseText = await ticketzResponse.text();
    console.log("Ticketz response:", ticketzResponse.status, responseText);
    
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
      phone: normalizedNumber,
      message: message || `[Media: ${mediaName}]`,
      status: success ? "sent" : "failed",
      sent_at: success ? new Date().toISOString() : null,
      direction: "outgoing",
      message_type: messageType,
      client_name: clientName || null,
    });

    if (!success) {
      console.error("Ticketz API error:", ticketzResponse.status, responseText);
      const errorDetail = responseData?.error === "ERR_INTERNAL_ERROR" 
        ? "Erro interno na API Ticketz. Verifique se o token da API está correto (não é o número de telefone) e se a instância está conectada na plataforma Easyn/Ticketz."
        : responseData?.error || "Falha ao enviar mensagem";
      return new Response(
        JSON.stringify({ success: false, error: errorDetail, details: responseData }),
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
