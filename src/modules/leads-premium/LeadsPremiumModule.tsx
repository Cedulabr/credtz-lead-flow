import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { PipelineView } from "./views/PipelineView";
import { LeadsListView } from "./views/LeadsListView";
import { MetricsDashboard } from "./views/MetricsDashboard";
import { SimulationsDashboard } from "./views/SimulationsDashboard";
import { LeadDetailDrawer } from "./components/LeadDetailDrawer";
import { MobileActionBar } from "./components/MobileActionBar";
import { RequestLeadsWizard } from "./components/RequestLeadsWizard";
import { useLeadsPremium } from "./hooks/useLeadsPremium";
import { Lead, LeadFilters, BANKS_LIST } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LayoutGrid, List, BarChart3, Calculator, Plus, CreditCard, Filter } from "lucide-react";

export function LeadsPremiumModule() {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<"pipeline" | "list" | "metrics" | "simulations">("list");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [pendingSimulationsCount, setPendingSimulationsCount] = useState(0);

  // Inline Simulation Modal
  const [showSimulationModal, setShowSimulationModal] = useState(false);
  const [simulationLead, setSimulationLead] = useState<Lead | null>(null);
  const [simulationForm, setSimulationForm] = useState({ banco: "", produto: "", notes: "" });
  const [isSimProcessing, setIsSimProcessing] = useState(false);

  // Inline Typing Modal
  const [showTypingModal, setShowTypingModal] = useState(false);
  const [typingLead, setTypingLead] = useState<Lead | null>(null);
  const [typingForm, setTypingForm] = useState({ banco: "", valor: "", parcela: "", notes: "" });
  const [isTypProcessing, setIsTypProcessing] = useState(false);

  const {
    leads,
    users,
    isLoading,
    userCredits,
    stats,
    fetchLeads,
    updateLeadStatus,
    requestLeads,
    canEditLead
  } = useLeadsPremium();

  // Fetch pending simulations count
  useEffect(() => {
    const fetchPendingSimulations = async () => {
      const { count } = await supabase
        .from('activate_leads_simulations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      setPendingSimulationsCount(count || 0);
    };

    fetchPendingSimulations();
    const interval = setInterval(fetchPendingSimulations, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => setSelectedLead(null), 300);
  };

  const handleStatusChange = async (leadId: string, newStatus: string, additionalData?: Partial<Lead>) => {
    const success = await updateLeadStatus(leadId, newStatus, additionalData);
    if (success && selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, status: newStatus, ...additionalData } : null);
    }
    return success;
  };

  const handleRequestLeads = async (options: { convenio?: string; count: number; ddds?: string[]; tags?: string[] }) => {
    const success = await requestLeads(options);
    if (success) {
      setIsRequestModalOpen(false);
    }
    return success;
  };

  // Inline handlers for list-level simulation
  const handleListSimulation = (lead: Lead) => {
    setSimulationLead(lead);
    setSimulationForm({ banco: "", produto: "", notes: "" });
    setShowSimulationModal(true);
  };

  const handleSimulationSubmit = async () => {
    if (!simulationLead || !simulationForm.banco) {
      toast({ title: "Selecione o banco", variant: "destructive" });
      return;
    }

    setIsSimProcessing(true);
    try {
      const { error } = await supabase
        .from('activate_leads_simulations')
        .insert({
          lead_id: simulationLead.id,
          requested_by: user?.id,
          banco: simulationForm.banco,
          produto: simulationForm.produto,
          notes: simulationForm.notes,
          status: 'pending'
        });

      if (error) throw error;
      toast({ title: "Simulação solicitada!", description: "O operador será notificado." });
      setShowSimulationModal(false);
      fetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsSimProcessing(false);
    }
  };

  // Inline handlers for list-level typing
  const handleListTyping = (lead: Lead) => {
    setTypingLead(lead);
    setTypingForm({ banco: "", valor: "", parcela: "", notes: "" });
    setShowTypingModal(true);
  };

  const handleTypingSubmit = async () => {
    if (!typingLead || !typingForm.banco) {
      toast({ title: "Selecione o banco", variant: "destructive" });
      return;
    }

    setIsTypProcessing(true);
    try {
      const { error } = await supabase
        .from('propostas')
        .insert({
          "Nome do cliente": typingLead.name,
          cpf: typingLead.cpf,
          telefone: typingLead.phone,
          convenio: typingLead.convenio,
          banco: typingForm.banco,
          valor_proposta: typingForm.valor ? parseFloat(typingForm.valor) : null,
          installments: typingForm.parcela ? parseInt(typingForm.parcela.replace(/\D/g, '')) : null,
          pipeline_stage: "digitacao",
          client_status: "aguardando_digitacao",
          origem_lead: "leads_premium",
          created_by_id: user?.id,
          assigned_to: user?.id,
          notes: typingForm.notes || 'Digitação solicitada de Leads Premium'
        });

      if (error) throw error;
      await updateLeadStatus(typingLead.id, 'cliente_fechado');
      toast({ title: "Digitação solicitada!", description: "Lead convertido para proposta." });
      setShowTypingModal(false);
      fetchLeads();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setIsTypProcessing(false);
    }
  };

  // Handle status change from list item
  const handleListStatusChange = (lead: Lead, newStatus: string) => {
    handleStatusChange(lead.id, newStatus);
  };

  // Calculate active filters count
  const [activeFiltersCount] = useState(0);

  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background pb-16">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Leads Premium</h1>
              <p className="text-sm text-muted-foreground">
                {stats.total} leads · {stats.novos} novos
              </p>
            </div>
            <div className="flex items-center gap-2">
              {pendingSimulationsCount > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {pendingSimulationsCount} simulações
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* View Tabs - No Pipeline on mobile */}
        <div className="border-b px-4 py-2 flex gap-2 overflow-x-auto">
          <Button
            variant={activeView === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveView("list")}
            className="shrink-0"
          >
            <List className="h-4 w-4 mr-1" />
            Lista
          </Button>
          <Button
            variant={activeView === "metrics" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveView("metrics")}
            className="shrink-0"
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Métricas
          </Button>
          <Button
            variant={activeView === "simulations" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveView("simulations")}
            className="shrink-0 relative"
          >
            <Calculator className="h-4 w-4 mr-1" />
            Simulações
            {pendingSimulationsCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
              >
                {pendingSimulationsCount}
              </Badge>
            )}
          </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeView === "list" && (
              <motion.div
                key="list"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full"
              >
                <LeadsListView
                  leads={leads}
                  users={users}
                  isLoading={isLoading}
                  onLeadSelect={handleLeadSelect}
                  onRefresh={fetchLeads}
                  onSimulation={handleListSimulation}
                  onTyping={handleListTyping}
                  onStatusChange={handleListStatusChange}
                  canEditLead={canEditLead}
                />
              </motion.div>
            )}
            {activeView === "metrics" && (
              <motion.div
                key="metrics"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full overflow-auto"
              >
                <MetricsDashboard 
                  leads={leads}
                  stats={stats}
                  userCredits={userCredits}
                />
              </motion.div>
            )}
            {activeView === "simulations" && (
              <motion.div
                key="simulations"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full"
              >
                <SimulationsDashboard />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Fixed Action Bar */}
        <MobileActionBar
          userCredits={userCredits}
          onRequestLeads={() => setIsRequestModalOpen(true)}
          onOpenFilters={() => setIsFiltersOpen(true)}
          onOpenSimulations={() => setActiveView("simulations")}
          activeFiltersCount={activeFiltersCount}
          pendingSimulations={pendingSimulationsCount}
        />

        {/* Lead Detail Drawer */}
        <LeadDetailDrawer
          lead={selectedLead}
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          onStatusChange={handleStatusChange}
          canEdit={selectedLead ? canEditLead(selectedLead) : false}
          users={users}
        />

        {/* Request Leads Wizard */}
        <RequestLeadsWizard
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          userCredits={userCredits}
          onRequestLeads={handleRequestLeads}
        />

        {/* Inline Simulation Modal */}
        <SimulationModal
          open={showSimulationModal}
          onOpenChange={setShowSimulationModal}
          lead={simulationLead}
          form={simulationForm}
          onFormChange={setSimulationForm}
          onSubmit={handleSimulationSubmit}
          isProcessing={isSimProcessing}
        />

        {/* Inline Typing Modal */}
        <TypingModal
          open={showTypingModal}
          onOpenChange={setShowTypingModal}
          lead={typingLead}
          form={typingForm}
          onFormChange={setTypingForm}
          onSubmit={handleTypingSubmit}
          isProcessing={isTypProcessing}
        />
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="space-y-6 p-6">
      {/* Desktop Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads Premium</h1>
          <p className="text-muted-foreground">
            Gerencie seus leads e acompanhe o funil de conversão
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right px-4 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-primary">{userCredits}</p>
            </div>
            <p className="text-xs text-muted-foreground">créditos disponíveis</p>
          </div>
          <Button onClick={() => setIsRequestModalOpen(true)} disabled={userCredits <= 0}>
            <Plus className="h-4 w-4 mr-2" />
            Pedir Leads
          </Button>
        </div>
      </div>

      {/* Desktop Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Métricas
            </TabsTrigger>
            <TabsTrigger value="simulations" className="gap-2 relative">
              <Calculator className="h-4 w-4" />
              Simulações
              {pendingSimulationsCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-1 h-5 px-1.5 text-xs"
                >
                  {pendingSimulationsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="list" className="mt-6">
          <LeadsListView
            leads={leads}
            users={users}
            isLoading={isLoading}
            onLeadSelect={handleLeadSelect}
            onRefresh={fetchLeads}
            onSimulation={handleListSimulation}
            onTyping={handleListTyping}
            onStatusChange={handleListStatusChange}
            canEditLead={canEditLead}
          />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-6">
          <PipelineView 
            leads={leads}
            isLoading={isLoading}
            onLeadSelect={handleLeadSelect}
            stats={stats}
          />
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <MetricsDashboard 
            leads={leads}
            stats={stats}
            userCredits={userCredits}
          />
        </TabsContent>

        <TabsContent value="simulations" className="mt-6">
          <SimulationsDashboard />
        </TabsContent>
      </Tabs>

      {/* Lead Detail Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onStatusChange={handleStatusChange}
        canEdit={selectedLead ? canEditLead(selectedLead) : false}
        users={users}
      />

      {/* Request Leads Wizard */}
      <RequestLeadsWizard
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        userCredits={userCredits}
        onRequestLeads={handleRequestLeads}
      />

      {/* Inline Simulation Modal */}
      <SimulationModal
        open={showSimulationModal}
        onOpenChange={setShowSimulationModal}
        lead={simulationLead}
        form={simulationForm}
        onFormChange={setSimulationForm}
        onSubmit={handleSimulationSubmit}
        isProcessing={isSimProcessing}
      />

      {/* Inline Typing Modal */}
      <TypingModal
        open={showTypingModal}
        onOpenChange={setShowTypingModal}
        lead={typingLead}
        form={typingForm}
        onFormChange={setTypingForm}
        onSubmit={handleTypingSubmit}
        isProcessing={isTypProcessing}
      />
    </div>
  );
}

// ----- Extracted Modal Components -----

function SimulationModal({ 
  open, onOpenChange, lead, form, onFormChange, onSubmit, isProcessing 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  form: { banco: string; produto: string; notes: string };
  onFormChange: (form: { banco: string; produto: string; notes: string }) => void;
  onSubmit: () => void;
  isProcessing: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Solicitar Simulação
          </DialogTitle>
        </DialogHeader>
        {lead && (
          <div className="p-3 rounded-lg bg-muted/50 border mb-2">
            <p className="font-semibold">{lead.name}</p>
            <p className="text-sm text-muted-foreground">{lead.phone}</p>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <Label>Banco *</Label>
            <Select value={form.banco} onValueChange={(v) => onFormChange({ ...form, banco: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
              <SelectContent>
                {BANKS_LIST.map(bank => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Produto</Label>
            <Select value={form.produto} onValueChange={(v) => onFormChange({ ...form, produto: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="novo">Novo Empréstimo</SelectItem>
                <SelectItem value="portabilidade">Portabilidade</SelectItem>
                <SelectItem value="refinanciamento">Refinanciamento</SelectItem>
                <SelectItem value="cartao">Cartão Consignado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea 
              value={form.notes} 
              onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={isProcessing || !form.banco}>
            {isProcessing ? "Enviando..." : "Solicitar Simulação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TypingModal({ 
  open, onOpenChange, lead, form, onFormChange, onSubmit, isProcessing 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  form: { banco: string; valor: string; parcela: string; notes: string };
  onFormChange: (form: { banco: string; valor: string; parcela: string; notes: string }) => void;
  onSubmit: () => void;
  isProcessing: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-700 text-lg">📝</span>
            </span>
            Solicitar Digitação
          </DialogTitle>
        </DialogHeader>
        {lead && (
          <div className="p-3 rounded-lg bg-muted/50 border mb-2">
            <p className="font-semibold">{lead.name}</p>
            <p className="text-sm text-muted-foreground">{lead.phone} {lead.cpf ? `· CPF: ${lead.cpf}` : ''}</p>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <Label>Banco *</Label>
            <Select value={form.banco} onValueChange={(v) => onFormChange({ ...form, banco: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
              <SelectContent>
                {BANKS_LIST.map(bank => (
                  <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor da Operação</Label>
              <Input 
                type="number"
                value={form.valor} 
                onChange={(e) => onFormChange({ ...form, valor: e.target.value })}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label>Parcela</Label>
              <Input 
                value={form.parcela} 
                onChange={(e) => onFormChange({ ...form, parcela: e.target.value })}
                placeholder="Ex: 84x"
              />
            </div>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea 
              value={form.notes} 
              onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button 
            onClick={onSubmit} 
            disabled={isProcessing || !form.banco}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isProcessing ? "Enviando..." : "Enviar Digitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
