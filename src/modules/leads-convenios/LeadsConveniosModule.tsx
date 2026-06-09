import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { LeadsListView } from "../leads-premium/views/LeadsListView";
import { LeadDetailDrawer } from "../leads-premium/components/LeadDetailDrawer";
import { MobileActionBar } from "../leads-premium/components/MobileActionBar";
import { RequestLeadsWizard } from "../leads-premium/components/RequestLeadsWizard";
import { PerformanceCreditModule } from "../leads-premium/components/PerformanceCreditModule";
import { OverdueBlockBanner } from "../leads-premium/components/OverdueBlockBanner";
import { LeadSalesPanel } from "../leads-premium/components/LeadSalesPanel";
import { Lead, LeadStats } from "../leads-premium/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { List, BarChart3, Plus, CreditCard, CalendarDays, Upload } from "lucide-react";
import { ImportBase } from "@/components/ImportBase";
import { addDays, format } from "date-fns";
import { MetricsDashboard } from "../leads-premium/views/MetricsDashboard";

export function LeadsConveniosModule() {
  const isMobile = useIsMobile();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [activeView, setActiveView] = useState<"list" | "metrics">("list");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isSalesPanelOpen, setIsSalesPanelOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [showImportBase, setShowImportBase] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [userCredits, setUserCredits] = useState(0);
  const [users, setUsers] = useState<any[]>([]);

  const isAdmin = profile?.role === 'admin';

  const fetchLeads = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('origem_lead', 'leads_convenios')
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.or(`assigned_to.eq.${user.id},created_by.eq.${user.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLeads(data as any || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAdmin]);

  const fetchUserCredits = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc('get_user_credits', { target_user_id: user.id });
    setUserCredits(data || 0);
  }, [user]);

  useEffect(() => {
    fetchLeads();
    fetchUserCredits();
  }, [fetchLeads, fetchUserCredits]);

  const stats = useMemo<LeadStats>(() => {
    const statusCounts = leads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: leads.length,
      novos: statusCounts['new_lead'] || 0,
      emAndamento: (statusCounts['em_andamento'] || 0) + (statusCounts['aguardando_retorno'] || 0),
      fechados: statusCounts['cliente_fechado'] || 0,
      recusados: (statusCounts['recusou_oferta'] || 0) + (statusCounts['sem_interesse'] || 0),
      pendentes: (statusCounts['agendamento'] || 0) + (statusCounts['contato_futuro'] || 0),
      conversionRate: leads.length > 0 ? ((statusCounts['cliente_fechado'] || 0) / leads.length) * 100 : 0,
      avgTimeToConversion: 0,
      todayCount: 0,
      weekCount: 0,
      byStatus: statusCounts
    };
  }, [leads]);

  const handleLeadSelect = (lead: Lead) => {
    setSelectedLead(lead);
    setIsDetailOpen(true);
  };

  const updateLeadStatus = async (leadId: string, newStatus: string, additionalData?: any) => {
    const { error } = await supabase.from('leads').update({ status: newStatus, ...additionalData }).eq('id', leadId);
    if (!error) {
      fetchLeads();
      return true;
    }
    return false;
  };

  if (showImportBase && isAdmin) {
    return <ImportBase onBack={() => setShowImportBase(false)} />;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Módulo Convênios</h1>
          <p className="text-muted-foreground">Gerencie seus convênios e leads importados</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right px-4 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-primary">{userCredits}</p>
            </div>
            <p className="text-xs text-muted-foreground">créditos disponíveis</p>
          </div>
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowImportBase(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar Convênios
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="list" className="gap-2"><List className="h-4 w-4" /> Lista</TabsTrigger>
          <TabsTrigger value="metrics" className="gap-2"><BarChart3 className="h-4 w-4" /> Métricas</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          <LeadsListView
            leads={leads}
            users={users}
            isLoading={isLoading}
            onLeadSelect={handleLeadSelect}
            onRefresh={fetchLeads}
            onSalesPanel={(lead) => { setSelectedLead(lead); setIsSalesPanelOpen(true); }}
            onStatusChange={(lead, status) => updateLeadStatus(lead.id, status)}
          />
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
           <MetricsDashboard leads={leads} stats={stats} userCredits={userCredits} users={users} />
        </TabsContent>
      </Tabs>

      <LeadDetailDrawer
        lead={selectedLead}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onStatusChange={updateLeadStatus}
        users={users}
        canEdit={true}
      />

      <LeadSalesPanel
        lead={selectedLead}
        isOpen={isSalesPanelOpen}
        onClose={() => setIsSalesPanelOpen(false)}
        onStatusChange={updateLeadStatus}
        onTyping={() => {}}
      />
    </div>
  );
}
