import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Copy,
  Phone as PhoneIcon,
  PhoneCall,
  MessageCircle,
  Flame,
  AlertTriangle,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { NormPhone } from "../types";
import { formatPhone, fullPhoneDigits } from "../utils/phoneFormat";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  phone: NormPhone;
  index: number;
  showWhats: boolean;
  showHot: boolean;
  leadContext?: { id: string; name: string } | null;
  onLeadUpdated?: () => void;
}

export function PhoneCard({ phone: p, index, showWhats, showHot, leadContext, onLeadUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const Icon = p.tipo === "celular" ? PhoneIcon : PhoneCall;
  const digits = fullPhoneDigits(p.ddd, p.numero);
  const formatted = formatPhone(p.ddd, p.numero);
  const isWhats = p.tem_whatsapp === true;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(digits);
      toast.success("Número copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  const openWhats = () => {
    if (!digits) return;
    window.open(`https://wa.me/55${digits}`, "_blank");
  };

  const usar = async () => {
    if (!leadContext) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ phone: digits })
        .eq("id", leadContext.id);
      if (error) throw error;
      toast.success(`Telefone do lead ${leadContext.name} atualizado`);
      onLeadUpdated?.();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar lead");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      className={cn(
        "p-3 sm:p-4 transition-all",
        isWhats && "border-green-500/40 bg-green-50/40 dark:bg-green-950/10",
      )}
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div
          className={cn(
            "h-9 w-9 rounded-md flex items-center justify-center shrink-0",
            isWhats ? "bg-green-600 text-white" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono font-bold text-base sm:text-lg">{formatted}</span>
            <span className="text-xs text-muted-foreground">#{index + 1}</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {showWhats && isWhats && (
              <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] px-1.5 py-0">
                <MessageCircle className="h-3 w-3 mr-0.5" /> WhatsApp
              </Badge>
            )}
            {showWhats && p.tem_whatsapp === false && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                Sem WhatsApp
              </Badge>
            )}
            {p.procon && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                <AlertTriangle className="h-3 w-3 mr-0.5" /> Procon
              </Badge>
            )}
            {showHot && p.flhot && (
              <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-[10px] px-1.5 py-0">
                <Flame className="h-3 w-3 mr-0.5" /> HOT
              </Badge>
            )}
            {p.operadora && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {p.operadora}
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
              {p.tipo || "—"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          <Button size="sm" variant="outline" onClick={copy} className="h-8">
            <Copy className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1">Copiar</span>
          </Button>
          {isWhats && (
            <Button
              size="sm"
              onClick={openWhats}
              className="bg-green-600 hover:bg-green-700 text-white h-8"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1">API WhatsApp</span>
            </Button>
          )}
          {leadContext && (
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" className="h-8" disabled={busy}>
                  Usar no lead
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-3">
                  <p className="text-sm">
                    Definir <b>{formatted}</b> como telefone principal do lead{" "}
                    <b>{leadContext.name}</b>?
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" onClick={usar} disabled={busy}>
                      Confirmar
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </Card>
  );
}
