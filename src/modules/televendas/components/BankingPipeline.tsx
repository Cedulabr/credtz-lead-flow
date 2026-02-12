import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Televenda } from "../types";

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

interface BankingPipelineProps {
  televendas: Televenda[];
  onFilterByBankStatus: (status: string) => void;
  selectedBankStatus?: string;
}

export const BankingPipeline = ({ televendas, onFilterByBankStatus, selectedBankStatus }: BankingPipelineProps) => {
  const stats = useMemo(() => {
    const byStatus = televendas.reduce((acc, tv) => {
      const status = (tv as any).status_bancario || "aguardando_digitacao";
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pipeline Operacional</span>
        {selectedBankStatus && (
          <button
            onClick={() => onFilterByBankStatus("all")}
            className="text-xs text-primary hover:underline"
          >
            Limpar filtro
          </button>
        )}
      </div>
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
