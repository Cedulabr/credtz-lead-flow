import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, DollarSign, Clock, Target, BarChart3 } from "lucide-react";
import { Televenda } from "../types";
import { formatCurrency } from "../utils";

interface ProductionBarProps {
  televendas: Televenda[];
  isGestorOrAdmin: boolean;
}

export const ProductionBar = ({ televendas, isGestorOrAdmin }: ProductionBarProps) => {
  const production = useMemo(() => {
    const nonCancelled = televendas.filter(
      (tv) => tv.status !== "proposta_cancelada" && tv.status !== "exclusao_aprovada"
    );
    const approved = televendas.filter((tv) => tv.status === "proposta_paga");
    const awaitingBalance = televendas.filter(
      (tv) => (tv as any).status_bancario === "em_andamento"
    );
    const totalBruto = nonCancelled.reduce((sum, tv) => sum + (tv.parcela || 0), 0);
    const totalAprovado = approved.reduce((sum, tv) => sum + (tv.parcela || 0), 0);
    const totalAguardando = awaitingBalance.reduce((sum, tv) => sum + (tv.parcela || 0), 0);
    const ticketMedio = nonCancelled.length > 0 ? totalBruto / nonCancelled.length : 0;

    // Ranking by user
    const ranking = nonCancelled.reduce((acc, tv) => {
      const name = tv.user?.name || "Sem nome";
      if (!acc[name]) acc[name] = { count: 0, value: 0 };
      acc[name].count += 1;
      acc[name].value += tv.parcela || 0;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    const topSellers = Object.entries(ranking)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return { totalBruto, totalAprovado, totalAguardando, ticketMedio, topSellers, totalPropostas: nonCancelled.length };
  }, [televendas]);

  const metrics = [
    {
      label: "Total Bruto",
      value: formatCurrency(production.totalBruto),
      icon: DollarSign,
      color: "text-blue-600",
    },
    {
      label: "Aprovado",
      value: formatCurrency(production.totalAprovado),
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      label: "Aguardando Saldo",
      value: formatCurrency(production.totalAguardando),
      icon: Clock,
      color: "text-amber-600",
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(production.ticketMedio),
      icon: Target,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Produção do Mês
        </span>
        <span className="text-xs text-muted-foreground">({production.totalPropostas} propostas)</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-2"
            >
              <Icon className={`h-4 w-4 ${m.color} flex-shrink-0`} />
              <div>
                <span className="text-[10px] text-muted-foreground">{m.label}</span>
                <p className="text-sm font-bold leading-tight">{m.value}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Top sellers */}
      {isGestorOrAdmin && production.topSellers.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pt-1 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">🏆 Ranking:</span>
          {production.topSellers.map((seller, i) => (
            <span key={seller.name} className="text-[11px] font-medium bg-background px-2 py-0.5 rounded-full whitespace-nowrap border border-border/50">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {seller.name} ({seller.count})
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
