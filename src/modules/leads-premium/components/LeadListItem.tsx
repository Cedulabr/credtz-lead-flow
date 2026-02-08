import { Lead, PIPELINE_STAGES } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MessageCircle, Clock, Calculator, FileText, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface LeadListItemProps {
  lead: Lead;
  onClick: () => void;
  onSimulation?: (lead: Lead) => void;
  onTyping?: (lead: Lead) => void;
  onStatusChange?: (lead: Lead, status: string) => void;
  canEdit?: boolean;
}

export function LeadListItem({ lead, onClick, onSimulation, onTyping, onStatusChange, canEdit = true }: LeadListItemProps) {
  const isMobile = useIsMobile();
  const config = PIPELINE_STAGES[lead.status] || PIPELINE_STAGES.new_lead;

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const clean = phone.replace(/\D/g, "");
    if (clean.length >= 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
    }
    return phone;
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = lead.phone.replace(/\D/g, "");
    const firstName = lead.name.split(' ')[0];
    const message = encodeURIComponent(`Olá ${firstName}, tudo bem?`);
    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`tel:+55${lead.phone.replace(/\D/g, "")}`, "_blank");
  };

  const handleSimulation = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSimulation?.(lead);
  };

  const handleTyping = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTyping?.(lead);
  };

  const handleStatusSelect = (value: string) => {
    onStatusChange?.(lead, value);
  };

  const timeAgo = formatDistanceToNow(new Date(lead.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  const showActionButtons = canEdit && ["new_lead", "em_andamento", "aguardando_retorno"].includes(lead.status);

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-l-4 active:scale-[0.99]",
        config.borderColor
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        {/* Row 1: Name + Status + Chevron */}
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", config.dotColor)} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm sm:text-base truncate">
              {lead.name}
            </p>
          </div>
          <Badge 
            variant="outline" 
            className={cn("shrink-0 text-[10px] sm:text-xs", config.bgColor, config.textColor, "border-0")}
          >
            {config.label}
          </Badge>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        {/* Row 2: Phone + Convenio + Tag + Time */}
        <div className="flex items-center flex-wrap gap-x-3 gap-y-1 ml-5 mb-2">
          <span className="text-xs sm:text-sm text-muted-foreground font-mono">
            {formatPhone(lead.phone)}
          </span>
          {lead.convenio && (
            <Badge variant="secondary" className="text-[10px] sm:text-xs h-5">
              {lead.convenio}
            </Badge>
          )}
          {lead.tag && (
            <Badge variant="outline" className="text-[10px] sm:text-xs h-5">
              {lead.tag}
            </Badge>
          )}
          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 ml-auto">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>

        {/* Row 3: Action Buttons */}
        <div className="flex items-center gap-1.5 ml-5 flex-wrap">
          {/* WhatsApp */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50 gap-1"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">WhatsApp</span>
          </Button>

          {/* Ligar */}
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 gap-1"
            onClick={handleCall}
          >
            <Phone className="h-3.5 w-3.5" />
            <span className="text-xs hidden sm:inline">Ligar</span>
          </Button>

          {/* Simular */}
          {showActionButtons && onSimulation && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-2.5 gap-1 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
              onClick={handleSimulation}
            >
              <Calculator className="h-3.5 w-3.5" />
              <span className="text-xs">Simular</span>
            </Button>
          )}

          {/* Digitar */}
          {showActionButtons && onTyping && (
            <Button
              size="sm"
              className="h-8 px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleTyping}
            >
              <FileText className="h-3.5 w-3.5" />
              <span className="text-xs">Digitar</span>
            </Button>
          )}

          {/* Status Change Dropdown (desktop) */}
          {canEdit && onStatusChange && !isMobile && (
            <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
              <Select 
                value={lead.status}
                onValueChange={handleStatusSelect}
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PIPELINE_STAGES).map(([key, stageConfig]) => (
                    <SelectItem key={key} value={key}>
                      <span className="text-xs">{stageConfig.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
