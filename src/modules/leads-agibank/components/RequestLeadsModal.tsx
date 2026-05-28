import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CreditCard, Loader2, Plus, Users, MapPin, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  onClaimed?: () => void;
}

const FEATURED_DDDS = ["11", "21", "31", "71", "41", "51", "61", "81", "85", "27"];

export function RequestLeadsModal({ open, onClose, currentBalance, onClaimed }: Props) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [sending, setSending] = useState(false);
  const [quantity, setQuantity] = useState(10);
  const [selectedDDDs, setSelectedDDDs] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showAllDDDs, setShowAllDDDs] = useState(false);

  const [availableDDDs, setAvailableDDDs] = useState<{ ddd: string; count: number }[]>([]);
  const [availableTags, setAvailableTags] = useState<{ tag: string; count: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const [{ data: dddData }, { data: tagData }] = await Promise.all([
          supabase.rpc("get_agibank_available_ddds" as any),
          supabase.rpc("get_agibank_available_tags" as any),
        ]);
        if (dddData) setAvailableDDDs((dddData as any[]).map(d => ({ ddd: d.ddd, count: Number(d.available_count) })));
        if (tagData) setAvailableTags((tagData as any[]).map(t => ({ tag: t.tag, count: Number(t.available_count) })));
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const toggleDDD = (d: string) => setSelectedDDDs(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const toggleTag = (t: string) => setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const featured = FEATURED_DDDS
    .map(d => availableDDDs.find(a => a.ddd === d))
    .filter((d): d is { ddd: string; count: number } => d !== undefined);
  const others = availableDDDs.filter(d => !FEATURED_DDDS.includes(d.ddd));

  const submit = async () => {
    if (!user) return;
    if (!quantity || quantity <= 0) return toast.error("Informe uma quantidade válida");
    setSending(true);
    const { error } = await supabase.from("agibank_lead_requests" as any).insert({
      user_id: user.id,
      quantity,
      ddds: selectedDDDs.length ? selectedDDDs : null,
      tags: selectedTags.length ? selectedTags : null,
    });
    setSending(false);
    if (error) return toast.error("Erro ao enviar solicitação", { description: error.message });
    toast.success("Solicitação enviada ao administrador");
    setQuantity(10); setSelectedDDDs([]); setSelectedTags([]);
    onClose();
  };

  const content = (
    <div className="space-y-5 py-2">
      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Créditos</p>
            <p className="text-xl font-bold text-primary">{currentBalance}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" /> Quantidade de Leads
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {[5, 10, 20, 50].map(n => (
            <Button key={n} variant={quantity === n ? "default" : "outline"} size="sm" onClick={() => setQuantity(n)} className="h-10">
              {n}
            </Button>
          ))}
        </div>
        <Input
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value) || 0)}
          className="h-10"
          placeholder="Outro valor"
        />
      </div>

      {availableDDDs.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Região (DDD)
            {selectedDDDs.length > 0 && (
              <Badge variant="default" className="ml-2 text-xs">{selectedDDDs.length} selecionado{selectedDDDs.length > 1 ? "s" : ""}</Badge>
            )}
          </Label>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {featured.map(d => (
              <button
                key={d.ddd}
                onClick={() => toggleDDD(d.ddd)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all hover:scale-105 hover:border-primary/50 hover:bg-primary/5",
                  selectedDDDs.includes(d.ddd) ? "border-primary bg-primary/10 text-primary" : "border-border bg-background"
                )}
              >
                <span className="text-lg font-bold">{d.ddd}</span>
                <span className="text-[10px] text-muted-foreground">{d.count}</span>
              </button>
            ))}
          </div>
          {others.length > 0 && (
            <div className="space-y-2">
              <button onClick={() => setShowAllDDDs(!showAllDDDs)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                {showAllDDDs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {showAllDDDs ? "Ocultar" : "Ver"} outros DDDs ({others.length})
              </button>
              {showAllDDDs && (
                <ScrollArea className="h-32 rounded-lg border p-2">
                  <div className="flex flex-wrap gap-1.5">
                    {others.map(d => (
                      <Badge
                        key={d.ddd}
                        variant={selectedDDDs.includes(d.ddd) ? "default" : "outline"}
                        className={cn("cursor-pointer text-xs py-1 px-2", selectedDDDs.includes(d.ddd) && "ring-2 ring-primary/30")}
                        onClick={() => toggleDDD(d.ddd)}
                      >
                        {d.ddd} <span className="ml-1 opacity-60">({d.count})</span>
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
          {selectedDDDs.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedDDDs([])} className="text-xs h-8">Limpar seleção</Button>
          )}
        </div>
      )}

      {availableTags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Tags <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <ScrollArea className="h-24 rounded-lg border p-2">
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map(t => (
                <Badge
                  key={t.tag}
                  variant={selectedTags.includes(t.tag) ? "default" : "outline"}
                  className={cn("cursor-pointer text-xs", selectedTags.includes(t.tag) && "ring-2 ring-primary/30")}
                  onClick={() => toggleTag(t.tag)}
                >
                  {t.tag} <span className="ml-1 opacity-60">({t.count})</span>
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {loading && <p className="text-xs text-muted-foreground">Carregando filtros...</p>}
    </div>
  );

  const footer = (
    <div className="flex-shrink-0 pt-3 pb-1 border-t border-border bg-background">
      <Button className="w-full h-12 text-base font-semibold" onClick={submit} disabled={sending || quantity < 1}>
        {sending ? (<><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Enviando...</>) : (<><Users className="h-5 w-5 mr-2" /> Pedir {quantity} Leads</>)}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="h-[90vh] overflow-hidden flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Pedir Novos Leads</SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">{content}</ScrollArea>
          <div className="-mx-6 px-6">{footer}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Pedir Novos Leads</DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">{content}</ScrollArea>
        {footer}
      </DialogContent>
    </Dialog>
  );
}
