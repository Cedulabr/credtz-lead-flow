import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, MessageCircle, Calendar, Phone } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AgibankLead, STATUS_COLORS, STATUS_LABELS, normalizePhone, getLeadTemperature, TEMPERATURE_META } from "../types";

interface Props {
  lead: AgibankLead;
  agentName?: string | null;
  onOpen: (lead: AgibankLead) => void;
  onApiWhatsApp: (lead: AgibankLead) => void;
}

function formatBrPhone(raw: string): string {
  const d = (raw || "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

function PhoneRow({
  label,
  phone,
  onApi,
}: {
  label: string;
  phone: string;
  onApi: () => void;
}) {
  const norm = normalizePhone(phone);
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <div className="flex items-center gap-1.5 min-w-0">
        <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground">{label}:</span>
        <span className="font-mono truncate">{formatBrPhone(phone)}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          size="sm"
          className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white"
          onClick={(e) => { e.stopPropagation(); onApi(); }}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2"
          onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/55${norm}`, "_blank"); }}
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function LeadCard({ lead, agentName, onOpen, onApiWhatsApp }: Props) {
  const temp = getLeadTemperature(lead);
  const tempMeta = TEMPERATURE_META[temp];
  const phones: Array<{ label: string; value: string }> = [
    { label: "Tel 1", value: lead.phone },
    ...(lead.phone2 ? [{ label: "Tel 2", value: lead.phone2 }] : []),
  ];

  return (
    <Card
      onClick={() => onOpen(lead)}
      className="p-4 cursor-pointer hover:shadow-md transition-all flex flex-col gap-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold truncate">{lead.name}</h3>
          {lead.document && (
            <p className="text-xs text-muted-foreground font-mono">CPF: {lead.document}</p>
          )}
          {agentName && (
            <p className="text-xs text-muted-foreground mt-0.5">Agente: {agentName}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge className={STATUS_COLORS[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
          {lead.tag && (
            <Badge variant="outline" className="text-xs">{lead.tag}</Badge>
          )}
          <span className={`text-xs font-medium ${tempMeta.color}`} title={`Temperatura: ${tempMeta.label}`}>
            {tempMeta.emoji} {tempMeta.label}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
        <TooltipProvider>
          {phones.map((p) => (
            <PhoneRow
              key={p.label}
              label={p.label}
              phone={p.value}
              onApi={() => onApiWhatsApp({ ...lead, phone: p.value })}
            />
          ))}
        </TooltipProvider>
      </div>

      {lead.status === "agendado" && lead.scheduled_at && (
        <div className="flex items-center gap-1.5 text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded">
          <Calendar className="h-3 w-3" />
          {format(new Date(lead.scheduled_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </div>
      )}
    </Card>
  );
}
