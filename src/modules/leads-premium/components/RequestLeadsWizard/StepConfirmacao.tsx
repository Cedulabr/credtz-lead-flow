import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle, CheckCircle, Users, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LeadRequestData } from "./types";

interface StepConfirmacaoProps {
  data: LeadRequestData;
  userCredits: number;
}

interface PreviewLead {
  name: string;
  phone_masked: string;
  convenio: string;
  total_available: number;
}

export function StepConfirmacao({ data, userCredits }: StepConfirmacaoProps) {
  const [previewLeads, setPreviewLeads] = useState<PreviewLead[]>([]);
  const [totalAvailable, setTotalAvailable] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPreview = async () => {
      setIsLoading(true);
      try {
        const { data: result, error } = await supabase.rpc('preview_available_leads', {
          convenio_filter: data.convenio || null,
          ddd_filter: data.ddds.length > 0 ? data.ddds : null,
          tag_filter: data.tags.length > 0 ? data.tags : null,
          max_count: Math.min(data.quantidade, 20),
        });

        if (error) throw error;

        if (result && result.length > 0) {
          setPreviewLeads(result);
          setTotalAvailable(result[0].total_available);
        } else {
          setPreviewLeads([]);
          setTotalAvailable(0);
        }
      } catch (error) {
        console.error('Error previewing leads:', error);
        setPreviewLeads([]);
        setTotalAvailable(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPreview();
  }, [data]);

  const hasEnough = totalAvailable >= data.quantidade;
  const willReceive = Math.min(data.quantidade, totalAvailable);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando leads disponíveis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Eye className="h-8 w-8 text-primary mx-auto mb-2" />
        <h3 className="font-semibold text-lg">Confirmação de Retirada</h3>
        <p className="text-sm text-muted-foreground">Verifique os detalhes antes de confirmar</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Solicitado</p>
          <p className="text-2xl font-bold text-primary">{data.quantidade}</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-xs text-muted-foreground">Disponível</p>
          <p className={`text-2xl font-bold ${hasEnough ? 'text-emerald-600' : 'text-amber-600'}`}>
            {totalAvailable}
          </p>
        </div>
      </div>

      {/* Warning if not enough */}
      {!hasEnough && totalAvailable > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Quantidade insuficiente</p>
            <p className="text-xs text-amber-600">
              Você solicitou {data.quantidade} leads, mas apenas {totalAvailable} estão disponíveis. 
              Você receberá {willReceive} leads.
            </p>
          </div>
        </div>
      )}

      {totalAvailable === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">Nenhum lead disponível</p>
            <p className="text-xs text-destructive/80">
              Não há leads disponíveis com os filtros selecionados. Tente alterar os filtros.
            </p>
          </div>
        </div>
      )}

      {/* Preview List */}
      {previewLeads.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Prévia dos Leads</p>
            <Badge variant="outline" className="text-xs">{previewLeads.length} de {totalAvailable}</Badge>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="space-y-1.5">
              {previewLeads.map((lead, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50 text-sm">
                  <span className="font-medium truncate max-w-[60%]">{lead.name}</span>
                  <span className="text-muted-foreground text-xs">{lead.phone_masked}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Deadline Notice */}
      {totalAvailable > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-primary/5 border border-primary/20">
          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Ao confirmar, cada lead terá um prazo de <strong>48 horas</strong> para ser tratado. 
            Leads não tratados dentro do prazo bloquearão novas retiradas.
          </p>
        </div>
      )}
    </div>
  );
}
