import { memo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Building2, Tag, ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { StepProps, AvailableOption, FEATURED_DDDS } from "./types";

export const StepPerfil = memo(function StepPerfil({ data, onUpdate }: StepProps) {
  const [convenios, setConvenios] = useState<AvailableOption[]>([]);
  const [ddds, setDdds] = useState<AvailableOption[]>([]);
  const [tags, setTags] = useState<AvailableOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllDDDs, setShowAllDDDs] = useState(false);

  // Carregar opções disponíveis - apenas uma vez
  useEffect(() => {
    let mounted = true;
    
    const loadOptions = async () => {
      try {
        // Carregar em paralelo
        const [convenioRes, dddRes, tagRes] = await Promise.all([
          supabase
            .from('leads_database')
            .select('convenio')
            .eq('is_available', true)
            .not('convenio', 'is', null),
          supabase.rpc('get_available_ddds'),
          supabase.rpc('get_available_tags')
        ]);

        if (!mounted) return;

        // Processar convênios
        if (convenioRes.data) {
          const grouped = convenioRes.data.reduce((acc: Record<string, number>, item) => {
            if (item.convenio) {
              acc[item.convenio] = (acc[item.convenio] || 0) + 1;
            }
            return acc;
          }, {});
          setConvenios(
            Object.entries(grouped)
              .map(([value, count]) => ({ value, count }))
              .sort((a, b) => b.count - a.count)
          );
        }

        // Processar DDDs
        if (dddRes.data) {
          setDdds(dddRes.data.map((d: any) => ({ 
            value: d.ddd, 
            count: Number(d.available_count) 
          })));
        }

        // Processar Tags
        if (tagRes.data) {
          setTags(tagRes.data.map((t: any) => ({ 
            value: t.tag, 
            count: Number(t.available_count) 
          })));
        }
      } catch (error) {
        console.error('Erro ao carregar opções:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadOptions();
    return () => { mounted = false; };
  }, []);

  const toggleDDD = useCallback((ddd: string) => {
    const newDdds = data.ddds.includes(ddd)
      ? data.ddds.filter(d => d !== ddd)
      : [...data.ddds, ddd];
    onUpdate({ ddds: newDdds });
  }, [data.ddds, onUpdate]);

  const toggleTag = useCallback((tag: string) => {
    const newTags = data.tags.includes(tag)
      ? data.tags.filter(t => t !== tag)
      : [...data.tags, tag];
    onUpdate({ tags: newTags });
  }, [data.tags, onUpdate]);

  // Separar DDDs em destaque dos outros
  const featuredDDDs = FEATURED_DDDS
    .map(ddd => ddds.find(d => d.value === ddd))
    .filter((d): d is AvailableOption => d !== undefined);
  
  const otherDDDs = ddds.filter(d => !FEATURED_DDDS.includes(d.value));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando opções disponíveis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-semibold">Defina o perfil desejado</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Todos os filtros são opcionais
        </p>
      </div>

      {/* Convênio */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <Label className="text-sm font-medium flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Convênio
        </Label>
        <Select 
          value={data.convenio || "all"} 
          onValueChange={(v) => onUpdate({ convenio: v === "all" ? null : v })}
        >
          <SelectTrigger className="h-11 bg-background">
            <SelectValue placeholder="Todos os convênios" />
          </SelectTrigger>
          <SelectContent className="bg-popover border shadow-lg z-[100]">
            <SelectItem value="all">Todos os convênios</SelectItem>
            {convenios.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                <span className="flex items-center justify-between w-full gap-4">
                  <span>{c.value}</span>
                  <Badge variant="secondary" className="text-xs">{c.count}</Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* DDDs */}
      {ddds.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <Label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Região (DDD)
            {data.ddds.length > 0 && (
              <Badge variant="default" className="ml-2 text-xs">
                {data.ddds.length} selecionado{data.ddds.length > 1 ? 's' : ''}
              </Badge>
            )}
          </Label>
          
          {/* Featured DDDs */}
          <div className="grid grid-cols-5 gap-2">
            {featuredDDDs.map((d) => {
              const isSelected = data.ddds.includes(d.value);
              return (
                <button
                  key={d.value}
                  onClick={() => toggleDDD(d.value)}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-2.5 rounded-lg border-2 transition-all",
                    "hover:border-primary/50 hover:bg-primary/5",
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  )}
                >
                  <span className="text-lg font-bold">{d.value}</span>
                  <span className="text-[10px] text-muted-foreground">{d.count}</span>
                  {isSelected && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Other DDDs */}
          {otherDDDs.length > 0 && (
            <div className="space-y-2">
              <button 
                onClick={() => setShowAllDDDs(!showAllDDDs)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAllDDDs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span>{showAllDDDs ? 'Ocultar' : 'Ver mais'} DDDs ({otherDDDs.length})</span>
              </button>
              
              <AnimatePresence>
                {showAllDDDs && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <ScrollArea className="h-28 rounded-lg border p-2">
                      <div className="flex flex-wrap gap-1.5">
                        {otherDDDs.map((d) => (
                          <Badge
                            key={d.value}
                            variant={data.ddds.includes(d.value) ? "default" : "outline"}
                            className="cursor-pointer transition-all text-xs py-1 px-2"
                            onClick={() => toggleDDD(d.value)}
                          >
                            {d.value}
                            <span className="ml-1 opacity-60">({d.count})</span>
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {data.ddds.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onUpdate({ ddds: [] })}
              className="text-xs h-7"
            >
              Limpar seleção
            </Button>
          )}
        </motion.div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-2"
        >
          <Label className="text-sm font-medium flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Tags
            <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <ScrollArea className="h-20 rounded-lg border p-2">
            <div className="flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Badge
                  key={t.value}
                  variant={data.tags.includes(t.value) ? "default" : "outline"}
                  className="cursor-pointer transition-all text-xs"
                  onClick={() => toggleTag(t.value)}
                >
                  {t.value}
                  <span className="ml-1 opacity-60">({t.count})</span>
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </div>
  );
});
