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
    let EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "https://evocloud.werkonnect.com";
    if (EVOLUTION_API_URL && !EVOLUTION_API_URL.startsWith("http")) EVOLUTION_API_URL = "https://" + EVOLUTION_API_URL;
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await createClient(
      supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all instances from Evolution API
    const evoResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
      method: "GET",
      headers: { "apikey": EVOLUTION_API_KEY },
    });

    if (!evoResponse.ok) {
      const errText = await evoResponse.text();
      console.error("Evolution API error:", evoResponse.status, errText);
      return new Response(
        JSON.stringify({ error: `Evolution API error: ${evoResponse.status}`, details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const evoInstances = await evoResponse.json();
    console.log(`Fetched ${Array.isArray(evoInstances) ? evoInstances.length : 0} instances from Evolution API`);

    if (!Array.isArray(evoInstances)) {
      return new Response(
        JSON.stringify({ error: "Unexpected response from Evolution API", raw: evoInstances }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get existing instances from DB
    const { data: existingInstances } = await supabase
      .from("whatsapp_instances")
      .select("id, instance_name, instance_status");

    const existingMap = new Map(
      (existingInstances || []).map((i: any) => [i.instance_name, i])
    );

    let updated = 0;
    let created = 0;
    let disconnected = 0;

    for (const evoInst of evoInstances) {
      const instanceName = evoInst.instance?.instanceName || evoInst.instanceName || evoInst.name;
      if (!instanceName) continue;

      const state = evoInst.instance?.state || evoInst.state || "unknown";
      const newStatus = state === "open" ? "connected" : "disconnected";
      if (newStatus === "disconnected") disconnected++;

      const existing = existingMap.get(instanceName);

      if (existing) {
        // Update status
        await supabase
          .from("whatsapp_instances")
          .update({ instance_status: newStatus })
          .eq("id", (existing as any).id);
        updated++;
      } else {
        // Insert new instance
        await supabase
          .from("whatsapp_instances")
          .insert({
            instance_name: instanceName,
            instance_status: newStatus,
            user_id: user.id,
          });
        created++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: evoInstances.length,
        updated,
        created,
        disconnected,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in sync-whatsapp-instances:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
