import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, PhoneCall, MessageCircle, AlertTriangle, Flame, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatPhone, fullPhoneDigits } from "@/modules/telefonia/utils/phoneFormat";

interface NumeroRow {
  id: string;
  ddd: string | null;
  numero: string | null;
  tipo: string | null;
  operadora: string | null;
  tem_whatsapp: boolean | null;
  procon: boolean | null;
  flhot: boolean | null;
  posicao: number | null;
}

interface Props {
  leadId: string;
  leadName: string;
  cpf: string | null | undefined;
  refreshKey?: number;
  onLeadUpdated?: () => void;
}

export function LeadTelefonesEncontrados({ leadId, leadName, cpf, refreshKey, onLeadUpdated }: Props) {
  const [rows, setRows] = useState<NumeroRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cpfDigits = (cpf || "").replace(/\D/g, "");
    if (!cpfDigits) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("telefonia_numeros")
        .select("id, ddd, numero, tipo, operadora, tem_whatsapp, procon, flhot, posicao")
        .eq("cpf", cpfDigits)
        .order("posicao", { ascending: true })
        .limit(50);
      if (error) throw error;
      setRows((data || []) as NumeroRow[]);
    } catch (e: any) {
      console.error("[LeadTelefonesEncontrados] load error", e);
    } finally {
      setLoading(false);
    }
  }, [cpf]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!cpf || (!loading && rows.length === 0)) return null;

  const usar = async (r: NumeroRow) => {
    setBusy(r.id);
    try {
      const phoneDigits = fullPhoneDigits(r.ddd, r.numero);
      const { error } = await supabase.from("leads").update({ phone: phoneDigits }).eq("id", leadId);
      if (error) throw error;
      toast.success(`Telefone do lead ${leadName} atualizado`);
      onLeadUpdated?.();
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar lead");
    } finally {
      setBusy(null);
    }
  };

  const copy = async (digits: string) => {
    try {
      await navigator.clipboard.writeText(digits);
      toast.success("Copiado!");
    } catch {
      toast.error("Falha ao copiar");
    }
  };

  return (
    <div className="px-3 pb-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Phone className="h-4 w-4 text-primary" />
        Telefones encontrados
        <Badge variant="secondary" className="ml-1">{rows.length}</Badge>
      </div>
      {loading && rows.length === 0 ? (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const Icon = r.tipo === "celular" ? Phone : PhoneCall;
            const digits = fullPhoneDigits(r.ddd, r.numero);
            return (
              <Card key={r.id} className="p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-medium text-sm">{formatPhone(r.ddd, r.numero)}</span>
                  {r.tem_whatsapp === true && (
                    <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] h-5">
                      <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp
                    </Badge>
                  )}
                  {r.procon && (
                    <Badge variant="destructive" className="text-[10px] h-5">
                      <AlertTriangle className="h-3 w-3 mr-1" /> Procon
                    </Badge>
                  )}
                  {r.flhot && (
                    <Badge className="bg-orange-500 hover:bg-orange-500 text-white text-[10px] h-5">
                      <Flame className="h-3 w-3 mr-1" /> HOT
                    </Badge>
                  )}
                  <div className="ml-auto flex items-center gap-1.5">
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copy(digits)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => usar(r)} disabled={busy === r.id}>
                      {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Usar como principal"}
                    </Button>
                  </div>
                </div>
                {r.operadora && (
                  <div className="mt-1 text-[11px] text-muted-foreground pl-6">Operadora: {r.operadora}</div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
