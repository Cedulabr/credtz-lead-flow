import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, Package, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ActivateLead, ACTIVATE_STATUS_CONFIG } from "../types";
import { cn } from "@/lib/utils";

interface ActivateLeadCardProps {
  lead: ActivateLead;
  onClick: (lead: ActivateLead) => void;
  onDragStart?: (e: React.DragEvent, leadId: string) => void;
  isDragging?: boolean;
  showWorkedTime?: boolean;
}

export function ActivateLeadCard({ lead, onClick, onDragStart, isDragging, showWorkedTime }: ActivateLeadCardProps) {
  const statusConfig = ACTIVATE_STATUS_CONFIG[lead.status];

  const formatPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return phone;
  };

  const getWorkedTimeLabel = () => {
    const now = new Date();
    const updated = new Date(lead.updated_at);
    const diffMs = now.getTime() - updated.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "agora mesmo";
    if (diffMin < 60) return `há ${diffMin}min`;
    const diffH = Math.floor(diffMin / 60);
    const remMin = diffMin % 60;
    return remMin > 0 ? `há ${diffH}h ${remMin}min` : `há ${diffH}h`;
  };

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer hover:shadow-md transition-all border",
        isDragging && "opacity-50 ring-2 ring-primary",
        statusConfig?.borderColor || "border-border"
      )}
      onClick={() => onClick(lead)}
      draggable
      onDragStart={(e) => onDragStart?.(e, lead.id)}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn("h-2 w-2 rounded-full flex-shrink-0", statusConfig?.dotColor || "bg-gray-400")} />
            <p className="font-medium text-sm truncate">{lead.nome}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <Clock className="h-3 w-3" />
          <span>Tratado {getWorkedTimeLabel()}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3 w-3" />
          <span>{formatPhone(lead.telefone)}</span>
        </div>

        {lead.cpf && (
          <p className="text-[10px] text-muted-foreground font-mono">
            CPF: {lead.cpf}
          </p>
        )}

        {lead.produto && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Package className="h-3 w-3" />
            <span className="truncate">{lead.produto}</span>
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {lead.origem && (
            <Badge variant="outline" className="text-[10px] h-5">
              {lead.origem}
            </Badge>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </Card>
  );
}
