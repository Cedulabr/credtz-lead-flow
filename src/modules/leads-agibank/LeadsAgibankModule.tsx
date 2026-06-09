import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { PipelineView } from "../leads-premium/views/PipelineView";
import { LeadsListView } from "../leads-premium/views/LeadsListView";
import { MetricsDashboard } from "../leads-premium/views/MetricsDashboard";

import { LeadDetailDrawer } from "../leads-premium/components/LeadDetailDrawer";
import { MobileActionBar } from "../leads-premium/components/MobileActionBar";
import { RequestLeadsWizard } from "../leads-premium/components/RequestLeadsWizard";
import { PerformanceCreditModule } from "../leads-premium/components/PerformanceCreditModule";
import { OverdueBlockBanner } from "../leads-premium/components/OverdueBlockBanner";

import { useLeadsAgibank } from "./hooks/useLeadsAgibank";
import { useOverdueLeads } from "../leads-premium/hooks/useOverdueLeads";
import { LeadSalesPanel } from "../leads-premium/components/LeadSalesPanel";
import { Lead, LeadFilters, BANKS_LIST } from "../leads-premium/types";
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
import { LayoutGrid, List, BarChart3, Calculator, Plus, CreditCard, Filter, CalendarDays, Upload } from "lucide-react";
import { ImportBase } from "@/components/ImportBase";
import { addDays, format } from "date-fns";
import { CreditRequestModal } from "./components/CreditRequestModal";

export function AgibankLeadsModule() {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<"list" | "metrics">("list");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSalesPanelOpen, setIsSalesPanelOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isCreditRequestModalOpen, setIsCreditRequestModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  const [showImportBase, setShowImportBase] = useState(false);

  const isAdmin = profile?.role === 'admin';


  // Inline Typing Modal
  const [showTypingModal, setShowTypingModal] = useState(false);
  const [typingLead, setTypingLead] = useState<Lead | null>(null);
  const [typingForm, setTypingForm] = useState({ banco: "", valor: "", parcela: "", notes: "" });
  const [isTypProcessing, setIsTypProcessing] = useState(false);

  // Future Contact Modal
  const [showFutureContactModal, setShowFutureContactModal] = useState(false);
  const [futureContactLead, setFutureContactLead] = useState<Lead | null>(null);
  const [futureContactDate, setFutureContactDate] = useState("");
  const [isFCProcessing, setIsFCProcessing] = useState(false);

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
  } = useLeadsAgibank();

  const { overdueLeads, isBlocked: isOverdueBlocked } = useOverdueLeads();

  // Fetch pending simulations count

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

  const handleRequestLeads = async (options: {
    convenio?: string;
    count: number;
    ddds?: string[];
    tags?: string[];
    banco?: string | null;
    parcelaMin?: number | null;
    parcelaMax?: number | null;
    margemMin?: number | null;
  }) => {
    const success = await requestLeads(options);
    if (success) {
      setIsRequestModalOpen(false);
    }
    return success;
  };


  // Inline handlers for sales panel
  const handleOpenSalesPanel = (lead: Lead) => {
    setTypingLead(lead);
    setIsSalesPanelOpen(true);
  };


  // Future contact submit
  const handleFutureContactSubmit = async () => {
    if (!futureContactLead || !futureContactDate) {
      toast({ title: "Selecione a data de contato futuro", variant: "destructive" });
      return;
    }
    setIsFCProcessing(true);
    try {
      const success = await updateLeadStatus(futureContactLead.id, 'contato_futuro', {
        future_contact_date: futureContactDate
      });
      if (success) {
        toast({ title: "Contato futuro agendado!", description: `Data: ${format(new Date(futureContactDate + 'T12:00:00'), 'dd/MM/yyyy')}` });
        setShowFutureContactModal(false);
      }
    } finally {
      setIsFCProcessing(false);
    }
  };

  // Handle status change from list item
  const handleListStatusChange = (lead: Lead, newStatus: string) => {
    if (newStatus === 'contato_futuro') {
      setFutureContactLead(lead);
      setFutureContactDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
      setShowFutureContactModal(true);
      return;
    }
    handleStatusChange(lead.id, newStatus);
  };

  // Calculate active filters count
  const [activeFiltersCount] = useState(0);

  // Early-return: ImportBase em tela cheia (admin)
  if (showImportBase && isAdmin) {
    return <ImportBase onBack={() => setShowImportBase(false)} />;
  }

  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background pb-16">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">Leads AGibank</h1>
              <p className="text-sm text-muted-foreground">
                {stats.total} leads · {stats.novos} novos
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportBase(true)}
                  className="h-9"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Importar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Overdue Banner - Mobile */}
        {overdueLeads.length > 0 && (
          <div className="px-4 pt-2">
            <OverdueBlockBanner 
              overdueLeads={overdueLeads} 
              onLeadClick={(id) => {
                const lead = leads.find(l => l.id === id);
                if (lead) handleLeadSelect(lead);
              }}
            />
          </div>
        )}

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
                  onSalesPanel={handleOpenSalesPanel}
                  onTyping={() => {}}
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <MetricsDashboard 
                      leads={leads}
                      stats={stats}
                      userCredits={userCredits}
                      users={users}
                    />
                  </div>
                  <div className="lg:col-span-1 p-4">
                    <PerformanceCreditModule />
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Fixed Action Bar */}
        <MobileActionBar
          userCredits={userCredits}
          onRequestLeads={() => setIsRequestModalOpen(true)}
          onOpenFilters={() => setIsFiltersOpen(true)}
          activeFiltersCount={activeFiltersCount}
          isAdmin={isAdmin}
          onOpenImport={() => setShowImportBase(true)}
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



        {/* Lead Sales Panel */}
        <LeadSalesPanel
          lead={typingLead}
          isOpen={isSalesPanelOpen}
          onClose={() => setIsSalesPanelOpen(false)}
          onStatusChange={handleStatusChange}
                  onTyping={() => {}}

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
          <h1 className="text-3xl font-bold tracking-tight">Leads AGibank</h1>
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
          <Button onClick={() => setIsRequestModalOpen(true)} disabled={userCredits <= 0 || isOverdueBlocked}>
            <Plus className="h-4 w-4 mr-2" />
            {isOverdueBlocked ? 'Bloqueado' : 'Pedir Leads'}
          </Button>
          {/* Botão legado removido em favor do novo módulo unificado */}

          {isAdmin && (
            <Button variant="outline" onClick={() => setShowImportBase(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Leads
            </Button>
          )}
        </div>
      </div>

      {/* Overdue Banner - Desktop */}
      {overdueLeads.length > 0 && (
        <OverdueBlockBanner 
          overdueLeads={overdueLeads} 
          onLeadClick={(id) => {
            const lead = leads.find(l => l.id === id);
            if (lead) handleLeadSelect(lead);
          }}
        />
      )}

      {/* Desktop Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
            <TabsTrigger value="metrics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Métricas
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
            onSalesPanel={handleOpenSalesPanel}
          onTyping={() => {}}

            onStatusChange={handleListStatusChange}
            canEditLead={canEditLead}
          />
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MetricsDashboard 
                leads={leads}
                stats={stats}
                userCredits={userCredits}
                users={users}
              />
            </div>
            <div className="lg:col-span-1">
              <PerformanceCreditModule />
            </div>
          </div>
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

      <CreditRequestModal
        isOpen={isCreditRequestModalOpen}
        onClose={() => setIsCreditRequestModalOpen(false)}
        onSuccess={() => {}}
        performanceStats={stats}
      />



      {/* Future Contact Modal */}
      <Dialog open={showFutureContactModal} onOpenChange={setShowFutureContactModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-600" />
              Agendar Contato Futuro
            </DialogTitle>
          </DialogHeader>
          {futureContactLead && (
            <div className="p-3 rounded-lg bg-muted/50 border mb-2">
              <p className="font-semibold">{futureContactLead.name}</p>
              <p className="text-sm text-muted-foreground">{futureContactLead.phone}</p>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <Label>Data do contato futuro *</Label>
              <Input
                type="date"
                value={futureContactDate}
                onChange={(e) => setFutureContactDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFutureContactModal(false)}>Cancelar</Button>
            <Button
              onClick={handleFutureContactSubmit}
              disabled={isFCProcessing || !futureContactDate}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isFCProcessing ? "Salvando..." : "Agendar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----- Extracted Modal Components -----


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
            Digitar ao Cliente
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
              placeholder="Informações detalhadas para o Televendas..."
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
            {isProcessing ? "Enviando..." : "Digitar ao Cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
