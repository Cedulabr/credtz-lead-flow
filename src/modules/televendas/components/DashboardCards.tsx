import { useMemo } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Ban,
  Trash2,
  RotateCcw,
  TrendingUp,
  DollarSign
} from "lucide-react";
import { Televenda, STATUS_CONFIG } from "../types";
import { cn } from "@/lib/utils";

interface DashboardCardsProps {
  televendas: Televenda[];
  onFilterByStatus: (status: string) => void;
  selectedStatus?: string;
  isGestorOrAdmin: boolean;
}

interface StatCard {
  id: string;
  label: string;
  value: number;
  icon: React.ElementType;
  gradient: string;
  bgGradient: string;
  status?: string;
  pulse?: boolean;
  show: boolean;
  valuePrefix?: string;
}

export const DashboardCards = ({
  televendas,
  onFilterByStatus,
  selectedStatus,
  isGestorOrAdmin,
}: DashboardCardsProps) => {
  const stats = useMemo(() => {
    const uniqueCpfs = new Set(televendas.map((tv) => tv.cpf.replace(/\D/g, "")));
    
    // Count by status
    const statusCounts = televendas.reduce((acc, tv) => {
      acc[tv.status] = (acc[tv.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate total value of approved proposals
    const totalValueApproved = televendas
      .filter((tv) => tv.status === "proposta_paga")
      .reduce((sum, tv) => sum + (tv.parcela || 0), 0);

    return {
      total: televendas.length,
      uniqueClients: uniqueCpfs.size,
      totalValue: totalValueApproved,
      
      // Operational statuses
      solicitarDigitacao: statusCounts["solicitar_digitacao"] || 0,
      propostaDigitada: statusCounts["proposta_digitada"] || 0,
      pagoAguardando: statusCounts["pago_aguardando"] || 0,
      solicitarExclusao: statusCounts["solicitar_exclusao"] || 0,
      propostaPendente: statusCounts["proposta_pendente"] || 0,
      
      // Manager statuses
      propostaPaga: statusCounts["proposta_paga"] || 0,
      propostaCancelada: statusCounts["proposta_cancelada"] || 0,
      exclusaoAprovada: statusCounts["exclusao_aprovada"] || 0,
      exclusaoRejeitada: statusCounts["exclusao_rejeitada"] || 0,
      devolvido: statusCounts["devolvido"] || 0,
    };
  }, [televendas]);

  const cards: StatCard[] = [
    // Summary cards (always visible)
    {
      id: "total",
      label: "Total Propostas",
      value: stats.total,
      icon: FileText,
      gradient: "from-blue-500 to-blue-600",
      bgGradient: "from-blue-500/10 to-blue-600/5",
      status: "all",
      show: true,
    },
    {
      id: "clients",
      label: "Clientes Únicos",
      value: stats.uniqueClients,
      icon: Users,
      gradient: "from-indigo-500 to-indigo-600",
      bgGradient: "from-indigo-500/10 to-indigo-600/5",
      show: true,
    },
    {
      id: "totalValue",
      label: "Valor Aprovado",
      value: stats.totalValue,
      icon: DollarSign,
      gradient: "from-emerald-500 to-emerald-600",
      bgGradient: "from-emerald-500/10 to-emerald-600/5",
      valuePrefix: "R$ ",
      show: true,
    },
    
    // Approval statuses (gestor priority)
    {
      id: "pagoAguardando",
      label: "Aguardando Gestão",
      value: stats.pagoAguardando,
      icon: Clock,
      gradient: "from-amber-500 to-orange-500",
      bgGradient: "from-amber-500/10 to-orange-500/5",
      status: "pago_aguardando",
      pulse: stats.pagoAguardando > 0 && isGestorOrAdmin,
      show: isGestorOrAdmin,
    },
    {
      id: "solicitarExclusao",
      label: "Exclusão Solicitada",
      value: stats.solicitarExclusao,
      icon: Trash2,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-500/10 to-red-500/5",
      status: "solicitar_exclusao",
      pulse: stats.solicitarExclusao > 0 && isGestorOrAdmin,
      show: isGestorOrAdmin,
    },
    
    // Operational statuses
    {
      id: "solicitarDigitacao",
      label: "Sol. Digitação",
      value: stats.solicitarDigitacao,
      icon: TrendingUp,
      gradient: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-500/10 to-purple-600/5",
      status: "solicitar_digitacao",
      show: true,
    },
    {
      id: "propostaDigitada",
      label: "Digitadas",
      value: stats.propostaDigitada,
      icon: FileText,
      gradient: "from-sky-500 to-sky-600",
      bgGradient: "from-sky-500/10 to-sky-600/5",
      status: "proposta_digitada",
      show: true,
    },
    {
      id: "propostaPendente",
      label: "Pendentes",
      value: stats.propostaPendente,
      icon: AlertTriangle,
      gradient: "from-yellow-500 to-yellow-600",
      bgGradient: "from-yellow-500/10 to-yellow-600/5",
      status: "proposta_pendente",
      show: true,
    },
    
    // Final statuses
    {
      id: "propostaPaga",
      label: "Aprovadas",
      value: stats.propostaPaga,
      icon: CheckCircle2,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-500/10 to-emerald-500/5",
      status: "proposta_paga",
      show: true,
    },
    {
      id: "propostaCancelada",
      label: "Canceladas",
      value: stats.propostaCancelada,
      icon: XCircle,
      gradient: "from-red-500 to-red-600",
      bgGradient: "from-red-500/10 to-red-600/5",
      status: "proposta_cancelada",
      show: true,
    },
    {
      id: "devolvido",
      label: "Devolvidas",
      value: stats.devolvido,
      icon: RotateCcw,
      gradient: "from-slate-500 to-slate-600",
      bgGradient: "from-slate-500/10 to-slate-600/5",
      status: "devolvido",
      show: true,
    },
  ];

  const visibleCards = cards.filter((card) => card.show);

  const formatValue = (card: StatCard) => {
    if (card.valuePrefix) {
      return `${card.valuePrefix}${card.value.toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`;
    }
    return card.value;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {visibleCards.map((card, index) => {
        const Icon = card.icon;
        const isSelected = selectedStatus === card.status;
        const isClickable = !!card.status;

        return (
          <motion.button
            key={card.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => isClickable && onFilterByStatus(card.status!)}
            disabled={!isClickable}
            className={cn(
              "relative overflow-hidden rounded-2xl p-4 text-left transition-all",
              "bg-gradient-to-br border",
              card.bgGradient,
              isClickable && "cursor-pointer hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
              isSelected 
                ? "border-primary ring-2 ring-primary/30 shadow-lg" 
                : "border-border/50 hover:border-border",
              card.pulse && "animate-pulse ring-2 ring-amber-400/50"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground truncate">
                  {card.label}
                </p>
                <p className="text-xl font-bold tracking-tight truncate">
                  {formatValue(card)}
                </p>
              </div>
              <div
                className={cn(
                  "p-2 rounded-lg bg-gradient-to-br flex-shrink-0",
                  card.gradient
                )}
              >
                <Icon className="h-4 w-4 text-white" />
              </div>
            </div>

            {/* Selection indicator */}
            {isSelected && (
              <motion.div
                layoutId="selectedCard"
                className="absolute bottom-0 left-0 right-0 h-1 bg-primary"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
};
