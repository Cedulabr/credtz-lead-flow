import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Televenda } from "../types";
import { calcDiasParado, getPriorityFromDays } from "./PriorityBadge";

// Simplified 6-status pipeline matching the reference system
export const BANKING_STATUS_CONFIG: Record<string, {
  label: string;
  shortLabel: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  activeBg: string;
}> = {
  aguardando_digitacao: {
    label: "Aguardando Digitação",
    shortLabel: "Aguard. Dig.",
    emoji: "📝",
    color: "text-purple-700",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200 dark:border-purple-700",
    activeBg: "bg-purple-100 dark:bg-purple-800/40",
  },
  bloqueado: {
    label: "Benefício Bloqueado",
    shortLabel: "Bloqueado",
    emoji: "🔒",
    color: "text-red-700",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-700",
    activeBg: "bg-red-100 dark:bg-red-800/40",
  },
  em_andamento: {
    label: "Em Andamento",
    shortLabel: "Em Andamento",
    emoji: "⏳",
    color: "text-amber-700",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-700",
    activeBg: "bg-amber-100 dark:bg-amber-800/40",
  },
  pendente: {
    label: "Pendência",
    shortLabel: "Pendente",
    emoji: "📋",
    color: "text-orange-700",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-700",
    activeBg: "bg-orange-100 dark:bg-orange-800/40",
  },
  pago_cliente: {
    label: "Pago ao Cliente",
    shortLabel: "Pago",
    emoji: "✅",
    color: "text-green-700",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-700",
    activeBg: "bg-green-100 dark:bg-green-800/40",
  },
  cancelado_banco: {
    label: "Cancelados",
    shortLabel: "Cancelado",
    emoji: "❌",
    color: "text-red-800",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-300 dark:border-red-600",
    activeBg: "bg-red-100 dark:bg-red-800/40",
  },
};

export const BANKING_STATUS_OPTIONS = Object.entries(BANKING_STATUS_CONFIG).map(([value, config]) => ({
  value,
  label: config.label,
  emoji: config.emoji,
}));

const PRIORITY_FILTER_CONFIG = {
  alerta: {
    label: "Alerta",
    emoji: "🟡",
    color: "text-amber-700",
    bgColor: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-amber-200 dark:border-amber-700",
    activeBg: "bg-amber-100 dark:bg-amber-800/40",
  },
  critico: {
    label: "Crítico",
    emoji: "🔴",
    color: "text-red-700",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-700",
    activeBg: "bg-red-100 dark:bg-red-800/40",
  },
};

interface BankingPipelineProps {
  televendas: Televenda[];
  onFilterByBankStatus: (status: string) => void;
  selectedBankStatus?: string;
  onFilterByPriority?: (priority: string) => void;
  selectedPriority?: string;
}

export const BankingPipeline = ({ televendas, onFilterByBankStatus, selectedBankStatus, onFilterByPriority, selectedPriority }: BankingPipelineProps) => {
  // Map commercial status to banking pipeline status
  // Commercial status takes priority to avoid misclassification
  const mapToPipelineStatus = (tv: Televenda): string => {
    // Commercial status always takes priority
    switch (tv.status) {
      case "solicitar_digitacao":
        return "aguardando_digitacao";
      case "bloqueado":
        return "bloqueado";
      case "em_andamento":
        return "em_andamento";
      case "proposta_pendente":
      case "devolvido":
        return "pendente";
      case "proposta_paga":
      case "pago_aguardando":
        return "pago_cliente";
      case "proposta_cancelada":
      case "cancelado_aguardando":
      case "exclusao_aprovada":
        return "cancelado_banco";
      default:
        // Fallback to status_bancario if set, otherwise em_andamento
        if (tv.status_bancario && BANKING_STATUS_CONFIG[tv.status_bancario]) {
          return tv.status_bancario;
        }
        return "em_andamento";
    }
  };

  const stats = useMemo(() => {
    const byStatus = televendas.reduce((acc, tv) => {
      const status = mapToPipelineStatus(tv);
      if (!acc[status]) acc[status] = { count: 0 };
      acc[status].count += 1;
      return acc;
    }, {} as Record<string, { count: number }>);

    return Object.entries(BANKING_STATUS_CONFIG).map(([key, config]) => ({
      key,
      ...config,
      count: byStatus[key]?.count || 0,
    }));
  }, [televendas]);

  // Priority counts for active proposals
  const priorityCounts = useMemo(() => {
    const finalStatuses = ["proposta_paga", "proposta_cancelada", "exclusao_aprovada"];
    let alertas = 0;
    let criticos = 0;
    televendas.forEach((tv) => {
      if (finalStatuses.includes(tv.status)) return;
      const dias = calcDiasParado(tv.updated_at);
      const prio = tv.prioridade_operacional || getPriorityFromDays(dias);
      if (prio === "critico") criticos++;
      else if (prio === "alerta") alertas++;
    });
    return { alerta: alertas, critico: criticos };
  }, [televendas]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pipeline Operacional</span>
        <div className="flex items-center gap-2">
          {(selectedBankStatus || selectedPriority) && (
            <button
              onClick={() => {
                onFilterByBankStatus("all");
                onFilterByPriority?.("all");
              }}
              className="text-xs text-primary hover:underline"
            >
              Limpar filtro
            </button>
          )}
        </div>
      </div>

      {/* Priority filter pills */}
      {(priorityCounts.alerta > 0 || priorityCounts.critico > 0) && (
        <div className="flex gap-2">
          {(Object.entries(PRIORITY_FILTER_CONFIG) as [string, typeof PRIORITY_FILTER_CONFIG["alerta"]][]).map(([key, config]) => {
            const count = priorityCounts[key as keyof typeof priorityCounts];
            if (count === 0) return null;
            const isSelected = selectedPriority === key;
            return (
              <motion.button
                key={key}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => onFilterByPriority?.(isSelected ? "all" : key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold border transition-all",
                  "cursor-pointer hover:shadow-sm active:scale-[0.98]",
                  isSelected
                    ? `${config.activeBg} ${config.borderColor} ring-2 ring-offset-1 ${key === "critico" ? "ring-red-400" : "ring-amber-400"} shadow-md`
                    : `${config.bgColor} ${config.borderColor}`,
                  key === "critico" && "animate-pulse"
                )}
              >
                <span className="text-lg">{config.emoji}</span>
                <span className={config.color}>{config.label}</span>
                <span className={cn(
                  "ml-1 px-2 py-0.5 rounded-full text-xs font-bold",
                  key === "critico" ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200" : "bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200"
                )}>
                  {count}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {stats.map((item, index) => {
          const isSelected = selectedBankStatus === item.key;
          const hasItems = item.count > 0;
          return (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onFilterByBankStatus(item.key)}
              className={cn(
                "flex-shrink-0 rounded-xl px-4 py-2.5 text-left transition-all border",
                "cursor-pointer hover:shadow-sm active:scale-[0.98]",
                "min-w-[130px]",
                isSelected ? `${item.activeBg} ${item.borderColor} ring-1 ring-primary/30 shadow-sm` : `${item.bgColor} ${item.borderColor}`,
                !hasItems && "opacity-60"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{item.emoji}</span>
                <span className={cn("text-xs font-medium leading-tight", item.color)}>
                  {item.shortLabel}
                </span>
              </div>
              <p className={cn("text-lg font-bold mt-1", item.color)}>
                {item.count}
                <span className="text-[10px] font-normal ml-1 text-muted-foreground">contrato{item.count !== 1 ? "s" : ""}</span>
              </p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
