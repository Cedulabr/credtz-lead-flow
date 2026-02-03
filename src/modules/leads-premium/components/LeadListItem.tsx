import { motion } from "framer-motion";
import { Lead, PIPELINE_STAGES } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, ChevronRight, Clock, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface LeadListItemProps {
  lead: Lead;
  onClick: () => void;
}

export function LeadListItem({ lead, onClick }: LeadListItemProps) {
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

  const timeAgo = formatDistanceToNow(new Date(lead.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:shadow-md border-l-4 active:scale-[0.99]",
        config.borderColor
      )}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          {/* Status Dot */}
          <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", config.dotColor)} />

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {lead.name}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {formatPhone(lead.phone)}
                </p>
              </div>
              <Badge 
                variant="outline" 
                className={cn("shrink-0 text-[10px] sm:text-xs", config.bgColor, config.textColor, "border-0")}
              >
                {config.label}
              </Badge>
            </div>

            <div className="flex items-center flex-wrap gap-2 mt-2">
              {lead.convenio && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs">
                  {lead.convenio}
                </Badge>
              )}
              {lead.tag && (
                <Badge variant="outline" className="text-[10px] sm:text-xs">
                  {lead.tag}
                </Badge>
              )}
              <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                <Clock className="h-3 w-3" />
                {timeAgo}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 sm:h-9 sm:w-9 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={handleCall}
            >
              <Phone className="h-4 w-4" />
            </Button>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
