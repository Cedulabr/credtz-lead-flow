import { useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, FileText } from "lucide-react";
import { Televenda } from "../types";
import { formatCurrency } from "../utils";

interface DashboardCardsProps {
  televendas: Televenda[];
  onFilterByStatus: (status: string) => void;
  selectedStatus?: string;
  isGestorOrAdmin: boolean;
  dateMode: string;
  bankCalculationModel?: Record<string, string>;
  bankCommissionRate?: Record<string, number>;
}

export const DashboardCards = ({
  televendas,
}: DashboardCardsProps) => {
  const stats = useMemo(() => {
    const nonCancelled = televendas.filter(
      (tv) => tv.status !== "proposta_cancelada" && tv.status !== "exclusao_aprovada"
    );

    const totalBruto = nonCancelled.reduce((sum, tv) => sum + (tv.saldo_devedor || 0), 0);

    return {
      totalPropostas: televendas.length,
      totalBruto,
    };
  }, [televendas]);

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
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
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
