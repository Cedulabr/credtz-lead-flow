import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PropostaCancelada } from "../types";

export function useReaproveitamento() {
  return useQuery({
    queryKey: ["reaproveitamento"],
    queryFn: async (): Promise<PropostaCancelada[]> => {
      const { data, error } = await supabase
        .from("televendas")
        .select(
          "id,nome,cpf,banco,tipo_operacao,troco,saldo_devedor,status,data_cancelamento,motivo_cancelamento,reativacao_score,reativacao_justificativa,created_at,user_id,company_id,observacao,telefone",
        )
        .eq("status", "proposta_cancelada")
        .order("data_cancelamento", { ascending: false, nullsFirst: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as PropostaCancelada[];
    },
  });
}

export function useReativadasHoje() {
  return useQuery({
    queryKey: ["reaproveitamento", "reativadas-hoje"],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { count, error } = await supabase
        .from("televendas")
        .select("id", { count: "exact", head: true })
        .eq("status", "reativada")
        .gte("reativada_em", start.toISOString());
      if (error) throw error;
      return count ?? 0;
    },
  });
}

export function useReativarProposta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (proposta: PropostaCancelada) => {
      const { error } = await supabase
        .from("televendas")
        .update({
          status: "reativada",
          reativada_em: new Date().toISOString(),
          status_updated_at: new Date().toISOString(),
        })
        .eq("id", proposta.id);
      if (error) throw error;

      await supabase.from("televendas_status_history").insert({
        televendas_id: proposta.id,
        from_status: "proposta_cancelada",
        to_status: "reativada",
        reason: "Reativada via módulo Reaproveitamento",
      });

      return proposta;
    },
    onSuccess: (proposta) => {
      toast.success(
        `Proposta de ${proposta.nome} reativada! Disponível em Gestão de Televendas.`,
      );
      qc.invalidateQueries({ queryKey: ["reaproveitamento"] });
      qc.invalidateQueries({ queryKey: ["televendas"] });
    },
    onError: (e: Error) => {
      toast.error(`Erro ao reativar: ${e.message}`);
    },
  });
}

export function useRecalcularScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (propostaId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "calcular-score-reaproveitamento",
        { body: { proposta_id: propostaId } },
      );
      if (error) throw error;
      return data as { score: number; justificativa: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reaproveitamento"] });
    },
  });
}
