import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, Loader2, Plus, Users, MapPin, Tag, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

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

// DDDs principais em destaque
const FEATURED_DDDS = ["11", "21", "31", "71", "41", "51", "61", "81", "85", "27"];

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
  const [showAllDDDs, setShowAllDDDs] = useState(false);
  
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

  // Separate featured DDDs from others
  const featuredDDDsWithCount = FEATURED_DDDS
    .map(ddd => availableDDDs.find(d => d.ddd === ddd))
    .filter((d): d is {ddd: string, count: number} => d !== undefined);
  
  const otherDDDs = availableDDDs.filter(d => !FEATURED_DDDS.includes(d.ddd));

  const content = (
    <div className="space-y-5 py-2">
      {/* Credits Display - Compact */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Créditos</p>
            <p className="text-xl font-bold text-primary">{userCredits}</p>
          </div>
        </div>
      </div>

      {/* Quantidade - Quick Select */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Quantidade de Leads
        </Label>
        <div className="grid grid-cols-4 gap-2">
          {[5, 10, 20, 50].map((num) => (
            <Button
              key={num}
              variant={requestCount === num ? "default" : "outline"}
              size="sm"
              onClick={() => setRequestCount(num)}
              disabled={num > userCredits}
              className="h-10"
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
            className="flex-1 h-10"
            placeholder="Outro valor"
          />
          <span className="text-sm text-muted-foreground">leads</span>
        </div>
      </div>

      {/* Convênio - Always visible */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          Convênio
        </Label>
        <Select value={selectedConvenio} onValueChange={setSelectedConvenio}>
          <SelectTrigger className="h-11 bg-background">
            <SelectValue placeholder="Todos os convênios" />
          </SelectTrigger>
          <SelectContent className="bg-popover border shadow-lg z-[100]">
            <SelectItem value="all">Todos os convênios</SelectItem>
            {availableConvenios.map((c) => (
              <SelectItem key={c.convenio} value={c.convenio}>
                <span className="flex items-center justify-between w-full gap-4">
                  <span>{c.convenio}</span>
                  <Badge variant="secondary" className="text-xs">
                    {c.count}
                  </Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* DDDs - Featured Section */}
      {availableDDDs.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            Região (DDD)
            {selectedDDDs.length > 0 && (
              <Badge variant="default" className="ml-2 text-xs">
                {selectedDDDs.length} selecionado{selectedDDDs.length > 1 ? 's' : ''}
              </Badge>
            )}
          </Label>
          
          {/* Featured DDDs - Grid maior */}
          <div className="grid grid-cols-5 gap-2">
            {featuredDDDsWithCount.map((d) => (
              <button
                key={d.ddd}
                onClick={() => toggleDDD(d.ddd)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all",
                  "hover:border-primary/50 hover:bg-primary/5",
                  selectedDDDs.includes(d.ddd)
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background"
                )}
              >
                <span className="text-lg font-bold">{d.ddd}</span>
                <span className="text-[10px] text-muted-foreground">{d.count}</span>
              </button>
            ))}
          </div>

          {/* Other DDDs - Collapsible */}
          {otherDDDs.length > 0 && (
            <div className="space-y-2">
              <button 
                onClick={() => setShowAllDDDs(!showAllDDDs)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
              >
                {showAllDDDs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span>{showAllDDDs ? 'Ocultar' : 'Ver'} outros DDDs ({otherDDDs.length})</span>
              </button>
              
              {showAllDDDs && (
                <ScrollArea className="h-32 rounded-lg border p-2">
                  <div className="flex flex-wrap gap-1.5">
                    {otherDDDs.map((d) => (
                      <Badge
                        key={d.ddd}
                        variant={selectedDDDs.includes(d.ddd) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-all text-xs py-1 px-2",
                          selectedDDDs.includes(d.ddd) && "ring-2 ring-primary/30"
                        )}
                        onClick={() => toggleDDD(d.ddd)}
                      >
                        {d.ddd}
                        <span className="ml-1 opacity-60">({d.count})</span>
                      </Badge>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          {/* Clear DDDs */}
          {selectedDDDs.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedDDDs([])}
              className="text-xs h-8"
            >
              Limpar seleção
            </Button>
          )}
        </div>
      )}

      {/* Tags - Optional */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            Tags
            <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </Label>
          <ScrollArea className="h-24 rounded-lg border p-2">
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((t) => (
                <Badge
                  key={t.tag}
                  variant={selectedTags.includes(t.tag) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all text-xs",
                    selectedTags.includes(t.tag) && "ring-2 ring-primary/30"
                  )}
                  onClick={() => toggleTag(t.tag)}
                >
                  {t.tag}
                  <span className="ml-1 opacity-60">({t.count})</span>
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Submit Button */}
      <Button 
        className="w-full h-12 text-base font-semibold mt-4" 
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
        <SheetContent side="bottom" className="h-[90vh] overflow-hidden flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Pedir Novos Leads
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {content}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Pedir Novos Leads
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-4 -mr-4">
          {content}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
