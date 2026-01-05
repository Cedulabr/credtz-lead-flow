import { useState, useEffect, useMemo } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { startOfDay, endOfDay, subDays } from "date-fns";

export function PerformanceReport() {
  const { profile, isAdmin } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [performanceData, setPerformanceData] = useState<UserPerformance[]>([]);
  const [summary, setSummary] = useState<ReportSummary>({
    totalActiveUsers: 0,
    totalLeadsWorked: 0,
    totalProposalsCreated: 0,
    proposalsPaid: 0,
    proposalsCancelled: 0,
    totalSoldValue: 0,
    totalCommissions: 0,
  });

  const [filters, setFilters] = useState<ReportFiltersType>({
    dateFilter: { type: "today" },
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

      // Build query for proposals
      let proposalsQuery = supabase
        .from("propostas")
        .select("*, profiles!propostas_created_by_id_fkey(id, name)")
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      if (filters.userId) {
        proposalsQuery = proposalsQuery.eq("created_by_id", filters.userId);
      }

      if (filters.proposalStatus) {
        proposalsQuery = proposalsQuery.eq("status", filters.proposalStatus);
      }

      if (filters.origin) {
        proposalsQuery = proposalsQuery.eq("origem_lead", filters.origin);
      }

      const { data: proposals, error: proposalsError } = await proposalsQuery;

      if (proposalsError) throw proposalsError;

      // Fetch leads
      let leadsQuery = supabase
        .from("leads")
        .select("*")
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      if (filters.userId) {
        leadsQuery = leadsQuery.or(`created_by.eq.${filters.userId},assigned_to.eq.${filters.userId}`);
      }

      const { data: leads, error: leadsError } = await leadsQuery;
      if (leadsError) throw leadsError;

      // Fetch commissions
      let commissionsQuery = supabase
        .from("commissions")
        .select("*")
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      if (filters.userId) {
        commissionsQuery = commissionsQuery.eq("user_id", filters.userId);
      }

      const { data: commissions, error: commissionsError } = await commissionsQuery;
      if (commissionsError) throw commissionsError;

      // Process data by user
      const userMap = new Map<string, UserPerformance>();

      // Process proposals
      proposals?.forEach((proposal: any) => {
        const userId = proposal.created_by_id;
        const userName = proposal.profiles?.name || "Desconhecido";

        if (!userId) return;

        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId,
            userName,
            totalLeads: 0,
            proposalsCreated: 0,
            proposalsPaid: 0,
            proposalsCancelled: 0,
            conversionRate: 0,
            totalSold: 0,
            commissionGenerated: 0,
            lastActivity: null,
            averageResponseTime: null,
          });
        }

        const user = userMap.get(userId)!;
        user.proposalsCreated++;

        if (proposal.status === "paga" || proposal.status === "Pago") {
          user.proposalsPaid++;
          user.totalSold += proposal.valor_proposta || 0;
        }

        if (proposal.status === "cancelada" || proposal.status === "Cancelado") {
          user.proposalsCancelled++;
        }

        if (!user.lastActivity || new Date(proposal.created_at) > new Date(user.lastActivity)) {
          user.lastActivity = proposal.created_at;
        }
      });

      // Process leads
      leads?.forEach((lead) => {
        const userId = lead.created_by || lead.assigned_to;
        if (!userId || !userMap.has(userId)) return;

        const user = userMap.get(userId)!;
        user.totalLeads++;
      });

      // Process commissions
      commissions?.forEach((commission) => {
        const userId = commission.user_id;
        if (!userId || !userMap.has(userId)) return;

        const user = userMap.get(userId)!;
        user.commissionGenerated += commission.commission_amount || 0;
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
        totalLeadsWorked: performanceArray.reduce((sum, u) => sum + u.totalLeads, 0),
        totalProposalsCreated: performanceArray.reduce((sum, u) => sum + u.proposalsCreated, 0),
        proposalsPaid: performanceArray.reduce((sum, u) => sum + u.proposalsPaid, 0),
        proposalsCancelled: performanceArray.reduce((sum, u) => sum + u.proposalsCancelled, 0),
        totalSoldValue: performanceArray.reduce((sum, u) => sum + u.totalSold, 0),
        totalCommissions: performanceArray.reduce((sum, u) => sum + u.commissionGenerated, 0),
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
