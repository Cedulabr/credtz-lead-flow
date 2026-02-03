import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { PipelineView } from "./views/PipelineView";
import { LeadsListView } from "./views/LeadsListView";
import { MetricsDashboard } from "./views/MetricsDashboard";
import { LeadDetailDrawer } from "./components/LeadDetailDrawer";
import { MobileNavBar } from "./components/MobileNavBar";
import { useLeadsPremium } from "./hooks/useLeadsPremium";
import { Lead } from "./types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, List, BarChart3 } from "lucide-react";

export function LeadsPremiumModule() {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const [activeView, setActiveView] = useState<"pipeline" | "list" | "metrics">("pipeline");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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

  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b px-4 py-3">
          <h1 className="text-xl font-bold">Leads Premium</h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} leads · {userCredits} créditos
          </p>
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
          </AnimatePresence>
        </div>

        {/* Mobile Bottom Navigation */}
        <MobileNavBar 
          activeView={activeView}
          onViewChange={setActiveView}
          userCredits={userCredits}
          onRequestLeads={requestLeads}
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
          <div className="text-right">
            <p className="text-2xl font-bold">{userCredits}</p>
            <p className="text-xs text-muted-foreground">créditos disponíveis</p>
          </div>
        </div>
      </div>

      {/* Desktop Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="pipeline" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
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

        <TabsContent value="pipeline" className="mt-6">
          <PipelineView 
            leads={leads}
            isLoading={isLoading}
            onLeadSelect={handleLeadSelect}
            stats={stats}
          />
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <LeadsListView
            leads={leads}
            users={users}
            isLoading={isLoading}
            onLeadSelect={handleLeadSelect}
            onRefresh={fetchLeads}
          />
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <MetricsDashboard 
            leads={leads}
            stats={stats}
            userCredits={userCredits}
          />
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
    </div>
  );
}
