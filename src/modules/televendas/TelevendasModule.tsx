import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, FileText, Users, ClipboardCheck, Sparkles, Activity } from "lucide-react";
import { toast as sonnerToast } from "sonner";

import { 
  Televenda, 
  User, 
  TelevendasFilters as FiltersType, 
  DateMode,
  LEGACY_STATUS_MAP,
  OPERATOR_STATUSES,
  STATUS_CONFIG
} from "./types";
import { getDateRange, normalizeStatus } from "./utils";
import { DashboardCards } from "./components/DashboardCards";
import { BankingPipeline } from "./components/BankingPipeline";
import { ProductionBar } from "./components/ProductionBar";
import { SmartSearch } from "./components/SmartSearch";
import { StatusChangeModal } from "./components/StatusChangeModal";
import { FiltersDrawer } from "./components/FiltersDrawer";
import { DetailModal } from "./components/DetailModal";
import { EditProposalModal } from "./components/EditProposalModal";
import { CollaboratorEditModal } from "./components/CollaboratorEditModal";
import { PropostasView } from "./views/PropostasView";
import { ClientesView } from "./views/ClientesView";
import { AprovacoesView } from "./views/AprovacoesView";
import { useTelevendasBanks } from "./hooks/useTelevendasBanks";

type TabType = "propostas" | "clientes" | "aprovacoes";

const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export const TelevendasModule = () => {
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();
  
  // Fetch banks from televendas_banks table
  const { bankNames: registeredBanks } = useTelevendasBanks();

  // Data states
  const [televendas, setTelevendas] = useState<Televenda[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // UI states
  const [activeTab, setActiveTab] = useState<TabType>("propostas");
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [bankStatusFilter, setBankStatusFilter] = useState<string | undefined>();
  const [filters, setFilters] = useState<FiltersType>({
    search: "",
    status: "all",
    userId: "all",
    period: "all",
    month: showActiveOnly ? "all" : getCurrentMonth(),
    product: "all",
    bank: "all",
    dateMode: "criacao",
  });

  // Detail modal state
  const [selectedTelevenda, setSelectedTelevenda] = useState<Televenda | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTelevenda, setEditingTelevenda] = useState<Televenda | null>(null);
  
  // Limited edit modal state (for collaborators)
  const [limitedEditModalOpen, setLimitedEditModalOpen] = useState(false);

  // Status change modal state
  const [statusChangeModal, setStatusChangeModal] = useState<{
    open: boolean;
    televenda: Televenda | null;
    newStatus: string;
  }>({ open: false, televenda: null, newStatus: "" });
  const [statusChangeLoading, setStatusChangeLoading] = useState(false);

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

      // Active only mode: show non-final proposals regardless of date
      if (showActiveOnly) {
        query = query.not("status", "in", '("proposta_paga","proposta_cancelada","exclusao_aprovada")');
      } else {
        // Date range - use different date column based on dateMode
        const dateRange = getDateRange(filters.period, filters.month);
        if (dateRange) {
          const dateColumn = filters.dateMode === "pagamento" ? "data_pagamento" : "data_venda";
          query = query
            .gte(dateColumn, dateRange.start.toISOString().split("T")[0])
            .lte(dateColumn, dateRange.end.toISOString().split("T")[0]);
        }
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
  }, [user?.id, isAdmin, isGestor, userCompanyIds, filters.period, filters.month, filters.userId, filters.dateMode, showActiveOnly, toast]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { fetchTelevendas(); }, [fetchTelevendas]);

  // Filtered data - now searches both name AND CPF, and filters by bank
  const filteredTelevendas = useMemo(() => {
    return televendas.filter((tv) => {
      const searchTerm = filters.search.toLowerCase().trim();
      const cpfDigits = filters.search.replace(/\D/g, "");
      
      const matchesSearch = !searchTerm || 
        tv.nome.toLowerCase().includes(searchTerm) ||
        tv.cpf.replace(/\D/g, "").includes(cpfDigits);
      
      const matchesStatus = filters.status === "all" || tv.status === filters.status;
      const matchesProduct = filters.product === "all" || tv.tipo_operacao === filters.product;
      const matchesBank = filters.bank === "all" || tv.banco === filters.bank;
      const matchesBankStatus = !bankStatusFilter || (tv.status_bancario || "aguardando_digitacao") === bankStatusFilter;
      return matchesSearch && matchesStatus && matchesProduct && matchesBank && matchesBankStatus;
    });
  }, [televendas, filters, bankStatusFilter]);

  // Extract unique banks from televendas for filter
  const availableBanks = useMemo(() => {
    const banksSet = new Set(televendas.map((tv) => tv.banco).filter(Boolean));
    return Array.from(banksSet).sort();
  }, [televendas]);

  // Summary stats (for badges and approval count)
  const stats = useMemo(() => {
    const uniqueCpfs = new Set(televendas.map((tv) => tv.cpf.replace(/\D/g, "")));
    return {
      totalPropostas: televendas.length,
      clientesUnicos: uniqueCpfs.size,
      aguardandoGestao: televendas.filter((tv) => 
        tv.status === "pago_aguardando" || 
        tv.status === "cancelado_aguardando" || 
        tv.status === "solicitar_exclusao"
      ).length,
      pendentes: televendas.filter((tv) => tv.status === "proposta_pendente").length,
    };
  }, [televendas]);

  // Handle filter by status from dashboard cards
  const handleFilterByStatus = (status: string) => {
    if (status === "all") {
      setFilters({ ...filters, status: "all" });
    } else {
      setFilters({ ...filters, status });
    }
    setActiveTab("propostas");
  };

  const handleFilterByBankStatus = (status: string) => {
    setBankStatusFilter(status === "all" ? undefined : status);
    setActiveTab("propostas");
  };

  const handleToggleActiveOnly = () => {
    const next = !showActiveOnly;
    setShowActiveOnly(next);
    if (next) {
      setFilters((f) => ({ ...f, month: "all", period: "all" }));
    } else {
      setFilters((f) => ({ ...f, month: getCurrentMonth() }));
    }
  };

  const handleSyncAll = async () => {
    setRefreshing(true);
    try {
      const ids = filteredTelevendas.map((tv) => tv.id);
      if (ids.length === 0) return;
      const { error } = await supabase
        .from("televendas")
        .update({ last_sync_at: new Date().toISOString(), last_sync_by: user?.id } as any)
        .in("id", ids);
      if (error) throw error;
      sonnerToast.success(`${ids.length} propostas verificadas`);
      await fetchTelevendas();
    } catch (e) {
      sonnerToast.error("Erro ao sincronizar");
    } finally {
      setRefreshing(false);
    }
  };
  const activeFiltersCount = [
    filters.search, filters.status !== "all", filters.userId !== "all",
    filters.period !== "all", filters.product !== "all", filters.bank !== "all",
    filters.dateMode !== "criacao"
  ].filter(Boolean).length;

  // Status change handler - opens modal for confirmation
  const handleStatusChange = (tv: Televenda, newStatus: string) => {
    setStatusChangeModal({
      open: true,
      televenda: tv,
      newStatus,
    });
  };

  // Confirm status change with reason and optional date (payment or cancellation)
  const confirmStatusChange = async (reason: string, dateValue?: string) => {
    if (!statusChangeModal.televenda) return;

    const tv = statusChangeModal.televenda;
    const newStatus = statusChangeModal.newStatus;

    setStatusChangeLoading(true);
    try {
      console.log("Updating status for:", tv.id, "to:", newStatus, "date:", dateValue);
      
      // Build update object
      const updateData: Record<string, unknown> = { 
        status: newStatus, 
        status_updated_at: new Date().toISOString(),
        status_updated_by: user?.id 
      };

      // Add payment date if provided (for payment statuses)
      const isPaymentStatus = ["pago_aguardando", "proposta_paga"].includes(newStatus);
      const isCancellationStatus = newStatus === "proposta_cancelada";

      if (dateValue && isPaymentStatus) {
        updateData.data_pagamento = dateValue;
      }
      
      if (dateValue && isCancellationStatus) {
        updateData.data_cancelamento = dateValue;
      }
      
      // Update status in televendas table
      const { error: updateError } = await supabase
        .from("televendas")
        .update(updateData)
        .eq("id", tv.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      // Record in history with reason
      const { error: historyError } = await supabase
        .from("televendas_status_history")
        .insert({
          televendas_id: tv.id,
          from_status: tv.status,
          to_status: newStatus,
          changed_by: user?.id,
          reason: reason || null,
        });

      if (historyError) {
        console.error("History error:", historyError);
        // Don't throw - status was already updated
      }

      toast({ 
        title: "✅ Status atualizado", 
        description: `Proposta de ${tv.nome} alterada para ${STATUS_CONFIG[newStatus]?.label || newStatus}` 
      });
      
      // Close modal first, then refresh
      setStatusChangeModal({ open: false, televenda: null, newStatus: "" });
      setStatusChangeLoading(false);
      await fetchTelevendas();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({ title: "Erro", description: "Erro ao atualizar status", variant: "destructive" });
      setStatusChangeLoading(false);
      setStatusChangeModal({ open: false, televenda: null, newStatus: "" });
    }
  };

  // Direct status change (without modal - for quick actions)
  const handleQuickStatusChange = async (tv: Televenda, newStatus: string) => {
    try {
      console.log("Quick status change for:", tv.id, "to:", newStatus);
      
      const { error: updateError } = await supabase
        .from("televendas")
        .update({ 
          status: newStatus, 
          status_updated_at: new Date().toISOString(),
          status_updated_by: user?.id 
        })
        .eq("id", tv.id);

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }

      const { error: historyError } = await supabase
        .from("televendas_status_history")
        .insert({
          televendas_id: tv.id,
          from_status: tv.status,
          to_status: newStatus,
          changed_by: user?.id,
        });

      if (historyError) {
        console.error("History error:", historyError);
      }

      toast({ title: "✅ Status atualizado" });
      await fetchTelevendas();
    } catch (error) {
      console.error("Quick status change error:", error);
      toast({ title: "Erro", description: "Erro ao atualizar", variant: "destructive" });
    }
  };

  // Delete handler (physical delete after manager approval)
  const handleDeleteTelevendas = async (tv: Televenda) => {
    try {
      await supabase.from("televendas").delete().eq("id", tv.id);
      toast({ title: "🗑️ Proposta excluída" });
      fetchTelevendas();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao excluir", variant: "destructive" });
    }
  };

  // View handlers
  const handleView = (tv: Televenda) => {
    setSelectedTelevenda(tv);
    setDetailModalOpen(true);
  };

  const handleEdit = (tv: Televenda) => {
    setEditingTelevenda(tv);
    setEditModalOpen(true);
  };

  // Limited edit handler (for collaborators)
  const handleLimitedEdit = (tv: Televenda) => {
    setEditingTelevenda(tv);
    setLimitedEditModalOpen(true);
  };

  // Save limited edit with history
  const handleLimitedEditSave = async (
    id: string, 
    data: { banco: string; parcela: number; troco: number | null; saldo_devedor: number | null },
    originalData: { banco: string; parcela: number; troco: number | null; saldo_devedor: number | null }
  ) => {
    try {
      // Determine which fields changed
      const fieldsChanged: string[] = [];
      if (data.banco !== originalData.banco) fieldsChanged.push("banco");
      if (data.parcela !== originalData.parcela) fieldsChanged.push("parcela");
      if (data.troco !== originalData.troco) fieldsChanged.push("troco");
      if (data.saldo_devedor !== originalData.saldo_devedor) fieldsChanged.push("saldo_devedor");

      if (fieldsChanged.length === 0) {
        toast({ title: "Nenhuma alteração detectada" });
        return;
      }

      // 1. Save edit history
      const { error: historyError } = await supabase
        .from("televendas_edit_history")
        .insert({
          televendas_id: id,
          edited_by: user?.id,
          original_data: originalData,
          new_data: data,
          fields_changed: fieldsChanged,
        });

      if (historyError) {
        console.error("Error saving edit history:", historyError);
        throw historyError;
      }

      // 2. Get current edit_count
      const { data: currentTv } = await supabase
        .from("televendas")
        .select("edit_count")
        .eq("id", id)
        .single();

      // 3. Update proposal with new data and increment edit_count
      const { error: updateError } = await supabase
        .from("televendas")
        .update({
          ...data,
          edit_count: (currentTv?.edit_count || 0) + 1,
        })
        .eq("id", id);

      if (updateError) {
        console.error("Error updating proposal:", updateError);
        throw updateError;
      }

      toast({ 
        title: "✅ Proposta atualizada", 
        description: `Campos alterados: ${fieldsChanged.join(", ")}. Histórico registrado.` 
      });
      
      setLimitedEditModalOpen(false);
      fetchTelevendas();
    } catch (error) {
      console.error("Error in limited edit:", error);
      toast({ title: "Erro", description: "Erro ao atualizar proposta", variant: "destructive" });
      throw error;
    }
  };

  const handleEditSave = async (id: string, data: Partial<Televenda>) => {
    try {
      const { error } = await supabase
        .from("televendas")
        .update(data)
        .eq("id", id);

      if (error) throw error;

      toast({ title: "✅ Proposta atualizada", description: "Alterações salvas com sucesso" });
      fetchTelevendas();
    } catch (error) {
      console.error("Error updating proposal:", error);
      toast({ title: "Erro", description: "Erro ao atualizar proposta", variant: "destructive" });
      throw error;
    }
  };
  
  const handleDelete = (tv: Televenda) => {
    // For regular users: request deletion (change status)
    if (!isGestorOrAdmin) {
      handleStatusChange(tv, "solicitar_exclusao");
    } else {
      // For managers: can delete directly or change status
      handleDeleteTelevendas(tv);
    }
  };

  // Approval handlers
  const handleApprove = (tv: Televenda) => handleStatusChange(tv, "proposta_paga");
  const handleReject = (tv: Televenda) => handleStatusChange(tv, "proposta_cancelada");
  const handleReturn = (tv: Televenda) => handleStatusChange(tv, "devolvido");
  const handleApproveExclusion = (tv: Televenda) => handleDeleteTelevendas(tv);
  const handleRejectExclusion = (tv: Televenda) => handleStatusChange(tv, "exclusao_rejeitada");
  const handleApproveCancellation = (tv: Televenda) => handleStatusChange(tv, "proposta_cancelada");
  const handleRejectCancellation = (tv: Televenda) => handleStatusChange(tv, "devolvido");

  // Permission checks
  const canEdit = (tv: Televenda) => isAdmin || (isGestor && userCompanyIds.includes(tv.company_id || ""));
  const canEditLimited = (tv: Televenda) => tv.user_id === user?.id && !isGestorOrAdmin;
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
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Gestão de Televendas</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {filters.dateMode === "pagamento" && (
                <span className="text-xs text-amber-600 font-medium">💰 Visão por Data de Pagamento</span>
              )}
              {showActiveOnly && (
                <span className="text-xs text-blue-600 font-medium">📌 Propostas em Andamento</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Active proposals toggle */}
          <Button
            variant={showActiveOnly ? "default" : "outline"}
            size="sm"
            onClick={handleToggleActiveOnly}
            className="h-10 rounded-xl gap-1 text-xs"
          >
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Em Andamento</span>
          </Button>
          {/* Sync all */}
          {isGestorOrAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAll}
              disabled={refreshing}
              className="h-10 rounded-xl gap-1 text-xs"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sync</span>
            </Button>
          )}
          <FiltersDrawer
            filters={filters}
            onFiltersChange={setFilters}
            users={users}
            isGestorOrAdmin={isGestorOrAdmin}
            activeCount={activeFiltersCount}
            availableBanks={availableBanks}
          />
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => { setRefreshing(true); fetchTelevendas(); }} 
            disabled={refreshing} 
            className="h-10 w-10 rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Smart Search Bar */}
      <SmartSearch
        value={filters.search}
        onChange={(value) => setFilters({ ...filters, search: value })}
        televendas={televendas}
        onSelectResult={(tv) => handleView(tv)}
        placeholder="Buscar por nome, CPF, telefone ou ID..."
      />

      {/* Dashboard Cards with clickable status filters */}
      <DashboardCards
        televendas={televendas}
        onFilterByStatus={handleFilterByStatus}
        selectedStatus={filters.status !== "all" ? filters.status : undefined}
        isGestorOrAdmin={isGestorOrAdmin}
        dateMode={filters.dateMode}
      />

      {/* Banking Pipeline */}
      <BankingPipeline
        televendas={televendas}
        onFilterByBankStatus={handleFilterByBankStatus}
        selectedBankStatus={bankStatusFilter}
      />

      {/* Production Bar */}
      <ProductionBar
        televendas={televendas}
        isGestorOrAdmin={isGestorOrAdmin}
      />

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
                  onLimitedEdit={handleLimitedEdit}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  canEdit={canEdit}
                  canEditLimited={canEditLimited}
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
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onReturn={handleReturn}
                  onView={handleView}
                  onApproveExclusion={handleApproveExclusion}
                  onRejectExclusion={handleRejectExclusion}
                  onApproveCancellation={handleApproveCancellation}
                  onRejectCancellation={handleRejectCancellation}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <DetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        televenda={selectedTelevenda}
        isGestorOrAdmin={isGestorOrAdmin}
        onRefresh={fetchTelevendas}
      />

      {/* Edit Proposal Modal (Admin/Gestor) */}
      <EditProposalModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        televenda={editingTelevenda}
        onSave={handleEditSave}
        banks={registeredBanks}
      />

      {/* Collaborator Edit Modal (Limited fields) */}
      <CollaboratorEditModal
        open={limitedEditModalOpen}
        onOpenChange={setLimitedEditModalOpen}
        televenda={editingTelevenda}
        onSave={handleLimitedEditSave}
        banks={registeredBanks}
      />

      {/* Status Change Modal with audit */}
      <StatusChangeModal
        open={statusChangeModal.open}
        onOpenChange={(open) => setStatusChangeModal({ ...statusChangeModal, open })}
        televenda={statusChangeModal.televenda}
        newStatus={statusChangeModal.newStatus}
        onConfirm={confirmStatusChange}
        isLoading={statusChangeLoading}
      />
    </div>
  );
};

export default TelevendasModule;
