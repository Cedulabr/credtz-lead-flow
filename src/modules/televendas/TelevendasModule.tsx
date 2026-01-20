import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, FileText, Users, ClipboardCheck, Sparkles } from "lucide-react";

import { 
  Televenda, 
  User, 
  TelevendasFilters as FiltersType, 
  LEGACY_STATUS_MAP,
  OPERATOR_STATUSES,
  STATUS_CONFIG
} from "./types";
import { getDateRange, normalizeStatus } from "./utils";
import { SummaryCards } from "./components/SummaryCards";
import { FiltersDrawer } from "./components/FiltersDrawer";
import { PropostasView } from "./views/PropostasView";
import { ClientesView } from "./views/ClientesView";
import { AprovacoesView } from "./views/AprovacoesView";

type TabType = "propostas" | "clientes" | "aprovacoes";

export const TelevendasModule = () => {
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();

  // Data states
  const [televendas, setTelevendas] = useState<Televenda[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI states
  const [activeTab, setActiveTab] = useState<TabType>("propostas");
  const [filters, setFilters] = useState<FiltersType>({
    search: "",
    status: "all",
    userId: "all",
    period: "all",
    month: "all",
    product: "all",
  });

  // Role states
  const [isGestor, setIsGestor] = useState(false);
  const [userCompanyIds, setUserCompanyIds] = useState<string[]>([]);

  const isGestorOrAdmin = isAdmin || isGestor;

  // Check gestor role
  useEffect(() => {
    const checkRole = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from("user_companies")
          .select("company_id, company_role")
          .eq("user_id", user.id)
          .eq("is_active", true);

        const gestorCompanies = data?.filter((uc) => uc.company_role === "gestor") || [];
        setIsGestor(gestorCompanies.length > 0);
        setUserCompanyIds(data?.map((uc) => uc.company_id) || []);
      } catch (error) {
        console.error("Error checking role:", error);
      }
    };
    checkRole();
  }, [user?.id]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await supabase.from("profiles").select("id, name").order("name");
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  // Fetch televendas
  const fetchTelevendas = useCallback(async () => {
    try {
      let query = supabase.from("televendas").select("*").order("created_at", { ascending: false });

      // Role-based filtering
      if (!isAdmin && !isGestor) {
        query = query.eq("user_id", user?.id);
      } else if (isGestor && !isAdmin && userCompanyIds.length > 0) {
        query = query.in("company_id", userCompanyIds);
      }

      // Date range
      const dateRange = getDateRange(filters.period, filters.month);
      if (dateRange) {
        query = query
          .gte("data_venda", dateRange.start.toISOString().split("T")[0])
          .lte("data_venda", dateRange.end.toISOString().split("T")[0]);
      }

      // User filter
      if (filters.userId !== "all") {
        query = query.eq("user_id", filters.userId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with user names
      if (data?.length) {
        const userIds = [...new Set(data.map((tv) => tv.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("id, name").in("id", userIds);
        const profilesMap = new Map((profiles || []).map((p) => [p.id, p]));

        setTelevendas(
          data.map((tv) => ({
            ...tv,
            status: normalizeStatus(tv.status, LEGACY_STATUS_MAP),
            user: profilesMap.get(tv.user_id) || null,
          }))
        );
      } else {
        setTelevendas([]);
      }
    } catch (error) {
      console.error("Error fetching televendas:", error);
      toast({ title: "Erro", description: "Erro ao carregar vendas", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, isAdmin, isGestor, userCompanyIds, filters.period, filters.month, filters.userId, toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchTelevendas(); }, [fetchTelevendas]);

  // Filtered data
  const filteredTelevendas = useMemo(() => {
    return televendas.filter((tv) => {
      const matchesSearch = !filters.search || 
        tv.nome.toLowerCase().includes(filters.search.toLowerCase()) ||
        tv.cpf.includes(filters.search.replace(/\D/g, ""));
      const matchesStatus = filters.status === "all" || tv.status === filters.status;
      const matchesProduct = filters.product === "all" || tv.tipo_operacao === filters.product;
      return matchesSearch && matchesStatus && matchesProduct;
    });
  }, [televendas, filters]);

  // Summary stats
  const stats = useMemo(() => {
    const uniqueCpfs = new Set(televendas.map((tv) => tv.cpf.replace(/\D/g, "")));
    return {
      totalPropostas: televendas.length,
      clientesUnicos: uniqueCpfs.size,
      aguardandoGestao: televendas.filter((tv) => 
        tv.status === "pago_aguardando" || tv.status === "cancelado_aguardando"
      ).length,
      pendentes: televendas.filter((tv) => tv.status === "pendente").length,
    };
  }, [televendas]);

  // Active filters count
  const activeFiltersCount = [
    filters.search, filters.status !== "all", filters.userId !== "all",
    filters.period !== "all", filters.product !== "all"
  ].filter(Boolean).length;

  // Handlers
  const handleStatusChange = async (tv: Televenda, newStatus: string) => {
    try {
      await supabase.from("televendas").update({ 
        status: newStatus, 
        status_updated_at: new Date().toISOString(),
        status_updated_by: user?.id 
      }).eq("id", tv.id);

      await supabase.from("televendas_status_history").insert({
        televendas_id: tv.id,
        from_status: tv.status,
        to_status: newStatus,
        changed_by: user?.id,
      });

      toast({ title: "✅ Status atualizado" });
      fetchTelevendas();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const handleView = (tv: Televenda) => {
    toast({ title: tv.nome, description: `CPF: ${tv.cpf} • ${tv.banco}` });
  };

  const handleEdit = (tv: Televenda) => toast({ title: "Editar", description: tv.nome });
  const handleDelete = (tv: Televenda) => toast({ title: "Excluir", description: tv.nome });

  const canEdit = (tv: Televenda) => isAdmin || (isGestor && userCompanyIds.includes(tv.company_id || ""));
  const canChangeStatus = (tv: Televenda) => isAdmin || isGestor || tv.user_id === user?.id;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 pb-24 md:pb-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">Gestão de Televendas</h1>
        </div>
        <div className="flex items-center gap-2">
          <FiltersDrawer
            filters={filters}
            onFiltersChange={setFilters}
            users={users}
            isGestorOrAdmin={isGestorOrAdmin}
            activeCount={activeFiltersCount}
          />
          <Button variant="outline" size="icon" onClick={() => { setRefreshing(true); fetchTelevendas(); }} disabled={refreshing} className="h-12 w-12 rounded-xl">
            <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <SummaryCards {...stats} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
        <TabsList className="w-full h-14 p-1.5 bg-muted rounded-xl grid grid-cols-3">
          <TabsTrigger value="propostas" className="h-full text-base font-semibold gap-2 rounded-lg data-[state=active]:shadow-md">
            <FileText className="h-5 w-5" /> Propostas
          </TabsTrigger>
          <TabsTrigger value="clientes" className="h-full text-base font-semibold gap-2 rounded-lg data-[state=active]:shadow-md">
            <Users className="h-5 w-5" /> Clientes
          </TabsTrigger>
          {isGestorOrAdmin && (
            <TabsTrigger value="aprovacoes" className="h-full text-base font-semibold gap-2 rounded-lg data-[state=active]:shadow-md relative">
              <ClipboardCheck className="h-5 w-5" /> Aprovações
              {stats.aguardandoGestao > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center animate-pulse">
                  {stats.aguardandoGestao}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Content */}
      <Card className="border-0 shadow-none bg-transparent">
        <CardContent className="p-0">
          <AnimatePresence mode="wait">
            {activeTab === "propostas" && (
              <motion.div key="propostas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <PropostasView
                  televendas={filteredTelevendas}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  canEdit={canEdit}
                  canChangeStatus={canChangeStatus}
                  isGestorOrAdmin={isGestorOrAdmin}
                />
              </motion.div>
            )}
            {activeTab === "clientes" && (
              <motion.div key="clientes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ClientesView
                  televendas={filteredTelevendas}
                  onClientClick={(cpf) => { setFilters({ ...filters, search: cpf }); setActiveTab("propostas"); }}
                  isGestorOrAdmin={isGestorOrAdmin}
                />
              </motion.div>
            )}
            {activeTab === "aprovacoes" && isGestorOrAdmin && (
              <motion.div key="aprovacoes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AprovacoesView
                  televendas={televendas}
                  onApprove={(tv) => handleStatusChange(tv, "pago_aprovado")}
                  onReject={(tv) => handleStatusChange(tv, "cancelado_confirmado")}
                  onReturn={(tv) => handleStatusChange(tv, "devolvido")}
                  onView={handleView}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelevendasModule;
