import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, MessageCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AgibankLead, STATUS_COLORS, STATUS_LABELS, maskPhone, normalizePhone, getLeadTemperature, TEMPERATURE_META } from "../types";

interface Props {
  lead: AgibankLead;
  agentName?: string | null;
  onOpen: (lead: AgibankLead) => void;
  onApiWhatsApp: (lead: AgibankLead) => void;
}

export function LeadCard({ lead, agentName, onOpen, onApiWhatsApp }: Props) {
  const phone = normalizePhone(lead.phone);
  const waLink = `https://wa.me/55${phone}`;
  const temp = getLeadTemperature(lead);
  const tempMeta = TEMPERATURE_META[temp];

  return (
    <Card
      onClick={() => onOpen(lead)}
      className="p-4 cursor-pointer hover:shadow-md transition-all flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{lead.name}</h3>
          <p className="text-sm text-muted-foreground">{maskPhone(lead.phone)}</p>
          {agentName && (
            <p className="text-xs text-muted-foreground mt-0.5">Agente: {agentName}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
          <span className={`text-xs font-medium ${tempMeta.color}`} title={`Temperatura: ${tempMeta.label}`}>
            {tempMeta.emoji} {tempMeta.label}
          </span>
        </div>
      </div>

      {lead.status === "agendado" && lead.scheduled_at && (
        <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded">
          <Calendar className="h-3 w-3" />
          {format(new Date(lead.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1" onClick={e => e.stopPropagation()}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={() => onApiWhatsApp(lead)}
              >
                <Send className="h-4 w-4 mr-1" /> API WhatsApp
              </Button>
            </TooltipTrigger>
            <TooltipContent>Enviar via Evolution API</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(waLink, "_blank")}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir wa.me</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  );
}
