import { useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, FileText, Target, TrendingUp, Receipt } from "lucide-react";
import { Televenda, DateMode } from "../types";
import { formatCurrency } from "../utils";

interface DashboardCardsProps {
  televendas: Televenda[];
  onFilterByStatus: (status: string) => void;
  selectedStatus?: string;
  isGestorOrAdmin: boolean;
  dateMode: DateMode;
  bankCalculationModel?: Record<string, string>;
  bankCommissionRate?: Record<string, number>;
}

/**
 * For portabilidade: use saldo_devedor or parcela depending on bank's calculation_model.
 * For other operations: always use parcela (valor liberado).
 */
function getBaseValue(tv: Televenda, bankCalcModel: Record<string, string>): number {
  if (tv.tipo_operacao === "Portabilidade") {
    const model = bankCalcModel[tv.banco];
    if (model === "saldo_devedor" && tv.saldo_devedor && tv.saldo_devedor > 0) {
      return tv.saldo_devedor;
    }
    // Default to parcela (valor_bruto)
    return tv.parcela || 0;
  }
  return tv.parcela || 0;
}

function getCommissionValue(tv: Televenda, bankCalcModel: Record<string, string>, bankCommRate: Record<string, number>): number {
  const rate = bankCommRate[tv.banco];
  if (!rate) return (tv.parcela || 0) * 0.08; // default 8%
  
  const base = getBaseValue(tv, bankCalcModel);
  return base * (rate / 100);
}

export const DashboardCards = ({
  televendas,
  bankCalculationModel = {},
  bankCommissionRate = {},
}: DashboardCardsProps) => {
  const stats = useMemo(() => {
    const nonCancelled = televendas.filter(
      (tv) => tv.status !== "proposta_cancelada" && tv.status !== "exclusao_aprovada"
    );
    const approved = televendas.filter((tv) => tv.status === "proposta_paga");
    
    const totalBruto = nonCancelled.reduce((sum, tv) => sum + getBaseValue(tv, bankCalculationModel), 0);
    const totalAprovado = approved.reduce((sum, tv) => sum + getBaseValue(tv, bankCalculationModel), 0);
    const ticketMedio = nonCancelled.length > 0 ? totalBruto / nonCancelled.length : 0;
    const comissaoPrevista = approved.reduce((sum, tv) => sum + getCommissionValue(tv, bankCalculationModel, bankCommissionRate), 0);

    return {
      totalPropostas: televendas.length,
      totalBruto,
      totalAprovado,
      comissaoPrevista,
      ticketMedio,
    };
  }, [televendas, bankCalculationModel, bankCommissionRate]);

  const cards = [
    {
      label: "Total Propostas",
      value: String(stats.totalPropostas),
      icon: FileText,
      gradient: "from-blue-500 to-blue-600",
      bg: "bg-blue-500/10",
    },
    {
      label: "Total Bruto",
      value: formatCurrency(stats.totalBruto),
      icon: DollarSign,
      gradient: "from-indigo-500 to-indigo-600",
      bg: "bg-indigo-500/10",
    },
    {
      label: "Valor Aprovado",
      value: formatCurrency(stats.totalAprovado),
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-600",
      bg: "bg-green-500/10",
    },
    {
      label: "Comissão Prevista",
      value: formatCurrency(stats.comissaoPrevista),
      icon: Receipt,
      gradient: "from-amber-500 to-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(stats.ticketMedio),
      icon: Target,
      gradient: "from-purple-500 to-purple-600",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`rounded-xl p-3 border border-border/50 ${card.bg}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg bg-gradient-to-br ${card.gradient}`}>
                <Icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-lg font-bold tracking-tight">{card.value}</p>
          </motion.div>
        );
      })}
    </div>
  );
};
