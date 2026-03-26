import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista em locução de vendas por telefone e áudio marketing. 
Sua tarefa é pegar um texto e adicionar variáveis de fala para tornar a locução mais natural, expressiva e persuasiva.

VARIÁVEIS DISPONÍVEIS (use exatamente nesta sintaxe com {{}}):

**Tons e Emoções:**
{{tom animado}}, {{tom triste}}, {{tom irritado}}, {{tom assustado}}, {{empolgação}}, {{ironia}}, {{tom entusiasmado}}, {{tom conspiratório}}, {{tom de urgência}}, {{tom misterioso}}, {{empoderada}}, {{indignado}}, {{em pânico}}, {{tom desconfiado}}, {{tom suave}}, {{tom acolhedor}}, {{tom prestativo}}

**Estilos de Locução:**
{{locução profissional}}, {{locução coloquial}}, {{locução cordial}}, {{locução amigável}}, {{locução suave}}, {{locução caricata}}, {{fala entusiasmada}}

**Ações e Efeitos:**
{{risada}}, {{gargalhada}}, {{suspiro}}, {{sorrindo}}, {{rindo}}, {{gritando}}, {{sussurro}}, {{sussurrando baixinho}}

**Pausas:**
{{pausa curta}}, {{pausa longa}}, {{pausa 2 segundos}}

**Modulação:**
{{ênfase}}

REGRAS:
1. Adicione as variáveis ANTES das frases/palavras que devem ser faladas com aquela emoção
2. Use {{pausa curta}} entre frases para dar ritmo natural
3. Não exagere — use 3 a 6 variáveis para textos curtos, 6 a 12 para textos longos
4. Priorize: {{locução amigável}} ou {{locução cordial}} no início, {{tom entusiasmado}} para ofertas, {{pausa curta}} entre blocos, {{ênfase}} em palavras-chave
5. Retorne APENAS o texto modificado, sem explicações ou comentários
6. Mantenha o texto original intacto — apenas insira as variáveis nos pontos estratégicos
7. NÃO mude o conteúdo do texto, apenas adicione variáveis`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { text } = await req.json();

    if (!text || text.trim().length < 10) {
      return new Response(
        JSON.stringify({ error: "Texto muito curto. Digite pelo menos 10 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Enhancing text, length:", text.length);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA insuficientes." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro na API de IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const enhancedText = data.choices?.[0]?.message?.content?.trim();

    if (!enhancedText) {
      return new Response(
        JSON.stringify({ error: "IA não retornou texto" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Text enhanced successfully, new length:", enhancedText.length);

    return new Response(
      JSON.stringify({ enhancedText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Enhance text error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
