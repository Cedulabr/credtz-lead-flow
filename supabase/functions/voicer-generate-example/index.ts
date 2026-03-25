import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Variable conversion map (same as variableConverter.ts)
const VARIABLE_MAP: Record<string, string> = {
  "{{tom animado}}": "[cheerfully]",
  "{{tom triste}}": "[sadly]",
  "{{tom irritado}}": "[angrily]",
  "{{tom assustado}}": "[fearfully]",
  "{{empolgação}}": "[excitedly]",
  "{{ironia}}": "[sarcastically]",
  "{{tom entusiasmado}}": "[enthusiastically]",
  "{{tom conspiratório}}": "[in a conspiratorial tone]",
  "{{tom de urgência}}": "[urgently]",
  "{{tom misterioso}}": "[mysteriously]",
  "{{empoderada}}": "[empoweringly]",
  "{{indignado}}": "[indignantly]",
  "{{em pânico}}": "[panicking]",
  "{{tom desconfiado}}": "[suspiciously]",
  "{{tom suave}}": "[softly]",
  "{{tom acolhedor}}": "[warmly]",
  "{{tom prestativo}}": "[helpfully]",
  "{{voz de papai noel}}": "[speaking like Santa Claus, jolly and warm]",
  "{{cientista maluco}}": "[speaking like a mad scientist, excited and erratic]",
  "{{locução profissional}}": "[speaking in a professional broadcast voice]",
  "{{narrador de suspense}}": "[speaking like a suspense narrator, dramatic and tense]",
  "{{voz de velhinho}}": "[speaking like an elderly person, slow and wise]",
  "{{locução coloquial}}": "[speaking casually and informally]",
  "{{locução caricata}}": "[speaking in an exaggerated caricature voice]",
  "{{locução cordial}}": "[speaking cordially and professionally]",
  "{{locução amigável}}": "[speaking in a friendly, approachable way]",
  "{{risada}}": "[laughs]",
  "{{gargalhada}}": "[laughs loudly]",
  "{{suspiro}}": "[sighs]",
  "{{choro}}": "[crying]",
  "{{sorrindo}}": "[smiling]",
  "{{rindo}}": "[chuckling]",
  "{{respiração ofegante}}": "[breathing heavily]",
  "{{puxa o ar e solta}}": "[takes a deep breath and exhales]",
  "{{gritando}}": "[shouting]",
  "{{pausa curta}}": '<break time="0.5s"/>',
  "{{pausa longa}}": '<break time="1.5s"/>',
  "{{pausa 2 segundos}}": '<break time="2s"/>',
  "{{pausa 3 segundos}}": '<break time="3s"/>',
  "{{pausa 5 segundos}}": '<break time="5s"/>',
  "{{ênfase}}": "[with emphasis]",
  "{{sussurro}}": "(em voz baixa)",
  "{{voz embriagada}}": "[speaking as if drunk, slurring words]",
  "{{sussurrando baixinho}}": "[whispering very quietly]",
  "{{locução suave}}": "[speaking smoothly and gently]",
  "{{fala entusiasmada}}": "[speaking with great enthusiasm]",
};

function convertVariables(text: string): string {
  let converted = text;
  for (const [variable, replacement] of Object.entries(VARIABLE_MAP)) {
    converted = converted.split(variable).join(replacement);
  }
  converted = converted.replace(/\{\{([^}]+)\}\}/g, "[$1]");
  return converted;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text, voiceId, exampleKey } = await req.json();

    if (!text || !voiceId || !exampleKey) {
      return new Response(
        JSON.stringify({ error: "text, voiceId and exampleKey are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const filePath = `examples/${exampleKey}.mp3`;

    // Check if already cached
    const { data: existingFile } = await supabaseAdmin.storage
      .from("voicer-audios")
      .list("examples", { search: `${exampleKey}.mp3` });

    if (existingFile && existingFile.length > 0) {
      const { data: publicUrlData } = supabaseAdmin.storage
        .from("voicer-audios")
        .getPublicUrl(filePath);

      return new Response(
        JSON.stringify({ audioUrl: publicUrlData.publicUrl, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert variables and generate via ElevenLabs
    const convertedText = convertVariables(text);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: convertedText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true,
          },
          language_code: "pt",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "ElevenLabs API error", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from("voicer-audios")
      .upload(filePath, audioBytes, { contentType: "audio/mpeg", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("voicer-audios")
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({ audioUrl: publicUrlData.publicUrl, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Generate example error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
