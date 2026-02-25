import { useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, FileText, AlertTriangle, AlertCircle } from "lucide-react";
import { Televenda } from "../types";
import { formatCurrency } from "../utils";
import { calcDiasParado, getPriorityFromDays } from "./PriorityBadge";

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
    const paid = televendas.filter((tv) => tv.status === "proposta_paga");
    const totalBrutoPago = paid.reduce((sum, tv) => sum + (tv.saldo_devedor || 0), 0);

    const finalStatuses = ["proposta_paga", "proposta_cancelada", "exclusao_aprovada"];
    const active = televendas.filter((tv) => !finalStatuses.includes(tv.status));
    
    let criticos = 0;
    let alertas = 0;
    active.forEach((tv) => {
      const priority = tv.prioridade_operacional || getPriorityFromDays(calcDiasParado(tv.updated_at));
      if (priority === "critico") criticos++;
      else if (priority === "alerta") alertas++;
    });

    return {
      totalPropostas: televendas.length,
      totalBrutoPago,
      criticos,
      alertas,
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
      label: "Total Bruto Pago",
      value: formatCurrency(stats.totalBrutoPago),
      icon: DollarSign,
      gradient: "from-green-500 to-emerald-600",
      bg: "bg-green-500/10",
    },
    ...(stats.criticos > 0 ? [{
      label: "Propostas Críticas",
      value: String(stats.criticos),
      icon: AlertCircle,
      gradient: "from-red-500 to-red-600",
      bg: "bg-red-500/10",
    }] : []),
    ...(stats.alertas > 0 ? [{
      label: "Propostas em Alerta",
      value: String(stats.alertas),
      icon: AlertTriangle,
      gradient: "from-amber-500 to-amber-600",
      bg: "bg-amber-500/10",
    }] : []),
  ];

  return (
    <div className={`grid gap-3 ${cards.length <= 2 ? 'grid-cols-2' : cards.length === 3 ? 'grid-cols-3' : 'grid-cols-2 md:grid-cols-4'}`}>
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
