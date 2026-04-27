import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Copy, Phone, PhoneCall, MessageCircle, Flame, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { NormPhone } from "../types";
import type { Metodo } from "../utils/methodConfig";
import { formatPhone, fullPhoneDigits } from "../utils/phoneFormat";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface Props {
  phones: NormPhone[];
  metodo: Metodo | string;
  leadContext?: { id: string; name: string } | null;
  onLeadUpdated?: () => void;
}

export function TelefonesSection({ phones, metodo, leadContext, onLeadUpdated }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const showWhats = metodo === "NVBOOK_CEL_OBG_WHATS" || metodo === "NVCHECK_JSON";
  const showHot = metodo === "NVCHECK_JSON";
  const cels = phones.filter((p) => p.tipo === "celular");
  const fixs = phones.filter((p) => p.tipo === "fixo");

  if (!phones.length) {
    return <Card className="p-4 text-sm text-muted-foreground">Nenhum telefone retornado.</Card>;
  }

  const copy = async (digits: string) => {
    try {
      await navigator.clipboard.writeText(digits);
      toast.success("Copiado!");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  const usar = async (p: NormPhone) => {
    if (!leadContext) return;
    setBusy(p.id || `${p.ddd}${p.numero}`);
    try {
      const phoneDigits = fullPhoneDigits(p.ddd, p.numero);
      const { error } = await supabase
        .from("leads")
        .update({ phone: phoneDigits })
        .eq("id", leadContext.id);
      if (error) throw error;
      toast.success(`Telefone atualizado para o lead ${leadContext.name}`);
      onLeadUpdated?.();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar lead");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        {cels.length} celular(es)
        {fixs.length > 0 && ` e ${fixs.length} fixo(s)`} encontrado(s)
      </div>
      <div className="space-y-2">
        {phones.map((p, i) => {
          const id = p.id || `${p.ddd}${p.numero}-${i}`;
          const Icon = p.tipo === "celular" ? Phone : PhoneCall;
          const digits = fullPhoneDigits(p.ddd, p.numero);
          return (
            <Card key={id} className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono font-medium">{formatPhone(p.ddd, p.numero)}</span>
                {showWhats && p.tem_whatsapp === true && (
                  <Badge className="bg-green-600 hover:bg-green-600 text-white">
                    <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                  </Badge>
                )}
                {showWhats && p.tem_whatsapp === false && (
                  <Badge variant="secondary">Sem WhatsApp</Badge>
                )}
                {p.procon && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Procon
                  </Badge>
                )}
                {showHot && p.flhot && (
                  <Badge className="bg-orange-500 hover:bg-orange-500 text-white">
                    <Flame className="h-3 w-3 mr-1" /> HOT
                  </Badge>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(digits)}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                  </Button>
                  {leadContext && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm">Usar</Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72" align="end">
                        <div className="space-y-3">
                          <p className="text-sm">
                            Atualizar telefone do lead <b>{leadContext.name}</b> para{" "}
                            <b>{formatPhone(p.ddd, p.numero)}</b>?
                          </p>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => usar(p)}
                              disabled={busy === id}
                            >
                              Confirmar
                            </Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground pl-6">
                {p.operadora && <span>Operadora: {p.operadora}</span>}
                {showHot && (
                  <>
                    <span>HOT: {p.flhot ? "Sim" : "Não"}</span>
                    <span>Assinante: {p.assinante ? "Sim" : "Não"}</span>
                  </>
                )}
                {p.procon !== null && <span>Procon: {p.procon ? "Sim" : "Não"}</span>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
