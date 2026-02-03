import { Badge } from "@/components/ui/badge";
import { PIPELINE_STAGES } from "../types";
import { cn } from "@/lib/utils";
import { 
  Sparkles, TrendingUp, Clock, CheckCircle, XCircle, 
  Calendar, UserX, Ban, PhoneOff, MessageCircle 
} from "lucide-react";

interface LeadStatusBadgeProps {
  status: string;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

// Map status to icons
const STATUS_ICONS: Record<string, React.ElementType> = {
  new_lead: Sparkles,
  em_andamento: TrendingUp,
  aguardando_retorno: Clock,
  agendamento: Calendar,
  cliente_fechado: CheckCircle,
  contato_futuro: Calendar,
  recusou_oferta: XCircle,
  sem_interesse: Ban,
  nao_e_cliente: UserX,
  sem_retorno: PhoneOff,
  nao_e_whatsapp: MessageCircle
};

export function LeadStatusBadge({ status, size = "md", showIcon = true }: LeadStatusBadgeProps) {
  const config = PIPELINE_STAGES[status];
  
  if (!config) {
    return (
      <Badge variant="outline" className="capitalize">
        {status.replace(/_/g, " ")}
      </Badge>
    );
  }

  const Icon = STATUS_ICONS[status];
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5"
  };

  return (
    <Badge 
      variant="outline"
      className={cn(
        "border font-medium transition-all",
        config.bgColor,
        config.borderColor,
        config.textColor,
        sizeClasses[size]
      )}
    >
      {showIcon && Icon && (
        <Icon className={cn(
          "mr-1.5",
          size === "sm" ? "h-3 w-3" : size === "lg" ? "h-5 w-5" : "h-4 w-4"
        )} />
      )}
      {config.label}
    </Badge>
  );
}
