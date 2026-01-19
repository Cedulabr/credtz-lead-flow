import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, CheckCircle, Clock, Send } from "lucide-react";

interface SimulationStats {
  pending: number;
  completed: number;
  awaiting: number;
}

interface SimulationSummaryCardsProps {
  stats: SimulationStats;
  isGestorOrAdmin: boolean;
}

export function SimulationSummaryCards({ stats, isGestorOrAdmin }: SimulationSummaryCardsProps) {
  const cards = isGestorOrAdmin
    ? [
        {
          title: "Simulações Pendentes",
          value: stats.pending,
          icon: Clock,
          color: "from-amber-500 to-orange-500",
          bgColor: "bg-gradient-to-br from-amber-50 to-orange-50",
          pulse: stats.pending > 0,
        },
        {
          title: "Aguardando Confirmação",
          value: stats.completed,
          icon: Send,
          color: "from-blue-500 to-indigo-500",
          bgColor: "bg-gradient-to-br from-blue-50 to-indigo-50",
          pulse: false,
        },
        {
          title: "Confirmadas",
          value: stats.awaiting,
          icon: CheckCircle,
          color: "from-emerald-500 to-green-500",
          bgColor: "bg-gradient-to-br from-emerald-50 to-green-50",
          pulse: false,
        },
      ]
    : [
        {
          title: "Minhas Solicitações",
          value: stats.pending,
          icon: BarChart3,
          color: "from-violet-500 to-purple-500",
          bgColor: "bg-gradient-to-br from-violet-50 to-purple-50",
          pulse: false,
        },
        {
          title: "Prontas p/ Confirmar",
          value: stats.completed,
          icon: Send,
          color: "from-emerald-500 to-green-500",
          bgColor: "bg-gradient-to-br from-emerald-50 to-green-50",
          pulse: stats.completed > 0,
        },
      ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className={`${card.bgColor} border-0 shadow-sm overflow-hidden relative`}>
            {card.pulse && card.value > 0 && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r opacity-20"
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 2, repeat: Infinity }}
                style={{
                  background: `linear-gradient(135deg, var(--tw-gradient-from), var(--tw-gradient-to))`,
                }}
              />
            )}
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-gradient-to-r ${card.color} shadow-lg`}>
                  <card.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                  <p className="text-xs text-gray-600">{card.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
