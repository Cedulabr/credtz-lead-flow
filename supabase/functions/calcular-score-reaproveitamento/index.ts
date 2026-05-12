import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MOTIVO_WEIGHT: Record<string, number> = {
  "Preço": 1.0,
  "Sem retorno do cliente": 0.9,
  "Documentação": 0.7,
  "Cliente desistiu": 0.5,
  "Margem insuficiente": 0.4,
  "Concorrente": 0.2,
  "Outro": 0.5,
};

function brl(v: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v || 0);
}

function chanceLabel(score: number): string {
  if (score >= 80) return "alta chance de retorno";
  if (score >= 60) return "média chance de retorno";
  return "baixa chance de retorno";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { proposta_id } = await req.json();
    if (!proposta_id || typeof proposta_id !== "string") {
      return new Response(
        JSON.stringify({ error: "proposta_id obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: prop, error } = await supabase
      .from("televendas")
      .select("id, nome, troco, saldo_devedor, motivo_cancelamento, data_cancelamento, created_at")
      .eq("id", proposta_id)
      .maybeSingle();

    if (error || !prop) {
      return new Response(
        JSON.stringify({ error: error?.message || "proposta não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const valor = Number(prop.troco ?? prop.saldo_devedor ?? 0);
    const valorNorm = Math.min(valor / 10000, 1);

    const cancelDate = prop.data_cancelamento
      ? new Date(prop.data_cancelamento as string)
      : new Date(prop.created_at as string);
    const dias = Math.max(
      0,
      Math.floor((Date.now() - cancelDate.getTime()) / 86400000),
    );
    const tempoNorm = Math.max(0, 1 - dias / 90);

    const motivo = (prop.motivo_cancelamento as string) || "Outro";
    const motivoPeso = MOTIVO_WEIGHT[motivo] ?? 0.5;

    const score = Math.round(
      40 * valorNorm + 30 * tempoNorm + 30 * motivoPeso,
    );

    const justificativa =
      `Valor ${brl(valor)}, cancelada há ${dias} dia(s)` +
      ` por "${motivo}" — ${chanceLabel(score)}.`;

    await supabase
      .from("televendas")
      .update({
        reativacao_score: score,
        reativacao_justificativa: justificativa,
      })
      .eq("id", proposta_id);

    return new Response(
      JSON.stringify({ score, justificativa }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
