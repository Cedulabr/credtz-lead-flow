import { Info, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldHintProps {
  type?: "info" | "warning" | "success" | "tip";
  children: React.ReactNode;
  className?: string;
}

export function FieldHint({ type = "info", children, className }: FieldHintProps) {
  const config = {
    info: {
      icon: Info,
      bg: "bg-blue-50 border-blue-200",
      text: "text-blue-700",
      iconColor: "text-blue-500"
    },
    warning: {
      icon: AlertTriangle,
      bg: "bg-amber-50 border-amber-200",
      text: "text-amber-700",
      iconColor: "text-amber-500"
    },
    success: {
      icon: CheckCircle,
      bg: "bg-green-50 border-green-200",
      text: "text-green-700",
      iconColor: "text-green-500"
    },
    tip: {
      icon: Lightbulb,
      bg: "bg-purple-50 border-purple-200",
      text: "text-purple-700",
      iconColor: "text-purple-500"
    }
  };

  const { icon: Icon, bg, text, iconColor } = config[type];

  return (
    <div className={cn(
      "flex items-start gap-2 p-3 rounded-lg border text-sm",
      bg,
      text,
      className
    )}>
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconColor)} />
      <span>{children}</span>
    </div>
  );
}
