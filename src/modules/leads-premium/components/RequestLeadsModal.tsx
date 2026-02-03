import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2, Plus, Users } from "lucide-react";

interface RequestLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCredits: number;
  onRequestLeads: (options: {
    convenio?: string;
    count: number;
    ddds?: string[];
    tags?: string[];
  }) => Promise<boolean>;
}

export function RequestLeadsModal({
  isOpen,
  onClose,
  userCredits,
  onRequestLeads
}: RequestLeadsModalProps) {
  const isMobile = useIsMobile();
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestCount, setRequestCount] = useState(10);
  const [selectedConvenio, setSelectedConvenio] = useState<string>("all");
  const [selectedDDDs, setSelectedDDDs] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Available options from database
  const [availableConvenios, setAvailableConvenios] = useState<{convenio: string, count: number}[]>([]);
  const [availableDDDs, setAvailableDDDs] = useState<{ddd: string, count: number}[]>([]);
  const [availableTags, setAvailableTags] = useState<{tag: string, count: number}[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAvailableOptions();
    }
  }, [isOpen]);

  const loadAvailableOptions = async () => {
    setIsLoadingOptions(true);
    try {
      // Load convenios
      const { data: convenioData } = await supabase
        .from('leads_database')
        .select('convenio')
        .eq('is_available', true)
        .not('convenio', 'is', null);
      
      if (convenioData) {
        const grouped = convenioData.reduce((acc: Record<string, number>, item) => {
          if (item.convenio) {
            acc[item.convenio] = (acc[item.convenio] || 0) + 1;
          }
          return acc;
        }, {});
        setAvailableConvenios(
          Object.entries(grouped)
            .map(([convenio, count]) => ({ convenio, count }))
            .sort((a, b) => b.count - a.count)
        );
      }

      // Load DDDs using RPC
      const { data: dddData } = await supabase.rpc('get_available_ddds');
      if (dddData) {
        setAvailableDDDs(dddData.map((d: any) => ({ ddd: d.ddd, count: Number(d.available_count) })));
      }

      // Load Tags using RPC
      const { data: tagData } = await supabase.rpc('get_available_tags');
      if (tagData) {
        setAvailableTags(tagData.map((t: any) => ({ tag: t.tag, count: Number(t.available_count) })));
      }
    } catch (error) {
      console.error('Error loading options:', error);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  const handleRequest = async () => {
    setIsRequesting(true);
    const success = await onRequestLeads({ 
      convenio: selectedConvenio !== "all" ? selectedConvenio : undefined,
      count: requestCount,
      ddds: selectedDDDs.length > 0 ? selectedDDDs : undefined,
      tags: selectedTags.length > 0 ? selectedTags : undefined
    });
    if (success) {
      onClose();
      // Reset form
      setRequestCount(10);
      setSelectedConvenio("all");
      setSelectedDDDs([]);
      setSelectedTags([]);
    }
    setIsRequesting(false);
  };

  const toggleDDD = (ddd: string) => {
    setSelectedDDDs(prev => 
      prev.includes(ddd) 
        ? prev.filter(d => d !== ddd)
        : [...prev, ddd]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const content = (
    <div className="space-y-6 py-4">
      {/* Credits Display */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div>
          <p className="text-sm text-muted-foreground">Créditos disponíveis</p>
          <p className="text-3xl font-bold text-primary">{userCredits}</p>
        </div>
        <CreditCard className="h-10 w-10 text-primary/40" />
      </div>

      {/* Quick Select Count */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Quantidade de leads</Label>
        <div className="flex items-center gap-2 flex-wrap">
          {[5, 10, 20, 50].map((num) => (
            <Button
              key={num}
              variant={requestCount === num ? "default" : "outline"}
              size="sm"
              onClick={() => setRequestCount(num)}
              disabled={num > userCredits}
              className="flex-1 min-w-[60px]"
            >
              {num}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={requestCount}
            onChange={(e) => setRequestCount(Math.min(Number(e.target.value), userCredits))}
            min={1}
            max={userCredits}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">leads</span>
        </div>
      </div>

      {/* Convenio Filter */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Convênio</Label>
        <Select value={selectedConvenio} onValueChange={setSelectedConvenio}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os convênios" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os convênios</SelectItem>
            {availableConvenios.map((c) => (
              <SelectItem key={c.convenio} value={c.convenio}>
                {c.convenio} ({c.count} disponíveis)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* DDD Filter */}
      {availableDDDs.length > 0 && (
        <div className="space-y-2">
          <Label className="text-base font-semibold">DDDs (opcional)</Label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
            {availableDDDs.slice(0, 20).map((d) => (
              <Badge
                key={d.ddd}
                variant={selectedDDDs.includes(d.ddd) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleDDD(d.ddd)}
              >
                {d.ddd} ({d.count})
              </Badge>
            ))}
          </div>
          {selectedDDDs.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedDDDs.length} DDDs selecionados
            </p>
          )}
        </div>
      )}

      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-base font-semibold">Tags (opcional)</Label>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
            {availableTags.map((t) => (
              <Badge
                key={t.tag}
                variant={selectedTags.includes(t.tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(t.tag)}
              >
                {t.tag} ({t.count})
              </Badge>
            ))}
          </div>
          {selectedTags.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {selectedTags.length} tags selecionadas
            </p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <Button 
        className="w-full h-14 text-lg" 
        onClick={handleRequest}
        disabled={isRequesting || requestCount > userCredits || requestCount < 1 || userCredits <= 0}
      >
        {isRequesting ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Solicitando...
          </>
        ) : (
          <>
            <Users className="h-5 w-5 mr-2" />
            Pedir {requestCount} Leads
          </>
        )}
      </Button>

      {userCredits <= 0 && (
        <p className="text-sm text-center text-destructive">
          Você não possui créditos. Solicite ao administrador.
        </p>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Pedir Novos Leads
            </SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Pedir Novos Leads
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}