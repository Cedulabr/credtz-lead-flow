import { motion } from "framer-motion";
import { DollarSign, BarChart3 } from "lucide-react";
import { TelevendasStats } from "../hooks/useTelevendasStats";
import { formatCurrency } from "../utils";

interface ProductionBarProps {
  stats: TelevendasStats;
  isGestorOrAdmin: boolean;
}

export const ProductionBar = ({ stats, isGestorOrAdmin }: ProductionBarProps) => {
  const nonCancelledCount = stats.totalPropostas - (stats.pipelineCounts["cancelado_banco"] || 0);

  return (
    <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Produção do Mês
        </span>
        <span className="text-xs text-muted-foreground">({nonCancelledCount} propostas)</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2"
      >
        <DollarSign className="h-4 w-4 text-green-600 flex-shrink-0" />
        <div>
          <span className="text-[10px] text-muted-foreground">Total Bruto Pago ({stats.paidCount})</span>
          <p className="text-sm font-bold leading-tight">{formatCurrency(stats.totalBrutoPago)}</p>
        </div>
      </motion.div>

      {/* Top sellers */}
      {isGestorOrAdmin && stats.topSellers.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto pt-1 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">🏆 Ranking:</span>
          {stats.topSellers.map((seller, i) => (
            <span key={seller.name} className="text-[11px] font-medium bg-background px-2 py-0.5 rounded-full whitespace-nowrap border border-border/50">
              {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"} {seller.name} ({seller.count})
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
