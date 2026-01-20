import { motion } from "framer-motion";
import { FileText, Users, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SummaryCardsProps {
  totalPropostas: number;
  clientesUnicos: number;
  aguardandoGestao: number;
  pendentes: number;
}

export const SummaryCards = ({
  totalPropostas,
  clientesUnicos,
  aguardandoGestao,
  pendentes,
}: SummaryCardsProps) => {
  const cards = [
    {
      label: "Propostas",
      value: totalPropostas,
      icon: FileText,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-500/10 to-blue-600/10",
    },
    {
      label: "Clientes",
      value: clientesUnicos,
      icon: Users,
      gradient: "from-emerald-500 to-emerald-600",
      bgGradient: "from-emerald-500/10 to-emerald-600/10",
    },
    {
      label: "Aguardando",
      value: aguardandoGestao,
      icon: Clock,
      gradient: "from-amber-500 to-amber-600",
      bgGradient: "from-amber-500/10 to-amber-600/10",
      pulse: aguardandoGestao > 0,
    },
    {
      label: "Pendentes",
      value: pendentes,
      icon: AlertTriangle,
      gradient: "from-rose-500 to-rose-600",
      bgGradient: "from-rose-500/10 to-rose-600/10",
      pulse: pendentes > 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "relative overflow-hidden rounded-2xl p-4 md:p-5",
              "bg-gradient-to-br border border-border/50",
              card.bgGradient,
              card.pulse && "ring-2 ring-amber-400/50 animate-pulse"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </p>
                <p className="text-2xl md:text-3xl font-bold tracking-tight">
                  {card.value}
                </p>
              </div>
              <div className={cn(
                "p-2.5 md:p-3 rounded-xl bg-gradient-to-br",
                card.gradient
              )}>
                <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
