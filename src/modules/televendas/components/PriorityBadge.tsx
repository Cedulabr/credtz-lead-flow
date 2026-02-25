import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, CheckCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const PRIORITY_CONFIG = {
  critico: {
    label: "Crítico",
    emoji: "🔴",
    icon: AlertCircle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700",
    pulse: true,
  },
  alerta: {
    label: "Alerta",
    emoji: "🟡",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700",
    pulse: false,
  },
  normal: {
    label: "Normal",
    emoji: "🟢",
    icon: CheckCircle,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
    pulse: false,
  },
} as const;

interface PriorityBadgeProps {
  priority: string;
  diasParado?: number;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export function getPriorityFromDays(days: number): string {
  if (days > 10) return "critico";
  if (days > 5) return "alerta";
  return "normal";
}

export function calcDiasParado(updatedAt?: string): number {
  if (!updatedAt) return 0;
  const diff = Date.now() - new Date(updatedAt).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export const PriorityBadge = ({ priority, diasParado, size = "sm", showLabel = false }: PriorityBadgeProps) => {
  const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal;

  if (priority === "normal" && !showLabel) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border font-medium",
            config.bg,
            config.color,
            config.pulse && "animate-pulse",
            size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
          )}
        >
          <span>{config.emoji}</span>
          {showLabel && <span>{config.label}</span>}
          {diasParado !== undefined && diasParado > 5 && (
            <span className="font-bold">{diasParado}d</span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="font-semibold">{config.label}</p>
        {diasParado !== undefined && (
          <p className="text-xs text-muted-foreground">{diasParado} dias sem atualização</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
};
