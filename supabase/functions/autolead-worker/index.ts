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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 1. Fetch scheduled messages that are due
    const { data: messages, error: fetchError } = await supabase
      .from("autolead_messages")
      .select("*, autolead_jobs!inner(status, whatsapp_instance_ids)")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(5);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      // Skip if job is not running
      if (msg.autolead_jobs?.status !== "running") continue;

      // Mark as sending
      await supabase
        .from("autolead_messages")
        .update({ status: "sending" })
        .eq("id", msg.id);

      // Get WhatsApp token for this instance
      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("api_token")
        .eq("id", msg.whatsapp_instance_id)
        .maybeSingle();

      if (!instance?.api_token) {
        await supabase
          .from("autolead_messages")
          .update({ status: "failed", error_message: "Token não encontrado para instância" })
          .eq("id", msg.id);
        failed++;
        continue;
      }

      // Normalize phone
      let phone = msg.phone.replace(/\D/g, "");
      if (phone.length <= 11) phone = "55" + phone;

      try {
        const response = await fetch(TICKETZ_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${instance.api_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            number: phone,
            body: msg.message,
            saveOnTicket: true,
            linkPreview: true,
          }),
        });

        const responseText = await response.text();
        console.log(`Message ${msg.id} to ${phone}: ${response.status} ${responseText}`);

        if (response.ok) {
          await supabase
            .from("autolead_messages")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", msg.id);

          await supabase.rpc("autolead_increment_sent", { p_job_id: msg.job_id });
          sent++;
        } else {
          let errorDetail = responseText;
          try {
            const parsed = JSON.parse(responseText);
            errorDetail = parsed?.error || responseText;
          } catch {}

          await supabase
            .from("autolead_messages")
            .update({ status: "failed", error_message: errorDetail })
            .eq("id", msg.id);

          await supabase.rpc("autolead_increment_failed", { p_job_id: msg.job_id });
          failed++;
        }

        // Log in whatsapp_messages for history
        await supabase.from("whatsapp_messages").insert({
          user_id: (await supabase.from("autolead_jobs").select("user_id").eq("id", msg.job_id).single()).data?.user_id,
          phone,
          message: msg.message,
          status: response.ok ? "sent" : "failed",
          sent_at: response.ok ? new Date().toISOString() : null,
          direction: "outgoing",
          message_type: "text",
          client_name: msg.lead_name,
        });
      } catch (sendError: any) {
        console.error(`Send error for ${msg.id}:`, sendError);
        await supabase
          .from("autolead_messages")
          .update({ status: "failed", error_message: sendError.message })
          .eq("id", msg.id);
        failed++;
      }
    }

    // Check if any jobs are now complete
    const jobIds = [...new Set(messages.map(m => m.job_id))];
    for (const jobId of jobIds) {
      const { data: remaining } = await supabase
        .from("autolead_messages")
        .select("id")
        .eq("job_id", jobId)
        .in("status", ["scheduled", "sending"])
        .limit(1);

      if (!remaining || remaining.length === 0) {
        await supabase
          .from("autolead_jobs")
          .update({ status: "completed", finished_at: new Date().toISOString() })
          .eq("id", jobId)
          .eq("status", "running");
      }
    }

    return new Response(
      JSON.stringify({ processed: sent + failed, sent, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Worker error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
