import { useState, useEffect, useMemo } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportFilters } from "./ReportFilters";
import { SummaryCards } from "./SummaryCards";
import { PerformanceTable } from "./PerformanceTable";
import { ActivityDetailsModal } from "./ActivityDetailsModal";
import { ExportButtons } from "./ExportButtons";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BlockedAccess } from "@/components/BlockedAccess";
import { toast } from "sonner";
import {
  DateFilter,
  ReportFilters as ReportFiltersType,
  UserPerformance,
  ReportSummary,
} from "./types";
import { startOfDay, endOfDay, subDays, startOfMonth } from "date-fns";

export function PerformanceReport() {
  const { profile, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [performanceData, setPerformanceData] = useState<UserPerformance[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({
    totalActiveUsers: 0,
    premiumLeadsWorked: 0,
    activatedLeadsWorked: 0,
    totalProposalsCreated: 0,
    proposalsPaid: 0,
    proposalsCancelled: 0,
    totalSoldValue: 0,
    totalCommissions: 0,
    documentsSaved: 0,
    savedProposals: 0,
  });

  const [filters, setFilters] = useState<ReportFiltersType>({
    dateFilter: { type: "thisMonth" },
    userId: null,
    proposalStatus: null,
    origin: null,
  });

  const [detailsModal, setDetailsModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({
    isOpen: false,
    userId: "",
    userName: "",
  });

  // Check access - only Admin and Gestor (via user_companies)
  const [isGestor, setIsGestor] = useState(false);

  useEffect(() => {
    const checkGestorAccess = async () => {
      if (!profile?.id) return;
      
      const { data } = await supabase
        .from("user_companies")
        .select("company_role")
        .eq("user_id", profile.id)
        .eq("company_role", "gestor")
        .eq("is_active", true)
        .limit(1);
      
      setIsGestor(data && data.length > 0);
    };
    
    checkGestorAccess();
  }, [profile?.id]);

  const hasAccess = isAdmin || isGestor;

  // Calculate date range based on filter
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    switch (filters.dateFilter.type) {
      case "today":
        start = startOfDay(now);
        break;
      case "yesterday":
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case "last7days":
        start = startOfDay(subDays(now, 7));
        break;
      case "last30days":
        start = startOfDay(subDays(now, 30));
        break;
      case "thisMonth":
        start = startOfMonth(now);
        break;
      case "custom":
        start = filters.dateFilter.startDate
          ? startOfDay(filters.dateFilter.startDate)
          : startOfDay(now);
        end = filters.dateFilter.endDate
          ? endOfDay(filters.dateFilter.endDate)
          : endOfDay(now);
        break;
      default:
        start = startOfDay(now);
    }

    return { start, end };
  }, [filters.dateFilter]);

  // Fetch users for filter dropdown
  useEffect(() => {
    if (!hasAccess) return;

    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Error fetching users:", error);
        return;
      }

      setUsers(data?.filter((u) => u.name) || []);
    };

    fetchUsers();
  }, [hasAccess]);

  // Fetch report data
  useEffect(() => {
    if (!hasAccess) return;
    fetchReportData();
  }, [hasAccess, dateRange, filters.userId, filters.proposalStatus, filters.origin]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const startISO = dateRange.start.toISOString();
      const endISO = dateRange.end.toISOString();

      // First, get the company IDs for gestor filtering
      let allowedUserIds: string[] | null = null;
      
      if (!isAdmin && isGestor && profile?.id) {
        // Fetch the companies this gestor manages
        const { data: gestorCompanies } = await supabase
          .from("user_companies")
          .select("company_id")
          .eq("user_id", profile.id)
          .eq("company_role", "gestor")
          .eq("is_active", true);
        
        if (gestorCompanies && gestorCompanies.length > 0) {
          const companyIds = gestorCompanies.map(c => c.company_id);
          
          // Get all users from these companies
          const { data: companyUsers } = await supabase
            .from("user_companies")
            .select("user_id")
            .in("company_id", companyIds)
            .eq("is_active", true);
          
          allowedUserIds = companyUsers?.map(u => u.user_id) || [];
        }
      }

      // Fetch all profiles first to create a name lookup map
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, name")
        .eq("is_active", true);
      
      const profileNameMap = new Map<string, string>();
      allProfiles?.forEach(p => {
        if (p.name) {
          profileNameMap.set(p.id, p.name);
        }
      });

      // Fetch all data sources in parallel
      const [
        televendasResult,
        proposalsResult,
        leadsResult,
        activateLeadsResult,
        commissionsResult,
        documentsResult,
        savedProposalsResult,
      ] = await Promise.all([
        // Televendas - main sales data
        supabase
          .from("televendas")
          .select("*, profiles:user_id(id, name)")
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        
        // Propostas
        supabase
          .from("propostas")
          .select("*, profiles:created_by_id(id, name)")
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        
        // Leads
        supabase
          .from("leads")
          .select("*")
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        
        // Activate Leads
        supabase
          .from("activate_leads")
          .select("*")
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        
        // Commissions
        supabase
          .from("commissions")
          .select("*")
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        
        // Client Documents
        supabase
          .from("client_documents")
          .select("*")
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        
        // Saved Proposals
        supabase
          .from("saved_proposals")
          .select("*")
          .gte("created_at", startISO)
          .lte("created_at", endISO),
      ]);

      let televendas = televendasResult.data || [];
      let proposals = proposalsResult.data || [];
      let leads = leadsResult.data || [];
      let activateLeads = activateLeadsResult.data || [];
      let commissions = commissionsResult.data || [];
      let documents = documentsResult.data || [];
      let savedProposals = savedProposalsResult.data || [];

      // Filter by allowed users if gestor
      if (allowedUserIds) {
        televendas = televendas.filter((t: any) => allowedUserIds!.includes(t.user_id));
        proposals = proposals.filter((p: any) => allowedUserIds!.includes(p.created_by_id));
        leads = leads.filter((l: any) => allowedUserIds!.includes(l.created_by) || allowedUserIds!.includes(l.assigned_to));
        activateLeads = activateLeads.filter((a: any) => allowedUserIds!.includes(a.created_by) || allowedUserIds!.includes(a.assigned_to));
        commissions = commissions.filter((c: any) => allowedUserIds!.includes(c.user_id));
        documents = documents.filter((d: any) => allowedUserIds!.includes(d.uploaded_by));
        savedProposals = savedProposals.filter((s: any) => allowedUserIds!.includes(s.user_id));
      }

      // Process data by user
      const userMap = new Map<string, UserPerformance>();

      const getOrCreateUser = (userId: string, fallbackName?: string): UserPerformance => {
        if (!userMap.has(userId)) {
          // Look up the name from profile map first
          const userName = profileNameMap.get(userId) || fallbackName || "Desconhecido";
          userMap.set(userId, {
            userId,
            userName,
            premiumLeads: 0,
            activatedLeads: 0,
            proposalsCreated: 0,
            proposalsPaid: 0,
            proposalsCancelled: 0,
            conversionRate: 0,
            totalSold: 0,
            commissionGenerated: 0,
            documentsSaved: 0,
            savedProposals: 0,
            lastActivity: null,
            averageResponseTime: null,
          });
        }
        return userMap.get(userId)!;
      };

      // Process Televendas (main sales data)
      televendas.forEach((tv: any) => {
        const userId = tv.user_id;
        if (!userId) return;
        if (filters.userId && userId !== filters.userId) return;

        const userName = tv.profiles?.name || "Desconhecido";
        const user = getOrCreateUser(userId, userName);

        user.proposalsCreated++;

        if (tv.status === "pago") {
          user.proposalsPaid++;
          user.totalSold += Number(tv.parcela) || 0;
          if (tv.troco) {
            user.totalSold += Number(tv.troco) || 0;
          }
        }

        if (tv.status === "cancelado") {
          user.proposalsCancelled++;
        }

        if (!user.lastActivity || new Date(tv.created_at) > new Date(user.lastActivity)) {
          user.lastActivity = tv.created_at;
        }
      });

      // Process Propostas (kanban proposals)
      proposals.forEach((proposal: any) => {
        const userId = proposal.created_by_id;
        if (!userId) return;
        if (filters.userId && userId !== filters.userId) return;

        const userName = proposal.profiles?.name || "Desconhecido";
        const user = getOrCreateUser(userId, userName);

        // Only count if not already counted in televendas
        if (!televendas.some((tv: any) => tv.cpf === proposal.cpf)) {
          user.proposalsCreated++;

          if (proposal.status === "paga" || proposal.status === "Pago" || proposal.pipeline_stage === "pago") {
            user.proposalsPaid++;
            user.totalSold += Number(proposal.valor_proposta) || 0;
          }

          if (proposal.status === "cancelada" || proposal.status === "Cancelado" || proposal.pipeline_stage === "cancelado") {
            user.proposalsCancelled++;
          }
        }

        if (!user.lastActivity || new Date(proposal.created_at) > new Date(user.lastActivity)) {
          user.lastActivity = proposal.created_at;
        }
      });

      // Process Leads (Premium Leads)
      leads.forEach((lead: any) => {
        const userId = lead.created_by || lead.assigned_to;
        if (!userId) return;
        if (filters.userId && userId !== filters.userId) return;

        const user = getOrCreateUser(userId);
        user.premiumLeads++;
      });

      // Process Activate Leads
      activateLeads.forEach((lead: any) => {
        const userId = lead.created_by || lead.assigned_to;
        if (!userId) return;
        if (filters.userId && userId !== filters.userId) return;

        const user = getOrCreateUser(userId);
        user.activatedLeads++;
      });

      // Process Commissions
      commissions.forEach((commission: any) => {
        const userId = commission.user_id;
        if (!userId) return;
        if (filters.userId && userId !== filters.userId) return;

        const user = getOrCreateUser(userId);
        user.commissionGenerated += Number(commission.commission_amount) || 0;
      });

      // Process Documents
      documents.forEach((doc: any) => {
        const userId = doc.uploaded_by;
        if (!userId) return;
        if (filters.userId && userId !== filters.userId) return;

        const user = getOrCreateUser(userId);
        user.documentsSaved++;
      });

      // Process Saved Proposals
      savedProposals.forEach((sp: any) => {
        const userId = sp.user_id;
        if (!userId) return;
        if (filters.userId && userId !== filters.userId) return;

        const user = getOrCreateUser(userId);
        user.savedProposals++;
      });

      // Calculate conversion rates
      userMap.forEach((user) => {
        if (user.proposalsCreated > 0) {
          user.conversionRate = (user.proposalsPaid / user.proposalsCreated) * 100;
        }
      });

      const performanceArray = Array.from(userMap.values());
      setPerformanceData(performanceArray);

      // Calculate summary
      const newSummary: ReportSummary = {
        totalActiveUsers: performanceArray.length,
        premiumLeadsWorked: performanceArray.reduce((sum, u) => sum + u.premiumLeads, 0),
        activatedLeadsWorked: performanceArray.reduce((sum, u) => sum + u.activatedLeads, 0),
        totalProposalsCreated: performanceArray.reduce((sum, u) => sum + u.proposalsCreated, 0),
        proposalsPaid: performanceArray.reduce((sum, u) => sum + u.proposalsPaid, 0),
        proposalsCancelled: performanceArray.reduce((sum, u) => sum + u.proposalsCancelled, 0),
        totalSoldValue: performanceArray.reduce((sum, u) => sum + u.totalSold, 0),
        totalCommissions: performanceArray.reduce((sum, u) => sum + u.commissionGenerated, 0),
        documentsSaved: performanceArray.reduce((sum, u) => sum + u.documentsSaved, 0),
        savedProposals: performanceArray.reduce((sum, u) => sum + u.savedProposals, 0),
      };

      setSummary(newSummary);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Erro ao carregar dados do relatório");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchReportData();
    toast.success("Dados atualizados!");
  };

  const handleViewDetails = (userId: string, userName: string) => {
    setDetailsModal({
      isOpen: true,
      userId,
      userName,
    });
  };

  if (!hasAccess) {
    return (
      <BlockedAccess message="Acesso ao Relatório de Desempenho restrito a Administradores e Gestores" />
    );
  }

  return (
    <div className="p-4 md:p-6 pt-16 md:pt-6 pb-24 md:pb-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Relatório de Desempenho</h1>
            <p className="text-sm text-muted-foreground">
              Acompanhe a produtividade e resultados da equipe
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <ExportButtons
            data={performanceData}
            summary={summary}
            startDate={dateRange.start}
            endDate={dateRange.end}
          />
        </div>
      </div>

      {/* Filters */}
      <ReportFilters filters={filters} onFiltersChange={setFilters} users={users} />

      {/* Summary Cards */}
      <SummaryCards summary={summary} isLoading={isLoading} />

      {/* Performance Table */}
      <PerformanceTable
        data={performanceData}
        isLoading={isLoading}
        onViewDetails={handleViewDetails}
      />

      {/* Activity Details Modal */}
      <ActivityDetailsModal
        isOpen={detailsModal.isOpen}
        onClose={() => setDetailsModal({ ...detailsModal, isOpen: false })}
        userId={detailsModal.userId}
        userName={detailsModal.userName}
        startDate={dateRange.start}
        endDate={dateRange.end}
      />
    </div>
  );
}
