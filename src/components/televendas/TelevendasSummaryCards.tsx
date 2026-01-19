import { motion } from "framer-motion";
import { 
  FileText, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  TrendingUp
} from "lucide-react";

interface SummaryCardsProps {
  totalPropostas: number;
  clientesUnicos: number;
  aguardandoGestao: number;
  pendentes: number;
  pagosAprovados: number;
  cancelados: number;
  isGestorOrAdmin: boolean;
}

export const TelevendasSummaryCards = ({
  totalPropostas,
  clientesUnicos,
  aguardandoGestao,
  pendentes,
  pagosAprovados,
  cancelados,
  isGestorOrAdmin
}: SummaryCardsProps) => {
  const cards = [
    {
      label: "Total Propostas",
      value: totalPropostas,
      icon: FileText,
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-600",
      show: true
    },
    {
      label: "Clientes Únicos",
      value: clientesUnicos,
      icon: Users,
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-600",
      show: true
    },
    {
      label: "Aguardando Gestão",
      value: aguardandoGestao,
      icon: Clock,
      color: "from-amber-500 to-orange-500",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-600",
      show: isGestorOrAdmin,
      highlight: aguardandoGestao > 0
    },
    {
      label: "Pendências",
      value: pendentes,
      icon: AlertTriangle,
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-500/10",
      textColor: "text-yellow-600",
      show: true
    },
    {
      label: "Aprovados",
      value: pagosAprovados,
      icon: CheckCircle2,
      color: "from-green-500 to-emerald-500",
      bgColor: "bg-green-500/10",
      textColor: "text-green-600",
      show: true
    },
    {
      label: "Cancelados",
      value: cancelados,
      icon: XCircle,
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-500/10",
      textColor: "text-red-600",
      show: true
    }
  ];

  const visibleCards = cards.filter(c => c.show);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {visibleCards.map((card, index) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`
            relative overflow-hidden rounded-xl p-4 
            ${card.bgColor} border border-border/50
            transition-all duration-300 hover:scale-[1.02] hover:shadow-lg
            ${card.highlight ? 'ring-2 ring-amber-500/50 animate-pulse' : ''}
          `}
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{card.label}</p>
              <p className={`text-2xl font-bold ${card.textColor}`}>{card.value}</p>
            </div>
            <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color}`}>
              <card.icon className="h-4 w-4 text-white" />
            </div>
          </div>
          
          {/* Decorative gradient */}
          <div className={`absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${card.color} opacity-10 blur-xl`} />
        </motion.div>
      ))}
    </div>
  );
};
