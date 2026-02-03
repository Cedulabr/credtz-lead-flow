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
import { RequestLeadsModal } from "./components/RequestLeadsModal";
import { useLeadsPremium } from "./hooks/useLeadsPremium";
import { Lead, LeadFilters } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { LayoutGrid, List, BarChart3, Calculator, Plus, CreditCard, Filter } from "lucide-react";

export function LeadsPremiumModule() {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const [activeView, setActiveView] = useState<"pipeline" | "list" | "metrics" | "simulations">("list");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isSimulationsOpen, setIsSimulationsOpen] = useState(false);
  const [pendingSimulationsCount, setPendingSimulationsCount] = useState(0);

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

  // Calculate active filters count
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

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

        {/* View Tabs */}
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
            variant={activeView === "pipeline" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveView("pipeline")}
            className="shrink-0"
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Pipeline
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
            {activeView === "pipeline" && (
              <motion.div
                key="pipeline"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full"
              >
                <PipelineView 
                  leads={leads}
                  isLoading={isLoading}
                  onLeadSelect={handleLeadSelect}
                  stats={stats}
                />
              </motion.div>
            )}
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

        {/* Request Leads Modal */}
        <RequestLeadsModal
          isOpen={isRequestModalOpen}
          onClose={() => setIsRequestModalOpen(false)}
          userCredits={userCredits}
          onRequestLeads={handleRequestLeads}
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

      {/* Request Leads Modal */}
      <RequestLeadsModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        userCredits={userCredits}
        onRequestLeads={handleRequestLeads}
      />
    </div>
  );
}