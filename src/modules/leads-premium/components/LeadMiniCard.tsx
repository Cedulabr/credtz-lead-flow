import { motion } from "framer-motion";
import { Lead, PIPELINE_STAGES } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Clock, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface LeadMiniCardProps {
  lead: Lead;
  onClick: () => void;
  index?: number;
}

export function LeadMiniCard({ lead, onClick, index = 0 }: LeadMiniCardProps) {
  const config = PIPELINE_STAGES[lead.status] || PIPELINE_STAGES.new_lead;

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const clean = phone.replace(/\D/g, "");
    if (clean.length >= 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
    }
    return phone;
  };

  const timeAgo = formatDistanceToNow(new Date(lead.created_at), {
    addSuffix: true,
    locale: ptBR
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        className={cn(
          "cursor-pointer transition-all hover:shadow-md border-l-4 active:scale-[0.98]",
          config.borderColor
        )}
        onClick={onClick}
      >
        <CardContent className="p-3">
          {/* Name */}
          <p className="font-semibold text-sm truncate mb-1.5">
            {lead.name}
          </p>

          {/* Info Row */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {formatPhone(lead.phone)}
            </span>
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between">
            {lead.convenio && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {lead.convenio}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {timeAgo}
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
