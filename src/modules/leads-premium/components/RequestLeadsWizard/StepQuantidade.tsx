import { memo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Check, CreditCard, Sparkles, Loader2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StepProps, PRIORIDADES, tipoLeadToConvenio } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface StepQuantidadeProps extends StepProps {
  userCredits: number;
}

export const StepQuantidade = memo(function StepQuantidade({ data, onUpdate, userCredits }: StepQuantidadeProps) {
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchPreview = async () => {
      setLoadingPreview(true);
      try {
        const { data: count, error } = await supabase.rpc('preview_requested_leads_count', {
          convenio_filter: data.tipoLead === 'servidor' ? 'GOVERNO BA' : tipoLeadToConvenio(data.tipoLead),
          banco_filter: data.banco,
          ddd_filter: data.ddds.length ? data.ddds : null,
          tag_filter: data.tags.length ? data.tags : null,
          parcela_min: data.parcelaMin,
          parcela_max: data.parcelaMax,
          margem_min: data.margemMin,
          margem_max: data.margemMax,
          parcelas_pagas_min: data.parcelasPagasMin,
          parcelas_pagas_max: data.parcelasPagasMax,
        });
        if (!mounted) return;
        if (error) throw error;
        setPreviewCount(Number(count));
        onUpdate({ availableLeadsCount: Number(count) });
      } catch (e) {
        console.error("Preview failed", e);
      } finally {
        if (mounted) setLoadingPreview(false);
      }
    };

    const timer = setTimeout(fetchPreview, 500);
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [
    data.tipoLead, data.banco, data.ddds, data.tags, 
    data.parcelaMin, data.parcelaMax, data.margemMin, data.margemMax,
    data.parcelasPagasMin, data.parcelasPagasMax, onUpdate
  ]);

  const isExceeded = data.quantidade > userCredits;
  const isZero = data.quantidade <= 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-base font-semibold">Defina a quantidade</h3>
        <p className="text-xs text-muted-foreground mt-1">Selecione quantos leads deseja solicitar e a prioridade</p>
      </div>

      <div className="grid gap-6">
        {/* Quantidade */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="quantidade" className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Quantidade de Leads
            </Label>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-primary">{userCredits} disponíveis</span>
            </div>
          </div>
          
          <div className="relative">
            <Input
              id="quantidade"
              type="number"
              inputMode="numeric"
              min={1}
              max={userCredits}
              value={data.quantidade}
              onChange={(e) => onUpdate({ quantidade: Math.min(Number(e.target.value), 500) })}
              className={cn(
                "h-12 text-lg font-bold pl-12 transition-all",
                isExceeded && "border-destructive focus-visible:ring-destructive",
                !isExceeded && !isZero && "border-primary/30 focus-visible:ring-primary"
              )}
            />
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          </div>

          <div className="flex flex-wrap gap-2">
            {[10, 20, 50, 100].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => onUpdate({ quantidade: val })}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  data.quantidade === val 
                    ? "bg-primary border-primary text-primary-foreground" 
                    : "bg-background border-muted hover:border-primary/50 text-muted-foreground"
                )}
              >
                {val} leads
              </button>
            ))}
          </div>

          <AnimatePresence>
            {isExceeded && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-[11px] font-medium text-destructive flex items-center gap-1.5"
              >
                Saldo insuficiente. Você tem apenas {userCredits} créditos.
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Pré-visualização de disponibilidade */}
        <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Disponibilidade no sistema
            </div>
            {loadingPreview ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant={previewCount && previewCount >= data.quantidade ? "secondary" : "outline"} className="text-xs">
                {previewCount !== null ? `${previewCount} encontrados` : "..."}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Com base nos filtros aplicados, existem <span className="font-bold text-foreground">{previewCount || 0}</span> leads 
            disponíveis que atendem ao seu perfil.
          </p>
          {previewCount !== null && previewCount < data.quantidade && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-600 font-medium">
              <Info className="h-3 w-3 mt-0.5" />
              <span>A quantidade solicitada é maior do que a disponível. Você receberá apenas {previewCount} leads.</span>
            </div>
          )}
        </div>

        {/* Prioridade */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Prioridade de Entrega</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PRIORIDADES.map((p) => {
              const isActive = data.prioridade === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onUpdate({ prioridade: p.id as any })}
                  className={cn(
                    "relative p-3 rounded-xl border text-left transition-all group",
                    isActive 
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20" 
                      : "border-muted hover:border-primary/40 bg-background"
                  )}
                >
                  <div className="flex flex-col h-full justify-between">
                    <span className={cn(
                      "text-xs font-bold block",
                      isActive ? "text-primary" : "text-foreground group-hover:text-primary/80"
                    )}>
                      {p.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-1 leading-tight">
                      {p.description}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});
