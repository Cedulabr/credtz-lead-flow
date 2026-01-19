import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTelevendasNotifications } from "@/hooks/useTelevendasNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  History, 
  UserPlus, 
  RefreshCw,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft
} from "lucide-react";

import {
  TelevendasSummaryCards,
  TelevendasFilters,
  TelevendasClientView,
  TelevendasProposalList,
  TelevendasUserStats,
  STATUS_CONFIG
} from "./televendas";

// Status workflow
const USER_ALLOWED_STATUSES = [
  "solicitado_digitacao",
  "proposta_digitada", 
  "pago_aguardando",
  "cancelado_aguardando"
];

const GESTOR_STATUSES = [
  "pendente",
  "devolvido",
  "pago_aprovado",
  "cancelado_confirmado"
];

const ALL_STATUSES = [...USER_ALLOWED_STATUSES, ...GESTOR_STATUSES];

// Legacy status mapping
const LEGACY_STATUS_MAP: Record<string, string> = {
  "pago": "pago_aprovado",
  "cancelado": "cancelado_confirmado"
};

interface User {
  id: string;
  name: string;
}

interface Televenda {
  id: string;
  nome: string;
  cpf: string;
  data_venda: string;
  telefone: string;
  banco: string;
  parcela: number;
  troco: number | null;
  saldo_devedor: number | null;
  tipo_operacao: string;
  observacao: string | null;
  status: string;
  created_at: string;
  company_id: string | null;
  user_id: string;
  user?: { name: string } | null;
}

interface StatusHistoryItem {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by: string;
  changed_by_name?: string;
}

// Utility functions
const formatCurrencyDisplay = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const formatCurrencyInput = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return "";
  const amount = parseInt(numbers) / 100;
  return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrencyToNumber = (value: string): number => {
  if (!value) return 0;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};

const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers ? `(${numbers}` : "";
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const tipoOperacaoOptions = [
  { value: "Portabilidade", label: "Portabilidade" },
  { value: "Novo empréstimo", label: "Novo Empréstimo" },
  { value: "Refinanciamento", label: "Refinanciamento" },
  { value: "Cartão", label: "Cartão" },
];

export const TelevendasPremium = () => {
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();
  const { createPendingNotification } = useTelevendasNotifications();
  
  // Data states
  const [televendas, setTelevendas] = useState<Televenda[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"propostas" | "clientes" | "estatisticas">("propostas");
  
  // Dialog states
  const [selectedTv, setSelectedTv] = useState<Televenda | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTv, setEditingTv] = useState<Televenda | null>(null);
  const [deletingTvId, setDeletingTvId] = useState<string | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Client view state
  const [selectedClientCpf, setSelectedClientCpf] = useState<string | null>(null);
  
  // User role states
  const [isGestor, setIsGestor] = useState(false);
  const [userCompanyIds, setUserCompanyIds] = useState<string[]>([]);
  const [currentUserName, setCurrentUserName] = useState<string>("");
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    nome: "",
    cpf: "",
    telefone: "",
    data_venda: "",
    banco: "",
    tipo_operacao: "",
    parcela: "",
    troco: "",
    saldo_devedor: "",
    observacao: "",
    user_id: "",
  });

  const isGestorOrAdmin = isAdmin || isGestor;

  // Check gestor role
  useEffect(() => {
    const checkGestorRole = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_companies')
          .select('company_id, company_role')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (error) throw error;
        
        const gestorCompanies = data?.filter(uc => uc.company_role === 'gestor') || [];
        setIsGestor(gestorCompanies.length > 0);
        setUserCompanyIds(data?.map(uc => uc.company_id) || []);
      } catch (error) {
        console.error('Error checking gestor role:', error);
      }
    };

    checkGestorRole();
  }, [user?.id]);

  // Fetch current user name
  useEffect(() => {
    const fetchCurrentUserName = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        
        if (!error && data) {
          setCurrentUserName(data.name || 'Usuário');
        }
      } catch (error) {
        console.error('Error fetching current user name:', error);
      }
    };

    fetchCurrentUserName();
  }, [user?.id]);

  // Fetch company users for assignment
  useEffect(() => {
    const fetchCompanyUsers = async () => {
      if (!user?.id || !isGestorOrAdmin) return;

      try {
        if (isAdmin) {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, name')
            .order('name');
          
          if (error) throw error;
          setCompanyUsers(data || []);
        } else if (isGestor && userCompanyIds.length > 0) {
          const { data, error } = await supabase
            .from('user_companies')
            .select('user_id')
            .in('company_id', userCompanyIds)
            .eq('is_active', true);

          if (error) throw error;

          const userIds = [...new Set(data?.map(uc => uc.user_id) || [])];
          
          if (userIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
              .from('profiles')
              .select('id, name')
              .in('id', userIds)
              .order('name');

            if (profilesError) throw profilesError;
            setCompanyUsers(profilesData || []);
          }
        }
      } catch (error) {
        console.error('Error fetching company users:', error);
      }
    };

    fetchCompanyUsers();
  }, [user?.id, isGestor, isAdmin, userCompanyIds, isGestorOrAdmin]);

  // Fetch users for filter
  const fetchUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  // Get date range based on period
  const getDateRange = useCallback(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (selectedPeriod) {
      case "today":
        return { start: today, end: now };
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: today };
      case "3days":
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        return { start: threeDaysAgo, end: now };
      case "7days":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return { start: sevenDaysAgo, end: now };
      case "month":
        if (selectedMonth && selectedMonth !== "all") {
          const [year, month] = selectedMonth.split("-");
          const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
          const endDate = new Date(parseInt(year), parseInt(month), 0);
          return { start: startDate, end: endDate };
        }
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: firstOfMonth, end: now };
      default:
        return null;
    }
  }, [selectedPeriod, selectedMonth]);

  // Fetch televendas
  const fetchTelevendas = useCallback(async () => {
    try {
      let query = supabase
        .from("televendas")
        .select("*")
        .order("created_at", { ascending: false });

      // Role-based filtering
      if (!isAdmin && !isGestor) {
        query = query.eq("user_id", user?.id);
      } else if (isGestor && !isAdmin && userCompanyIds.length > 0) {
        query = query.in("company_id", userCompanyIds);
      }

      // Date range filtering
      const dateRange = getDateRange();
      if (dateRange) {
        query = query
          .gte("data_venda", dateRange.start.toISOString().split("T")[0])
          .lte("data_venda", dateRange.end.toISOString().split("T")[0]);
      }

      // User filtering
      if (selectedUserId && selectedUserId !== "all") {
        query = query.eq("user_id", selectedUserId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user names
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(tv => tv.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        
        const profilesMap = new Map(
          (profilesData || []).map(p => [p.id, p])
        );
        
        const televendasWithUsers = data.map(tv => ({
          ...tv,
          // Map legacy status to new status
          status: LEGACY_STATUS_MAP[tv.status] || tv.status,
          user: profilesMap.get(tv.user_id) || null
        }));
        
        setTelevendas(televendasWithUsers);
      } else {
        setTelevendas([]);
      }
    } catch (error) {
      console.error("Error fetching televendas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar vendas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, isAdmin, isGestor, userCompanyIds, selectedUserId, getDateRange, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchTelevendas();
  }, [fetchTelevendas]);

  // Filtered televendas
  const filteredTelevendas = useMemo(() => {
    return televendas.filter((tv) => {
      const matchesSearch = !searchTerm || 
        tv.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tv.cpf.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = selectedStatus === "all" || tv.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [televendas, searchTerm, selectedStatus]);

  // Client view: filter by selected CPF
  const clientPropostas = useMemo(() => {
    if (!selectedClientCpf) return filteredTelevendas;
    return filteredTelevendas.filter(
      tv => tv.cpf.replace(/\D/g, "") === selectedClientCpf
    );
  }, [filteredTelevendas, selectedClientCpf]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: televendas.length };
    ALL_STATUSES.forEach(status => {
      counts[status] = televendas.filter(tv => tv.status === status).length;
    });
    // Include legacy statuses mapped
    counts.pago_aprovado = (counts.pago_aprovado || 0) + televendas.filter(tv => tv.status === "pago").length;
    counts.cancelado_confirmado = (counts.cancelado_confirmado || 0) + televendas.filter(tv => tv.status === "cancelado").length;
    return counts;
  }, [televendas]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const uniqueCpfs = new Set(televendas.map(tv => tv.cpf.replace(/\D/g, "")));
    return {
      totalPropostas: televendas.length,
      clientesUnicos: uniqueCpfs.size,
      aguardandoGestao: televendas.filter(tv => 
        tv.status === "pago_aguardando" || tv.status === "cancelado_aguardando"
      ).length,
      pendentes: televendas.filter(tv => tv.status === "pendente").length,
      pagosAprovados: televendas.filter(tv => 
        tv.status === "pago_aprovado" || tv.status === "pago"
      ).length,
      cancelados: televendas.filter(tv => 
        tv.status === "cancelado_confirmado" || tv.status === "cancelado"
      ).length,
    };
  }, [televendas]);

  // Month options
  const monthOptions = useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      months.push({ value, label });
    }
    return months;
  }, []);

  // Permission checks
  const canEditTv = useCallback((tv: Televenda) => {
    if (isAdmin) return true;
    if (isGestor && tv.company_id && userCompanyIds.includes(tv.company_id)) return true;
    return false;
  }, [isAdmin, isGestor, userCompanyIds]);

  const canChangeStatus = useCallback((tv: Televenda) => {
    if (isAdmin) return true;
    if (isGestor && tv.company_id && userCompanyIds.includes(tv.company_id)) return true;
    if (tv.user_id === user?.id) return true;
    return false;
  }, [isAdmin, isGestor, userCompanyIds, user?.id]);

  const getAvailableStatuses = useCallback((tv: Televenda) => {
    if (isAdmin) return ALL_STATUSES;
    if (isGestor && tv.company_id && userCompanyIds.includes(tv.company_id)) return ALL_STATUSES;
    return USER_ALLOWED_STATUSES;
  }, [isAdmin, isGestor, userCompanyIds]);

  // Update status
  const updateStatus = async (id: string, newStatus: string, tv: Televenda) => {
    if (!canChangeStatus(tv)) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para alterar o status desta proposta.",
        variant: "destructive",
      });
      return;
    }

    const availableStatuses = getAvailableStatuses(tv);
    if (!availableStatuses.includes(newStatus)) {
      toast({
        title: "Sem permissão",
        description: "Este status só pode ser definido por gestores ou administradores.",
        variant: "destructive",
      });
      return;
    }

    try {
      const currentTv = televendas.find(televenda => televenda.id === id);
      const fromStatus = currentTv?.status || null;

      const { error } = await supabase
        .from("televendas")
        .update({ 
          status: newStatus,
          status_updated_at: new Date().toISOString(),
          status_updated_by: user?.id
        })
        .eq("id", id);

      if (error) throw error;

      // Record history
      await supabase
        .from("televendas_status_history")
        .insert({
          televendas_id: id,
          from_status: fromStatus,
          to_status: newStatus,
          changed_by: user?.id,
        });

      // Notifications
      if (newStatus === "pendente" && currentTv && currentTv.user_id !== user?.id) {
        await createPendingNotification(
          id,
          currentTv.user_id,
          currentTv.nome,
          currentUserName
        );
      }

      // Create reuse alert for approved payments
      if (newStatus === "pago_aprovado") {
        await createReuseAlert(id);
      }

      toast({
        title: "✅ Status atualizado",
        description: `Proposta movida para "${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.shortLabel || newStatus}"`,
      });

      fetchTelevendas();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    }
  };

  // Create reuse alert
  const createReuseAlert = async (televendaId: string) => {
    try {
      const televenda = televendas.find(tv => tv.id === televendaId);
      if (!televenda) return;

      const { data: bankSettings, error: bankError } = await supabase
        .from("bank_reuse_settings")
        .select("*")
        .eq("bank_name", televenda.banco)
        .eq("is_active", true)
        .maybeSingle();

      if (bankError || !bankSettings) return;

      const paymentDate = new Date(televenda.data_venda + 'T12:00:00');
      const alertDate = new Date(paymentDate);
      alertDate.setMonth(alertDate.getMonth() + bankSettings.reuse_months);

      let gestorId = null;
      if (televenda.company_id) {
        const { data: gestorData } = await supabase
          .from("user_companies")
          .select("user_id")
          .eq("company_id", televenda.company_id)
          .eq("company_role", "gestor")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        
        if (gestorData) gestorId = gestorData.user_id;
      }

      const { data: existingAlert } = await supabase
        .from("client_reuse_alerts")
        .select("id")
        .eq("televendas_id", televendaId)
        .maybeSingle();

      if (existingAlert) return;

      await supabase
        .from("client_reuse_alerts")
        .insert({
          proposta_id: 0,
          televendas_id: televendaId,
          client_name: televenda.nome,
          client_cpf: televenda.cpf.replace(/\D/g, ""),
          client_phone: televenda.telefone.replace(/\D/g, ""),
          bank_name: televenda.banco,
          payment_date: televenda.data_venda,
          reuse_months: bankSettings.reuse_months,
          alert_date: alertDate.toISOString().split("T")[0],
          user_id: televenda.user_id,
          gestor_id: gestorId,
          company_id: televenda.company_id,
          status: "pending"
        });

      toast({
        title: "📅 Alerta programado",
        description: `${televenda.nome} será notificado para nova operação em ${alertDate.toLocaleDateString("pt-BR")}`,
      });
    } catch (error) {
      console.error("Erro ao criar alerta:", error);
    }
  };

  // Fetch status history
  const fetchStatusHistory = async (televendaId: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("televendas_status_history")
        .select("*")
        .eq("televendas_id", televendaId)
        .order("changed_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(h => h.changed_by))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);

        const profilesMap = new Map(
          (profilesData || []).map(p => [p.id, p.name])
        );

        const historyWithNames = data.map(h => ({
          ...h,
          changed_by_name: profilesMap.get(h.changed_by) || "Desconhecido"
        }));

        setStatusHistory(historyWithNames);
      } else {
        setStatusHistory([]);
      }
    } catch (error) {
      console.error("Error fetching status history:", error);
      setStatusHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Handlers
  const handleRowClick = (tv: Televenda) => {
    setSelectedTv(tv);
    setIsDialogOpen(true);
    fetchStatusHistory(tv.id);
  };

  const handleClientClick = (cpf: string) => {
    setSelectedClientCpf(cpf);
    setViewMode("propostas");
  };

  const handleEdit = (tv: Televenda, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEditTv(tv)) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para editar esta proposta",
        variant: "destructive",
      });
      return;
    }
    
    setEditFormData({
      nome: tv.nome,
      cpf: formatCPF(tv.cpf),
      telefone: formatPhone(tv.telefone),
      data_venda: tv.data_venda,
      banco: tv.banco,
      tipo_operacao: tv.tipo_operacao,
      parcela: formatCurrencyInput(String(tv.parcela * 100)),
      troco: tv.troco ? formatCurrencyInput(String(tv.troco * 100)) : "",
      saldo_devedor: tv.saldo_devedor ? formatCurrencyInput(String(tv.saldo_devedor * 100)) : "",
      observacao: tv.observacao || "",
      user_id: tv.user_id,
    });
    
    setEditingTv(tv);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (tvId: string, tv: Televenda, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEditTv(tv)) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para excluir esta proposta",
        variant: "destructive",
      });
      return;
    }
    setDeletingTvId(tvId);
    setIsDeleteDialogOpen(true);
  };

  const confirmEdit = async () => {
    if (!editingTv) return;
    
    try {
      const parcelaValue = parseCurrencyToNumber(editFormData.parcela);
      const trocoValue = editFormData.troco ? parseCurrencyToNumber(editFormData.troco) : null;
      const saldoDevedorValue = editFormData.saldo_devedor ? parseCurrencyToNumber(editFormData.saldo_devedor) : null;

      const { error } = await supabase
        .from("televendas")
        .update({
          nome: editFormData.nome,
          cpf: editFormData.cpf.replace(/\D/g, ""),
          telefone: editFormData.telefone.replace(/\D/g, ""),
          banco: editFormData.banco,
          parcela: parcelaValue,
          troco: trocoValue,
          saldo_devedor: saldoDevedorValue,
          tipo_operacao: editFormData.tipo_operacao,
          observacao: editFormData.observacao || null,
          data_venda: editFormData.data_venda,
          user_id: editFormData.user_id,
        })
        .eq("id", editingTv.id);

      if (error) throw error;

      toast({
        title: "✅ Proposta atualizada",
        description: "As alterações foram salvas com sucesso!",
      });

      setIsEditDialogOpen(false);
      setEditingTv(null);
      fetchTelevendas();
    } catch (error) {
      console.error("Error updating televenda:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar proposta",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deletingTvId) return;
    
    try {
      const { error } = await supabase
        .from("televendas")
        .delete()
        .eq("id", deletingTvId);

      if (error) throw error;

      toast({
        title: "🗑️ Proposta excluída",
        description: "A proposta foi removida com sucesso!",
      });

      setIsDeleteDialogOpen(false);
      setDeletingTvId(null);
      fetchTelevendas();
    } catch (error) {
      console.error("Error deleting televenda:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir proposta",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTelevendas();
  };

  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
      label: status,
      shortLabel: status,
      color: "bg-gray-500/10 text-gray-600 border-gray-300"
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <RefreshCw className="h-8 w-8 text-primary mx-auto" />
          </motion.div>
          <p className="text-muted-foreground">Carregando propostas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-20 md:mb-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {selectedClientCpf && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedClientCpf(null);
                setViewMode("clientes");
              }}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              {selectedClientCpf ? (
                <>Propostas do Cliente</>
              ) : (
                <>Gestão de Televendas</>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedClientCpf 
                ? `CPF: ${formatCPF(selectedClientCpf)}`
                : "Painel inteligente de vendas"
              }
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Summary Cards */}
      {!selectedClientCpf && (
        <TelevendasSummaryCards
          totalPropostas={summaryStats.totalPropostas}
          clientesUnicos={summaryStats.clientesUnicos}
          aguardandoGestao={summaryStats.aguardandoGestao}
          pendentes={summaryStats.pendentes}
          pagosAprovados={summaryStats.pagosAprovados}
          cancelados={summaryStats.cancelados}
          isGestorOrAdmin={isGestorOrAdmin}
        />
      )}

      {/* Filters */}
      {!selectedClientCpf && (
        <Card>
          <CardContent className="pt-6">
            <TelevendasFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              selectedUserId={selectedUserId}
              setSelectedUserId={setSelectedUserId}
              selectedMonth={selectedMonth}
              setSelectedMonth={setSelectedMonth}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
              viewMode={viewMode}
              setViewMode={setViewMode}
              users={users}
              statusCounts={statusCounts}
              isGestorOrAdmin={isGestorOrAdmin}
              monthOptions={monthOptions}
            />
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <Card>
        <CardContent className="pt-6">
          <AnimatePresence mode="wait">
            {viewMode === "estatisticas" && !selectedClientCpf ? (
              <motion.div
                key="estatisticas"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <TelevendasUserStats
                  televendas={filteredTelevendas}
                  onUserClick={(userId) => {
                    setSelectedUserId(userId);
                    setViewMode("propostas");
                  }}
                  isGestorOrAdmin={isGestorOrAdmin}
                />
              </motion.div>
            ) : viewMode === "clientes" && !selectedClientCpf ? (
              <motion.div
                key="clientes"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <TelevendasClientView
                  televendas={filteredTelevendas}
                  onClientClick={handleClientClick}
                  formatCPF={formatCPF}
                  formatCurrency={formatCurrencyDisplay}
                  isGestorOrAdmin={isGestorOrAdmin}
                />
              </motion.div>
            ) : (
              <motion.div
                key="propostas"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <TelevendasProposalList
                  televendas={selectedClientCpf ? clientPropostas : filteredTelevendas}
                  onRowClick={handleRowClick}
                  onStatusChange={updateStatus}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  canChangeStatus={canChangeStatus}
                  canEdit={canEditTv}
                  getAvailableStatuses={getAvailableStatuses}
                  isGestorOrAdmin={isGestorOrAdmin}
                  formatCPF={formatCPF}
                  formatCurrency={formatCurrencyDisplay}
                  formatPhone={formatPhone}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes da Venda
              {selectedTv && (
                <Badge variant="outline" className={getStatusConfig(selectedTv.status).color}>
                  {getStatusConfig(selectedTv.status).label}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Informações completas da proposta
            </DialogDescription>
          </DialogHeader>
          {selectedTv && (
            <div className="space-y-6">
              {/* Client Data */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary border-b pb-2">Dados do Cliente</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <p className="font-medium">{selectedTv.nome}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">CPF</Label>
                    <p className="font-medium font-mono">{formatCPF(selectedTv.cpf)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{formatPhone(selectedTv.telefone)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data da Venda</Label>
                    <p className="font-medium">
                      {selectedTv.data_venda?.split('-').reverse().join('/')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Operation Data */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary border-b pb-2">Dados da Operação</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Banco</Label>
                    <p className="font-medium">{selectedTv.banco}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tipo</Label>
                    <Badge variant="outline">{selectedTv.tipo_operacao}</Badge>
                  </div>
                </div>
              </div>

              {/* Values */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary border-b pb-2">Valores</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <Label className="text-xs text-muted-foreground">Parcela</Label>
                    <p className="font-bold text-lg">{formatCurrencyDisplay(selectedTv.parcela)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <Label className="text-xs text-muted-foreground">Troco</Label>
                    <p className="font-bold text-lg">{formatCurrencyDisplay(selectedTv.troco)}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <Label className="text-xs text-muted-foreground">Saldo Devedor</Label>
                    <p className="font-bold text-lg">{formatCurrencyDisplay(selectedTv.saldo_devedor)}</p>
                  </div>
                </div>
              </div>

              {/* Observations */}
              {selectedTv.observacao && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary border-b pb-2">Observações</h4>
                  <p className="text-sm p-4 bg-muted/50 rounded-lg whitespace-pre-wrap">
                    {selectedTv.observacao}
                  </p>
                </div>
              )}

              {/* Status History */}
              {isGestorOrAdmin && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary border-b pb-2 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Status
                  </h4>
                  <div className="p-4 bg-muted/50 rounded-lg max-h-[200px] overflow-y-auto">
                    {loadingHistory ? (
                      <p className="text-sm text-muted-foreground">Carregando...</p>
                    ) : statusHistory.length > 0 ? (
                      <div className="space-y-3">
                        {statusHistory.map((history) => (
                          <div key={history.id} className="flex items-start gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {history.from_status || "Novo"}
                                </Badge>
                                <span className="text-muted-foreground">→</span>
                                <Badge variant="outline" className={getStatusConfig(history.to_status).color + " text-xs"}>
                                  {getStatusConfig(history.to_status).shortLabel}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                Por: <span className="font-medium">{history.changed_by_name}</span> em {new Date(history.changed_at).toLocaleString("pt-BR")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Nenhum histórico</p>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                <span>Cadastrado em: {new Date(selectedTv.created_at).toLocaleString("pt-BR")}</span>
                {selectedTv.user?.name && <span>Vendedor: {selectedTv.user.name}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Proposta</DialogTitle>
            <DialogDescription>Edite os dados da proposta</DialogDescription>
          </DialogHeader>
          {editingTv && (
            <div className="grid gap-4">
              {isGestorOrAdmin && (
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <UserPlus className="h-4 w-4 text-primary" />
                    <Label className="font-semibold text-primary">Usuário Responsável</Label>
                  </div>
                  <Select 
                    value={editFormData.user_id} 
                    onValueChange={(value) => setEditFormData({ ...editFormData, user_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || 'Sem nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={editFormData.nome}
                    onChange={(e) => setEditFormData({ ...editFormData, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={editFormData.cpf}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setEditFormData({ ...editFormData, cpf: formatCPF(raw) });
                    }}
                    maxLength={14}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={editFormData.telefone}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 11);
                      setEditFormData({ ...editFormData, telefone: formatPhone(raw) });
                    }}
                    maxLength={15}
                  />
                </div>
                <div>
                  <Label>Data da Venda</Label>
                  <Input
                    type="date"
                    value={editFormData.data_venda}
                    onChange={(e) => setEditFormData({ ...editFormData, data_venda: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Banco</Label>
                  <Input
                    value={editFormData.banco}
                    onChange={(e) => setEditFormData({ ...editFormData, banco: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo de Operação</Label>
                  <Select 
                    value={editFormData.tipo_operacao} 
                    onValueChange={(value) => setEditFormData({ ...editFormData, tipo_operacao: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {tipoOperacaoOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Parcela (R$)</Label>
                  <Input
                    value={editFormData.parcela}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setEditFormData({ ...editFormData, parcela: formatCurrencyInput(raw) });
                    }}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label>Troco (R$)</Label>
                  <Input
                    value={editFormData.troco}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setEditFormData({ ...editFormData, troco: formatCurrencyInput(raw) });
                    }}
                    placeholder="0,00"
                  />
                </div>
                <div>
                  <Label>Saldo Devedor (R$)</Label>
                  <Input
                    value={editFormData.saldo_devedor}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "");
                      setEditFormData({ ...editFormData, saldo_devedor: formatCurrencyInput(raw) });
                    }}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={editFormData.observacao}
                  onChange={(e) => setEditFormData({ ...editFormData, observacao: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={confirmEdit}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
