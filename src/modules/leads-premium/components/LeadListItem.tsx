import { useState } from "react";
import { Lead, PIPELINE_STAGES } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MessageCircle, Clock, FileText, ChevronRight, Send, LayoutPanelLeft } from "lucide-react";
import { WhatsAppSendDialog, type WhatsAppSentInfo } from "@/components/WhatsAppSendDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface LeadListItemProps {
  lead: Lead;
  onClick: () => void;
  onSalesPanel?: (lead: Lead) => void;
  onTyping?: (lead: Lead) => void;
  onStatusChange?: (lead: Lead, status: string) => void;
  canEdit?: boolean;
}

export function LeadListItem({ lead, onClick, onSalesPanel, onTyping, onStatusChange, canEdit = true }: LeadListItemProps) {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const [showWhatsAppDialog, setShowWhatsAppDialog] = useState(false);
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

  const handleCall = (e: React.MouseEvent, phoneToCall: string) => {
    e.stopPropagation();
    window.open(`tel:+55${phoneToCall.replace(/\D/g, "")}`, "_blank");
  };

  const handleSalesPanel = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSalesPanel?.(lead);
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
    <>
    <Card 
      className={cn(
        "group cursor-pointer transition-all hover:shadow-lg border-l-4 active:scale-[0.99] bg-card",
        config.borderColor,
        "hover:bg-accent/5"
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-5">
        {/* Row 1: Name + Status + Date */}
        <div className="flex items-center gap-3 mb-3">
          <div className={cn("w-3 h-3 rounded-full shrink-0 shadow-sm", config.dotColor)} />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base sm:text-lg tracking-tight truncate group-hover:text-primary transition-colors">
              {lead.name}
            </h3>
          </div>
          <Badge 
            variant="outline" 
            className={cn("shrink-0 font-medium px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs shadow-sm border-0", config.bgColor, config.textColor)}
          >
            {config.label}
          </Badge>
          <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5 shrink-0 bg-muted/50 px-2 py-1 rounded-md">
            <Clock className="h-3 w-3" />
            {timeAgo}
          </span>
        </div>

        {/* Row 2: Info Badges & Phones */}
        <div className="flex items-center flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2 bg-muted/30 px-2.5 py-1 rounded-lg border">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-semibold font-mono text-foreground">
              {formatPhone(lead.phone)}
            </span>
            {lead.phone2 && (
              <>
                <div className="w-px h-3 bg-muted-foreground/30 mx-1" />
                <span className="text-xs sm:text-sm font-semibold font-mono text-muted-foreground">
                  {formatPhone(lead.phone2)}
                </span>
              </>
            )}
          </div>
          
          {lead.convenio && (
            <Badge variant="secondary" className="px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-md bg-primary/10 text-primary hover:bg-primary/15 border-0">
              {lead.convenio}
            </Badge>
          )}
          
          {lead.tag && (
            <Badge variant="outline" className="px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-md border-primary/20 text-muted-foreground">
              {lead.tag}
            </Badge>
          )}
        </div>

        {/* Row 3: Action Buttons & Status Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-1">
            {/* Sales Panel Button (Painel Televendas) */}
            <Button
              size="sm"
              variant="default"
              className="h-9 px-4 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm rounded-lg transition-all"
              onClick={handleSalesPanel}
            >
              <LayoutPanelLeft className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Painel</span>
            </Button>

            {/* API WhatsApp */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-3 gap-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 rounded-lg"
              onClick={(e) => { e.stopPropagation(); setShowWhatsAppDialog(true); }}
            >
              <Send className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">WhatsApp</span>
            </Button>

            {/* Digitar ao Cliente */}
            {false && showActionButtons && onTyping && (

              <Button
                size="sm"
                className="h-9 px-4 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm rounded-lg"
                onClick={handleTyping}
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Digitar</span>
              </Button>
            )}
          </div>

          {/* Status Change Dropdown */}
          {canEdit && onStatusChange && (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              <Select 
                value={lead.status}
                onValueChange={handleStatusSelect}
              >
                <SelectTrigger className="h-9 w-[140px] sm:w-[180px] text-xs font-medium bg-muted/50 border-muted rounded-lg hover:bg-muted transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {Object.entries(PIPELINE_STAGES).map(([key, stageConfig]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", stageConfig.dotColor)} />
                        {stageConfig.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>

    {/* WhatsApp Send Dialog */}
    <WhatsAppSendDialog
      open={showWhatsAppDialog}
      onOpenChange={setShowWhatsAppDialog}
      clientName={lead.name}
      clientPhone={lead.phone}
      onSent={async (info: WhatsAppSentInfo) => {
        if (!user) return;
        const currentHistory = lead.history
          ? (typeof lead.history === 'string' ? JSON.parse(lead.history) : lead.history)
          : [];
        const newEntry = {
          action: 'whatsapp_sent',
          timestamp: new Date().toISOString(),
          user_id: user.id,
          user_name: profile?.name || profile?.email || '',
          whatsapp_instance: info.instanceName,
          whatsapp_number: info.instancePhone,
          sent_via: info.sentVia,
          message: info.message,
          audio_title: info.audioTitle || null,
          client_phone: info.clientPhone,
        };
        await supabase
          .from('leads')
          .update({ history: JSON.stringify([...currentHistory, newEntry]) } as any)
          .eq('id', lead.id);
      }}
    />
    </>
  );
}
