import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, ChevronDown, ChevronUp, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AvailableOption, FEATURED_DDDS } from "../types";

interface Props {
  selected: string[];
  onChange: (ddds: string[]) => void;
}

export function DDDField({ selected, onChange }: Props) {
  const [ddds, setDdds] = useState<AvailableOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.rpc('get_available_ddds');
        if (!mounted) return;
        setDdds((data || []).map((d: any) => ({ value: d.ddd, count: Number(d.available_count) })));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggle = (ddd: string) => {
    onChange(selected.includes(ddd) ? selected.filter(d => d !== ddd) : [...selected, ddd]);
  };

  const featured = FEATURED_DDDS
    .map(d => ddds.find(x => x.value === d))
    .filter((d): d is AvailableOption => !!d);
  const others = ddds.filter(d => !FEATURED_DDDS.includes(d.value));

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        Região (DDD)
        <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
        {selected.length > 0 && (
          <Badge variant="default" className="ml-auto text-xs">{selected.length}</Badge>
        )}
      </Label>

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando DDDs...</p>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-1.5">
            {featured.map(d => {
              const isSel = selected.includes(d.value);
              return (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggle(d.value)}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all",
                    "hover:border-primary/50 hover:bg-primary/5",
                    isSel ? "border-primary bg-primary/10" : "border-border bg-background"
                  )}
                >
                  <span className="text-base font-bold">{d.value}</span>
                  <span className="text-[10px] text-muted-foreground">{d.count}</span>
                  {isSel && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {others.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowAll(s => !s)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAll ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                {showAll ? 'Ocultar' : 'Ver todos os DDDs'} ({others.length})
              </button>

              <AnimatePresence initial={false}>
                {showAll && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <ScrollArea className="h-28 rounded-lg border p-2">
                      <div className="flex flex-wrap gap-1.5">
                        {others.map(d => (
                          <Badge
                            key={d.value}
                            variant={selected.includes(d.value) ? "default" : "outline"}
                            className="cursor-pointer text-xs"
                            onClick={() => toggle(d.value)}
                          >
                            {d.value}<span className="ml-1 opacity-60">({d.count})</span>
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {selected.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange([])}
              className="text-xs h-7"
            >
              Limpar seleção
            </Button>
          )}
        </>
      )}
    </div>
  );
}
