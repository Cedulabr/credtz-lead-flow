import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Televenda } from "../types";
import { formatCurrency } from "../utils";

export const BANKING_STATUS_CONFIG: Record<string, {
  label: string;
  shortLabel: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  aguardando_digitacao: {
    label: "Aguardando Digitação",
    shortLabel: "Aguard. Dig.",
    emoji: "📝",
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-300",
  },
  digitado_formalizacao: {
    label: "Digitado / Aguardando Formalização",
    shortLabel: "Formalização",
    emoji: "✍️",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-300",
  },
  beneficio_bloqueado: {
    label: "Benefício Bloqueado",
    shortLabel: "Bloqueado",
    emoji: "🔒",
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-300",
  },
  aguardando_pagamento: {
    label: "Aguardando Pagamento Cliente",
    shortLabel: "Aguard. Pgto",
    emoji: "💰",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-300",
  },
  inconsistencia_banco: {
    label: "Inconsistências no Banco",
    shortLabel: "Inconsistência",
    emoji: "⚠️",
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-300",
  },
  pago_cliente: {
    label: "Pago ao Cliente",
    shortLabel: "Pago",
    emoji: "✅",
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-300",
  },
  aguardando_comissao: {
    label: "Aguardando Comissão",
    shortLabel: "Aguard. Comissão",
    emoji: "🏦",
    color: "text-indigo-600",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-300",
  },
  pendencia_bancaria: {
    label: "Pendência Bancária",
    shortLabel: "Pendência",
    emoji: "📋",
    color: "text-yellow-700",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-300",
  },
  cancelado_banco: {
    label: "Cancelados",
    shortLabel: "Cancelado",
    emoji: "❌",
    color: "text-red-700",
    bgColor: "bg-red-600/10",
    borderColor: "border-red-400",
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
    const total = televendas.length;
    const byStatus = televendas.reduce((acc, tv) => {
      const status = (tv as any).status_bancario || "aguardando_digitacao";
      if (!acc[status]) acc[status] = { count: 0, value: 0 };
      acc[status].count += 1;
      acc[status].value += tv.parcela || 0;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    return Object.entries(BANKING_STATUS_CONFIG).map(([key, config]) => ({
      key,
      ...config,
      count: byStatus[key]?.count || 0,
      value: byStatus[key]?.value || 0,
      percentage: total > 0 ? Math.round(((byStatus[key]?.count || 0) / total) * 100) : 0,
    }));
  }, [televendas]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-muted-foreground">📊 Status Operacional Bancário</span>
        {selectedBankStatus && (
          <button
            onClick={() => onFilterByBankStatus("all")}
            className="text-xs text-primary hover:underline"
          >
            Limpar filtro
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {stats.map((item, index) => {
          const isSelected = selectedBankStatus === item.key;
          return (
            <motion.button
              key={item.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onFilterByBankStatus(item.key)}
              className={cn(
                "relative rounded-xl p-3 text-left transition-all border",
                item.bgColor, item.borderColor,
                "cursor-pointer hover:scale-[1.02] hover:shadow-md active:scale-[0.98]",
                isSelected && "ring-2 ring-primary/40 shadow-lg"
              )}
            >
              <p className="text-lg mb-0.5">{item.emoji}</p>
              <p className="text-[10px] font-medium text-muted-foreground leading-tight truncate">
                {item.shortLabel}
              </p>
              <p className="text-lg font-bold mt-1">{item.count}</p>
              <p className="text-[10px] text-muted-foreground">
                {item.percentage}%
              </p>
              {isSelected && (
                <motion.div layoutId="bankSelected" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-b-xl" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
