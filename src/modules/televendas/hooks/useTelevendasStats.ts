import { useMemo } from "react";
import { Televenda } from "../types";
import { calcDiasParado, getPriorityFromDays } from "../components/PriorityBadge";
import { mapToPipelineStatus } from "../components/BankingPipeline";

export interface TelevendasStats {
  totalPropostas: number;
  totalBrutoPago: number;
  paidCount: number;
  criticos: number;
  alertas: number;
  pipelineCounts: Record<string, number>;
  topSellers: { name: string; count: number }[];
  totalPropostasAtivas: number;
}

/**
 * Centralized stats hook — single pass over televendas array.
 * Replaces redundant loops in DashboardCards, BankingPipeline,
 * StalledAlertBanner, and ProductionBar.
 */
export function useTelevendasStats(
  televendas: Televenda[],
  bankCalculationModel?: Record<string, string>
): TelevendasStats {
  return useMemo(() => {
    const finalStatuses = ["proposta_paga", "proposta_cancelada", "exclusao_aprovada"];
    const pipelineCounts: Record<string, number> = {};
    const rankingMap: Record<string, number> = {};

    let totalBrutoPago = 0;
    let paidCount = 0;
    let criticos = 0;
    let alertas = 0;
    let totalPropostasAtivas = 0;

    for (const tv of televendas) {
      // Pipeline counts
      const pipelineStatus = mapToPipelineStatus(tv);
      pipelineCounts[pipelineStatus] = (pipelineCounts[pipelineStatus] || 0) + 1;

      // Paid stats — use parcela when bank model is 'valor_bruto', else saldo_devedor
      if (tv.status === "proposta_paga") {
        paidCount++;
        const model = bankCalculationModel?.[tv.banco];
        if (model === "valor_bruto") {
          totalBrutoPago += tv.parcela || 0;
        } else {
          totalBrutoPago += tv.saldo_devedor || 0;
        }
      }

      // Priority counts (non-final only)
      if (!finalStatuses.includes(tv.status)) {
        totalPropostasAtivas++;
        const dias = calcDiasParado(tv.updated_at);
        const prio = tv.prioridade_operacional || getPriorityFromDays(dias);
        if (prio === "critico") criticos++;
        else if (prio === "alerta") alertas++;
      }

      // Ranking (non-cancelled)
      if (tv.status !== "proposta_cancelada" && tv.status !== "exclusao_aprovada") {
        const name = tv.user?.name || "Sem nome";
        rankingMap[name] = (rankingMap[name] || 0) + 1;
      }
    }

    const topSellers = Object.entries(rankingMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalPropostas: televendas.length,
      totalBrutoPago,
      paidCount,
      criticos,
      alertas,
      pipelineCounts,
      topSellers,
      totalPropostasAtivas,
    };
  }, [televendas, bankCalculationModel]);
}
