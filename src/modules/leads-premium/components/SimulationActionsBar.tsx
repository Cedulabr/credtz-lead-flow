import { useState } from "react";
import { Lead } from "../types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calculator, FileText, Loader2, Send } from "lucide-react";
import { BANKS_LIST } from "../types";
import { ProductSelectCard } from "./ProductEducationPopover";

interface SimulationActionsBarProps {
  lead: Lead;
  onSuccess: () => void;
}

export function SimulationActionsBar({ lead, onSuccess }: SimulationActionsBarProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showTypingModal, setShowTypingModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [simulationForm, setSimulationForm] = useState({
    banco: "",
    produto: "",
    notes: ""
  });
  
  const [typingForm, setTypingForm] = useState({
    banco: "",
    valor: "",
    parcela: "",
    notes: ""
  });

  const handleRequestSimulation = async () => {
    if (!simulationForm.banco || !simulationForm.produto) {
      toast({
        title: "Erro",
        description: "Selecione o banco e o produto para simulação",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create simulation request
      const { error } = await supabase
        .from('activate_leads_simulations')
        .insert({
          lead_id: lead.id,
          requested_by: user?.id,
          banco: simulationForm.banco,
          produto: simulationForm.produto,
          notes: simulationForm.notes,
          status: 'pending'
        });

      if (error) throw error;

      // Update lead status
      await supabase
        .from('leads')
        .update({
          simulation_status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      toast({
        title: "Simulação solicitada!",
        description: "O operador será notificado para processar a simulação."
      });

      setShowSimulationModal(false);
      setSimulationForm({ banco: "", produto: "", notes: "" });
      onSuccess();
    } catch (error: any) {
      console.error('Error requesting simulation:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao solicitar simulação",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestTyping = async () => {
    if (!typingForm.banco) {
      toast({
        title: "Erro",
        description: "Selecione o banco",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create typing/proposal request in propostas table
      const { error } = await supabase
        .from('propostas')
        .insert({
          "Nome do cliente": lead.name,
          cpf: lead.cpf,
          telefone: lead.phone,
          convenio: lead.convenio,
          banco: typingForm.banco,
          valor_operacao: typingForm.valor ? parseFloat(typingForm.valor) : null,
          parcela: typingForm.parcela || null,
          pipeline_stage: "digitacao",
          client_status: "aguardando_digitacao",
          origem_lead: "leads_premium",
          created_by_id: user?.id,
          assigned_to: user?.id,
          notes: typingForm.notes || `Digitação solicitada de Leads Premium`
        });

      if (error) throw error;

      // Update lead status
      await supabase
        .from('leads')
        .update({
          status: 'cliente_fechado',
          updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      toast({
        title: "Digitação solicitada!",
        description: "Lead convertido para proposta em digitação."
      });

      setShowTypingModal(false);
      setTypingForm({ banco: "", valor: "", parcela: "", notes: "" });
      onSuccess();
    } catch (error: any) {
      console.error('Error requesting typing:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao solicitar digitação",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const SimulationModalContent = () => (
    <ScrollArea className="max-h-[70vh]">
      <div className="space-y-4 py-4 px-1">
        <div className="p-3 rounded-lg bg-muted/50">
          <p className="text-sm font-medium">{lead.name}</p>
          <p className="text-xs text-muted-foreground">CPF: {lead.cpf || "Não informado"}</p>
          <p className="text-xs text-muted-foreground">Convênio: {lead.convenio}</p>
        </div>

        {/* Product Selection with Education */}
        <div>
          <Label className="mb-3 block">Tipo de Produto *</Label>
          <div className="space-y-2">
            <ProductSelectCard 
              productId="portabilidade" 
              isSelected={simulationForm.produto === "portabilidade"}
              onSelect={(id) => setSimulationForm(prev => ({ ...prev, produto: id }))}
            />
            <ProductSelectCard 
              productId="refinanciamento" 
              isSelected={simulationForm.produto === "refinanciamento"}
              onSelect={(id) => setSimulationForm(prev => ({ ...prev, produto: id }))}
            />
            <ProductSelectCard 
              productId="novo" 
              isSelected={simulationForm.produto === "novo"}
              onSelect={(id) => setSimulationForm(prev => ({ ...prev, produto: id }))}
            />
            <ProductSelectCard 
              productId="cartao" 
              isSelected={simulationForm.produto === "cartao"}
              onSelect={(id) => setSimulationForm(prev => ({ ...prev, produto: id }))}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Banco *</Label>
          <Select 
            value={simulationForm.banco} 
            onValueChange={(v) => setSimulationForm(prev => ({ ...prev, banco: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o banco" />
            </SelectTrigger>
            <SelectContent>
              {BANKS_LIST.map(bank => (
                <SelectItem key={bank} value={bank}>{bank}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Observações</Label>
          <Textarea
            placeholder="Informações adicionais para simulação..."
            value={simulationForm.notes}
            onChange={(e) => setSimulationForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />
        </div>

        <Button 
          className="w-full h-12" 
          onClick={handleRequestSimulation}
          disabled={isSubmitting || !simulationForm.banco || !simulationForm.produto}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Solicitando...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Solicitar Simulação
            </>
          )}
        </Button>
      </div>
    </ScrollArea>
  );

  const TypingModalContent = () => (
    <div className="space-y-4 py-4">
      <div className="p-3 rounded-lg bg-muted/50">
        <p className="text-sm font-medium">{lead.name}</p>
        <p className="text-xs text-muted-foreground">CPF: {lead.cpf || "Não informado"}</p>
        <p className="text-xs text-muted-foreground">Convênio: {lead.convenio}</p>
      </div>

      <div className="space-y-2">
        <Label>Banco *</Label>
        <Select 
          value={typingForm.banco} 
          onValueChange={(v) => setTypingForm(prev => ({ ...prev, banco: v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o banco" />
          </SelectTrigger>
          <SelectContent>
            {BANKS_LIST.map(bank => (
              <SelectItem key={bank} value={bank}>{bank}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Valor (R$)</Label>
          <Input
            placeholder="0,00"
            value={typingForm.valor}
            onChange={(e) => setTypingForm(prev => ({ ...prev, valor: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Parcela</Label>
          <Input
            placeholder="R$ 0,00"
            value={typingForm.parcela}
            onChange={(e) => setTypingForm(prev => ({ ...prev, parcela: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea
          placeholder="Informações para digitação..."
          value={typingForm.notes}
          onChange={(e) => setTypingForm(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
        />
      </div>

      <Button 
        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700" 
        onClick={handleRequestTyping}
        disabled={isSubmitting || !typingForm.banco}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Solicitando...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Solicitar Digitação
          </>
        )}
      </Button>
    </div>
  );

  return (
    <>
      {/* Action Buttons */}
      <div className={`grid grid-cols-2 gap-2 ${isMobile ? 'mt-3' : ''}`}>
        <Button 
          variant="outline"
          className="h-11"
          onClick={() => setShowSimulationModal(true)}
        >
          <Calculator className="h-4 w-4 mr-2" />
          Simulação
        </Button>
        <Button 
          className="h-11 bg-emerald-600 hover:bg-emerald-700"
          onClick={() => setShowTypingModal(true)}
        >
          <FileText className="h-4 w-4 mr-2" />
          Digitação
        </Button>
      </div>

      {/* Simulation Modal */}
      {isMobile ? (
        <Sheet open={showSimulationModal} onOpenChange={setShowSimulationModal}>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Solicitar Simulação
              </SheetTitle>
            </SheetHeader>
            <SimulationModalContent />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={showSimulationModal} onOpenChange={setShowSimulationModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Solicitar Simulação
              </DialogTitle>
            </DialogHeader>
            <SimulationModalContent />
          </DialogContent>
        </Dialog>
      )}

      {/* Typing Modal */}
      {isMobile ? (
        <Sheet open={showTypingModal} onOpenChange={setShowTypingModal}>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Solicitar Digitação
              </SheetTitle>
            </SheetHeader>
            <TypingModalContent />
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={showTypingModal} onOpenChange={setShowTypingModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Solicitar Digitação
              </DialogTitle>
            </DialogHeader>
            <TypingModalContent />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}