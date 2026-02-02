import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lead, STATUS_CONFIG } from "../types";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { Phone, MessageCircle, User, MapPin, History, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (status: string) => void;
  onViewHistory: () => void;
  onRequestDigitacao: () => void;
  canEdit: boolean;
}

export function LeadCard({ 
  lead, 
  onStatusChange, 
  onViewHistory, 
  onRequestDigitacao,
  canEdit 
}: LeadCardProps) {
  const config = STATUS_CONFIG[lead.status] || STATUS_CONFIG.new_lead;

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const clean = phone.replace(/\D/g, "");
    if (clean.length === 11) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
    }
    if (clean.length === 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
    }
    return phone;
  };

  const handleWhatsApp = () => {
    const phone = lead.phone.replace(/\D/g, "");
    const message = encodeURIComponent(`Olá ${lead.name.split(' ')[0]}, tudo bem?`);
    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
  };

  const handleCall = () => {
    window.open(`tel:+55${lead.phone.replace(/\D/g, "")}`, "_blank");
  };

  return (
    <Card className={cn(
      "transition-all hover:shadow-md border-l-4",
      config.borderColor
    )}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", config.dotColor)} />
              <h3 className="font-semibold text-base truncate max-w-[180px]">
                {lead.name}
              </h3>
            </div>
            <LeadStatusBadge status={lead.status} size="sm" />
          </div>

          {/* Info */}
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              <span>{formatPhone(lead.phone)}</span>
            </div>
            {lead.convenio && (
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                <span>{lead.convenio}</span>
              </div>
            )}
            {lead.tag && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                <span className="text-xs bg-muted px-2 py-0.5 rounded">{lead.tag}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 pt-2 border-t">
            <Button 
              size="sm" 
              variant="outline" 
              className="flex-1"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4 mr-1 text-green-600" />
              WhatsApp
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={handleCall}
            >
              <Phone className="h-4 w-4" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost"
              onClick={onViewHistory}
            >
              <History className="h-4 w-4" />
            </Button>
          </div>

          {/* Status Change Buttons */}
          {canEdit && lead.status !== "cliente_fechado" && (
            <div className="flex flex-wrap gap-2 pt-2">
              {lead.status === "new_lead" && (
                <Button 
                  size="sm" 
                  variant="secondary"
                  onClick={() => onStatusChange("em_andamento")}
                  className="text-xs"
                >
                  Iniciar Atendimento
                </Button>
              )}
              {["em_andamento", "aguardando_retorno"].includes(lead.status) && (
                <>
                  <Button 
                    size="sm" 
                    variant="default"
                    onClick={() => onStatusChange("cliente_fechado")}
                    className="text-xs"
                  >
                    Cliente Fechou
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={onRequestDigitacao}
                    className="text-xs"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Digitação
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-muted-foreground pt-1">
            Criado em {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
