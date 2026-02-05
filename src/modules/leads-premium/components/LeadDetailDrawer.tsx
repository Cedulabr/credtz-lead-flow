import { useState } from "react";
import { Lead, UserProfile, PIPELINE_STAGES, HistoryEntry, REJECTION_REASONS, BANKS_LIST } from "../types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Phone, 
  MessageCircle, 
  User, 
  MapPin, 
  Calendar, 
  Clock, 
  FileText,
  ChevronDown,
  ChevronUp,
  History,
  ArrowRight,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Calculator,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductSelectCard } from "./ProductEducationPopover";

interface LeadDetailDrawerProps {
  lead: Lead | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, newStatus: string, additionalData?: Partial<Lead>) => Promise<boolean>;
  canEdit: boolean;
  users: UserProfile[];
}

export function LeadDetailDrawer({ 
  lead, 
  isOpen, 
  onClose, 
  onStatusChange,
  canEdit,
  users 
}: LeadDetailDrawerProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>(["info", "actions"]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal states
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [showTypingModal, setShowTypingModal] = useState(false);
  const [rejectionForm, setRejectionForm] = useState({
    reason: "",
    offeredValue: "",
    bank: "",
    description: ""
  });
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
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

  if (!lead) return null;

  const config = PIPELINE_STAGES[lead.status] || PIPELINE_STAGES.new_lead;

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const clean = phone.replace(/\D/g, "");
    if (clean.length >= 10) {
      return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
    }
    return phone;
  };

  const handleWhatsApp = () => {
    const phone = lead.phone.replace(/\D/g, "");
    const firstName = lead.name.split(' ')[0];
    const message = encodeURIComponent(`Olá ${firstName}, tudo bem?`);
    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
  };

  const handleCall = () => {
    window.open(`tel:+55${lead.phone.replace(/\D/g, "")}`, "_blank");
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleQuickStatusChange = async (newStatus: string) => {
    if (!canEdit) {
      toast({
        title: "Sem permissão",
        description: "Você não pode editar este lead.",
        variant: "destructive"
      });
      return;
    }

    if (newStatus === 'recusou_oferta') {
      setRejectionForm({ reason: "", offeredValue: "", bank: "", description: "" });
      setShowRejectionModal(true);
      return;
    }

    if (newStatus === 'agendamento') {
      setScheduleDate(format(new Date(), 'yyyy-MM-dd'));
      setScheduleTime("10:00");
      setShowScheduleModal(true);
      return;
    }

    setIsProcessing(true);
    await onStatusChange(lead.id, newStatus);
    setIsProcessing(false);
  };

  const handleRejectionSubmit = async () => {
    if (!rejectionForm.reason || !rejectionForm.description) {
      toast({
        title: "Erro",
        description: "Preencha o motivo e a descrição",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    const offeredValue = rejectionForm.offeredValue 
      ? parseFloat(rejectionForm.offeredValue.replace(/\D/g, '')) / 100 
      : undefined;

    await onStatusChange(lead.id, 'recusou_oferta', {
      rejection_reason: rejectionForm.reason,
      rejection_offered_value: offeredValue,
      rejection_bank: rejectionForm.bank,
      rejection_description: rejectionForm.description
    });

    setShowRejectionModal(false);
    setIsProcessing(false);
  };

  const handleScheduleSubmit = async () => {
    if (!scheduleDate || !scheduleTime) {
      toast({
        title: "Erro",
        description: "Preencha data e horário",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    await onStatusChange(lead.id, 'agendamento', {
      future_contact_date: scheduleDate,
      future_contact_time: scheduleTime
    });

    setShowScheduleModal(false);
    setIsProcessing(false);
  };

  const handleSimulationRequest = async () => {
    if (!simulationForm.banco) {
      toast({
        title: "Erro",
        description: "Selecione o banco para simulação",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
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

      toast({
        title: "Simulação solicitada!",
        description: "O operador será notificado para processar a simulação."
      });

      setShowSimulationModal(false);
      setSimulationForm({ banco: "", produto: "", notes: "" });
    } catch (error: any) {
      console.error('Error requesting simulation:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao solicitar simulação",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTypingRequest = async () => {
    if (!typingForm.banco) {
      toast({
        title: "Erro",
        description: "Selecione o banco",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
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
      await onStatusChange(lead.id, 'cliente_fechado');

      toast({
        title: "Digitação solicitada!",
        description: "Lead convertido para proposta em digitação."
      });

      setShowTypingModal(false);
      setTypingForm({ banco: "", valor: "", parcela: "", notes: "" });
    } catch (error: any) {
      console.error('Error requesting typing:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao solicitar digitação",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Parse history
  const history: HistoryEntry[] = lead.history 
    ? (typeof lead.history === 'string' ? JSON.parse(lead.history) : lead.history)
    : [];

  const sortedHistory = [...history]
    .filter(entry => entry.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const content = (
    <>
      <SheetHeader className="px-4 py-4 border-b bg-muted/30">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <SheetTitle className="text-xl font-bold">{lead.name}</SheetTitle>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn("text-xs", config.bgColor, config.textColor, "border-0")}
              >
                {config.label}
              </Badge>
              {lead.tag && (
                <Badge variant="secondary" className="text-xs">{lead.tag}</Badge>
              )}
            </div>
          </div>
        </div>
      </SheetHeader>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Quick Contact Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              className="h-14 bg-green-600 hover:bg-green-700"
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              WhatsApp
            </Button>
            <Button 
              variant="outline" 
              className="h-14"
              onClick={handleCall}
            >
              <Phone className="h-5 w-5 mr-2" />
              Ligar
            </Button>
          </div>

          {/* Lead Info */}
          <Collapsible 
            open={expandedSections.includes("info")}
            onOpenChange={() => toggleSection("info")}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                <span className="flex items-center gap-2 font-semibold">
                  <User className="h-4 w-4" />
                  Dados do Cliente
                </span>
                {expandedSections.includes("info") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 px-3 pb-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="font-medium">{formatPhone(lead.phone)}</p>
                </div>
                {lead.phone2 && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground">Telefone 2</p>
                    <p className="font-medium">{formatPhone(lead.phone2)}</p>
                  </div>
                )}
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">CPF</p>
                  <p className="font-medium">{lead.cpf || "Não informado"}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Convênio</p>
                  <p className="font-medium">{lead.convenio || "Não informado"}</p>
                </div>
              </div>
              {lead.notes && (
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Observações</p>
                  <p className="text-sm">{lead.notes}</p>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                Criado em {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Actions */}
          {canEdit && (
            <Collapsible 
              open={expandedSections.includes("actions")}
              onOpenChange={() => toggleSection("actions")}
            >
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                  <span className="flex items-center gap-2 font-semibold">
                    <Edit className="h-4 w-4" />
                    Ações Comerciais
                  </span>
                  {expandedSections.includes("actions") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 px-3 pb-3">
                {/* Primary Actions - Simulação e Digitação */}
                {["new_lead", "em_andamento", "aguardando_retorno"].includes(lead.status) && (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <Button 
                      variant="outline"
                      className="h-12 flex-col gap-1"
                      onClick={() => setShowSimulationModal(true)}
                    >
                      <Calculator className="h-4 w-4" />
                      <span className="text-xs">Simulação</span>
                    </Button>
                    <Button 
                      className="h-12 flex-col gap-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => setShowTypingModal(true)}
                    >
                      <FileText className="h-4 w-4" />
                      <span className="text-xs">Digitação</span>
                    </Button>
                  </div>
                )}

                {lead.status === "new_lead" && (
                  <Button 
                    className="w-full justify-start"
                    variant="secondary"
                    onClick={() => handleQuickStatusChange("em_andamento")}
                    disabled={isProcessing}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Iniciar Atendimento
                  </Button>
                )}

                {["em_andamento", "aguardando_retorno", "new_lead"].includes(lead.status) && (
                  <>
                    <Button 
                      className="w-full justify-start"
                      variant="default"
                      onClick={() => handleQuickStatusChange("cliente_fechado")}
                      disabled={isProcessing}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Cliente Fechou
                    </Button>
                    <Button 
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => handleQuickStatusChange("agendamento")}
                      disabled={isProcessing}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Agendar Retorno
                    </Button>
                    <Button 
                      className="w-full justify-start"
                      variant="outline"
                      onClick={() => handleQuickStatusChange("aguardando_retorno")}
                      disabled={isProcessing}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Aguardando Retorno
                    </Button>
                  </>
                )}

                <Separator />

                <p className="text-xs text-muted-foreground font-medium">Marcar como perdido:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                    onClick={() => handleQuickStatusChange("recusou_oferta")}
                    disabled={isProcessing}
                  >
                    Recusou Oferta
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                    onClick={() => handleQuickStatusChange("sem_interesse")}
                    disabled={isProcessing}
                  >
                    Sem Interesse
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                    onClick={() => handleQuickStatusChange("sem_retorno")}
                    disabled={isProcessing}
                  >
                    Sem Retorno
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                    onClick={() => handleQuickStatusChange("nao_e_whatsapp")}
                    disabled={isProcessing}
                  >
                    Não é WhatsApp
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-xs"
                    onClick={() => handleQuickStatusChange("nao_e_cliente")}
                    disabled={isProcessing}
                  >
                    Não é o Cliente
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <Separator />

          {/* History */}
          <Collapsible 
            open={expandedSections.includes("history")}
            onOpenChange={() => toggleSection("history")}
          >
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-3 h-auto">
                <span className="flex items-center gap-2 font-semibold">
                  <History className="h-4 w-4" />
                  Histórico ({sortedHistory.length})
                </span>
                {expandedSections.includes("history") ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
              {sortedHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum histórico registrado
                </p>
              ) : (
                <div className="space-y-3">
                  {sortedHistory.slice(0, 10).map((entry, index) => (
                    <div key={index} className="relative pl-6 pb-3 border-l-2 border-muted last:border-l-0">
                      <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-primary" />
                      <div className="text-sm">
                        <p className="font-medium">{entry.note || entry.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.user_name} · {format(new Date(entry.timestamp), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Rejection Modal */}
      <Dialog open={showRejectionModal} onOpenChange={setShowRejectionModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Recusa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Motivo da Recusa</Label>
              <Select 
                value={rejectionForm.reason} 
                onValueChange={(v) => setRejectionForm(prev => ({ ...prev, reason: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map(reason => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {rejectionForm.reason === 'valor_baixo' && (
              <>
                <div>
                  <Label>Valor Ofertado</Label>
                  <Input
                    placeholder="R$ 0,00"
                    value={rejectionForm.offeredValue}
                    onChange={(e) => setRejectionForm(prev => ({ ...prev, offeredValue: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Banco</Label>
                  <Select 
                    value={rejectionForm.bank} 
                    onValueChange={(v) => setRejectionForm(prev => ({ ...prev, bank: v }))}
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
              </>
            )}
            <div>
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o motivo da recusa..."
                value={rejectionForm.description}
                onChange={(e) => setRejectionForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRejectionSubmit} disabled={isProcessing}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agendar Retorno</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Horário</Label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleScheduleSubmit} disabled={isProcessing}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Simulation Modal with Product Education */}
      <Dialog open={showSimulationModal} onOpenChange={setShowSimulationModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Solicitar Simulação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">{lead?.name}</p>
              <p className="text-xs text-muted-foreground">CPF: {lead?.cpf || "Não informado"}</p>
              <p className="text-xs text-muted-foreground">Convênio: {lead?.convenio || "Não informado"}</p>
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

            <div>
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
            
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Informações adicionais..."
                value={simulationForm.notes}
                onChange={(e) => setSimulationForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSimulationModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSimulationRequest} 
              disabled={isProcessing || !simulationForm.banco || !simulationForm.produto}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Solicitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Typing Modal */}
      <Dialog open={showTypingModal} onOpenChange={setShowTypingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Solicitar Digitação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-sm font-medium">{lead?.name}</p>
              <p className="text-xs text-muted-foreground">CPF: {lead?.cpf || "Não informado"}</p>
            </div>
            <div>
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
              <div>
                <Label>Valor (R$)</Label>
                <Input
                  placeholder="0,00"
                  value={typingForm.valor}
                  onChange={(e) => setTypingForm(prev => ({ ...prev, valor: e.target.value }))}
                />
              </div>
              <div>
                <Label>Parcela</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={typingForm.parcela}
                  onChange={(e) => setTypingForm(prev => ({ ...prev, parcela: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea
                placeholder="Informações para digitação..."
                value={typingForm.notes}
                onChange={(e) => setTypingForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTypingModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleTypingRequest} 
              disabled={isProcessing || !typingForm.banco}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Solicitar Digitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col">
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[480px] sm:max-w-[480px] p-0 flex flex-col">
        {content}
      </SheetContent>
    </Sheet>
  );
}
