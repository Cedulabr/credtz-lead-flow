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

  let EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evocloud.werkonnect.com";
  if (EVOLUTION_API_URL && !EVOLUTION_API_URL.startsWith("http")) EVOLUTION_API_URL = "https://" + EVOLUTION_API_URL;
  const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

  if (!EVOLUTION_API_KEY) {
    return new Response(JSON.stringify({ error: "EVOLUTION_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const evoHeaders = {
    "apikey": EVOLUTION_API_KEY,
    "Content-Type": "application/json",
  };

  try {
    // 0. Transition scheduled jobs whose start time has arrived
    const { data: scheduledJobs } = await supabase
      .from("autolead_jobs")
      .select("id")
      .eq("status", "scheduled")
      .lte("scheduled_start_at", new Date().toISOString());

    if (scheduledJobs && scheduledJobs.length > 0) {
      for (const sj of scheduledJobs) {
        await supabase
          .from("autolead_jobs")
          .update({ status: "running", started_at: new Date().toISOString() })
          .eq("id", sj.id);
        console.log(`Job ${sj.id} transitioned from scheduled to running`);
      }
    }

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
      return new Response(JSON.stringify({ processed: 0, scheduled_activated: scheduledJobs?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      if (msg.autolead_jobs?.status !== "running") continue;

      await supabase
        .from("autolead_messages")
        .update({ status: "sending" })
        .eq("id", msg.id);

      // Get instance name from whatsapp_instances
      const { data: instance } = await supabase
        .from("whatsapp_instances")
        .select("instance_name")
        .eq("id", msg.whatsapp_instance_id)
        .maybeSingle();

      const instanceName = instance?.instance_name;
      if (!instanceName) {
        await supabase
          .from("autolead_messages")
          .update({ status: "failed", error_message: "Nome da instância não encontrado" })
          .eq("id", msg.id);
        failed++;
        continue;
      }

      let phone = msg.phone.replace(/\D/g, "");
      if (phone.length <= 11) phone = "55" + phone;

      try {
        // Send text message via Evolution API
        const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
          method: "POST",
          headers: evoHeaders,
          body: JSON.stringify({
            number: phone,
            text: msg.message,
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

          // Send audio if configured
          if (msg.audio_file_id) {
            try {
              const { data: audioFile } = await supabase
                .from("audio_files")
                .select("file_path, mime_type")
                .eq("id", msg.audio_file_id)
                .maybeSingle();

              if (audioFile) {
                const { data: fileData } = await supabase.storage
                  .from("audio-files")
                  .download(audioFile.file_path);

                if (fileData) {
                  // Convert to base64
                  const arrayBuffer = await fileData.arrayBuffer();
                  const uint8Array = new Uint8Array(arrayBuffer);
                  let binaryStr = "";
                  for (let i = 0; i < uint8Array.length; i++) {
                    binaryStr += String.fromCharCode(uint8Array[i]);
                  }
                  const base64 = btoa(binaryStr);

                  const ext = audioFile.file_path.split('.').pop() || 'ogg';

                  const audioResponse = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
                    method: "POST",
                    headers: evoHeaders,
                    body: JSON.stringify({
                      number: phone,
                      mediatype: "audio",
                      media: `data:audio/${ext};base64,${base64}`,
                      fileName: `audio.${ext}`,
                    }),
                  });

                  const audioRespText = await audioResponse.text();
                  console.log(`Audio ${msg.id} to ${phone}: ${audioResponse.status} ${audioRespText}`);
                }
              }
            } catch (audioErr: any) {
              console.error(`Audio send error for ${msg.id}:`, audioErr.message);
            }
          }
        } else {
          let errorDetail = responseText;
          try {
            const parsed = JSON.parse(responseText);
            errorDetail = parsed?.error || parsed?.message || responseText;
          } catch {}

          await supabase
            .from("autolead_messages")
            .update({ status: "failed", error_message: errorDetail })
            .eq("id", msg.id);

          await supabase.rpc("autolead_increment_failed", { p_job_id: msg.job_id });
          failed++;
        }

        // Log in whatsapp_messages
        await supabase.from("whatsapp_messages").insert({
          user_id: (await supabase.from("autolead_jobs").select("user_id").eq("id", msg.job_id).single()).data?.user_id,
          phone,
          message: msg.message,
          status: response.ok ? "sent" : "failed",
          sent_at: response.ok ? new Date().toISOString() : null,
          direction: "outgoing",
          message_type: msg.audio_file_id ? "audio" : "text",
          client_name: msg.lead_name,
          instance_id: msg.whatsapp_instance_id,
          source_module: "autolead",
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
