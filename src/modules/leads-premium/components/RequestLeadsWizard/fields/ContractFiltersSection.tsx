import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Landmark, Wallet, Banknote, ListChecks } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AvailableOption, LeadRequestData } from "../types";

interface Props {
  data: LeadRequestData;
  onUpdate: (updates: Partial<LeadRequestData>) => void;
  defaultExpanded?: boolean;
}

const fmtBRL = (n: number) => `R$ ${n.toLocaleString('pt-BR')}`;

export function ContractFiltersSection({ data, onUpdate, defaultExpanded = true }: Props) {
  const [open, setOpen] = useState(defaultExpanded);
  const [bancos, setBancos] = useState<AvailableOption[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data: res } = await (supabase as any).rpc('get_available_bancos');
        if (!mounted) return;
        setBancos((res || []).map((b: any) => ({ value: b.banco, count: Number(b.available_count) })));
      } catch {/* opcional */}
    })();
    return () => { mounted = false; };
  }, []);

  const hasActive =
    !!data.banco || data.parcelaMin !== null || data.parcelaMax !== null ||
    data.margemMin !== null || data.parcelasPagasMin !== null;

  const parcMin = data.parcelaMin ?? 0;
  const parcMax = data.parcelaMax ?? 2000;

  return (
    <div className="space-y-3 pt-2 border-t">
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Filtros de contrato
        {hasActive && <Badge variant="default" className="ml-1 text-xs">ativos</Badge>}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 pt-2">
              {/* Banco */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-muted-foreground" />
                  Banco / Consignatária
                </Label>
                <Select
                  value={data.banco || "all"}
                  onValueChange={(v) => onUpdate({ banco: v === "all" ? null : v })}
                >
                  <SelectTrigger className="h-10 bg-background">
                    <SelectValue placeholder="Todos os bancos" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-[100] max-h-72">
                    <SelectItem value="all">Todos os bancos</SelectItem>
                    {bancos.map(b => (
                      <SelectItem key={b.value} value={b.value}>
                        <span className="flex items-center justify-between w-full gap-4">
                          <span>{b.value}</span>
                          <Badge variant="secondary" className="text-xs">{b.count}</Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Valor de parcela */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    Valor de parcela
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {fmtBRL(parcMin)} — {fmtBRL(parcMax)}
                  </span>
                </Label>
                <Slider
                  min={0}
                  max={2000}
                  step={50}
                  value={[parcMin, parcMax]}
                  onValueChange={([min, max]) =>
                    onUpdate({
                      parcelaMin: min > 0 ? min : null,
                      parcelaMax: max < 2000 ? max : null,
                    })
                  }
                  className="py-2"
                />
              </div>

              {/* Margem mínima */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  Margem disponível mínima (R$)
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={50}
                  placeholder="Ex.: 200"
                  value={data.margemMin ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    onUpdate({ margemMin: v === "" ? null : Number(v) });
                  }}
                  className="h-10"
                />
              </div>

              {/* Parcelas pagas mín */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-muted-foreground" />
                  Parcelas pagas (mínimo)
                </Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  placeholder="Ex.: 6"
                  value={data.parcelasPagasMin ?? ""}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    onUpdate({ parcelasPagasMin: v === "" ? null : Number(v) });
                  }}
                  className="h-10"
                />
              </div>

              {hasActive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onUpdate({
                      banco: null,
                      parcelaMin: null,
                      parcelaMax: null,
                      margemMin: null,
                      parcelasPagasMin: null,
                    })
                  }
                  className="text-xs h-7"
                >
                  Limpar filtros de contrato
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
