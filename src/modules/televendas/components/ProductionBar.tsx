import { useMemo } from "react";
import { motion } from "framer-motion";
import { DollarSign, BarChart3 } from "lucide-react";
import { Televenda } from "../types";
import { formatCurrency } from "../utils";

interface ProductionBarProps {
  televendas: Televenda[];
  isGestorOrAdmin: boolean;
  bankCalculationModel?: Record<string, string>;
}

export const ProductionBar = ({ televendas, isGestorOrAdmin }: ProductionBarProps) => {
  const production = useMemo(() => {
    const paid = televendas.filter((tv) => tv.status === "proposta_paga");
    const totalBrutoPago = paid.reduce((sum, tv) => sum + (tv.saldo_devedor || 0), 0);

    // Ranking by user (all non-cancelled)
    const nonCancelled = televendas.filter(
      (tv) => tv.status !== "proposta_cancelada" && tv.status !== "exclusao_aprovada"
    );

    const ranking = nonCancelled.reduce((acc, tv) => {
      const name = tv.user?.name || "Sem nome";
      if (!acc[name]) acc[name] = { count: 0 };
      acc[name].count += 1;
      return acc;
    }, {} as Record<string, { count: number }>);

    const topSellers = Object.entries(ranking)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return { totalBrutoPago, topSellers, totalPropostas: nonCancelled.length, paidCount: paid.length };
  }, [televendas]);

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Produção do Mês
        </span>
        <span className="text-xs text-muted-foreground">({production.totalPropostas} propostas)</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
        <div>
          <span className="text-[10px] text-muted-foreground">Total Bruto Pago ({production.paidCount})</span>
          <p className="text-sm font-bold leading-tight">{formatCurrency(production.totalBrutoPago)}</p>
        </div>
      </motion.div>

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
