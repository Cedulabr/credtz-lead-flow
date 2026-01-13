import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useTelevendasNotifications } from "@/hooks/useTelevendasNotifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2, Search, UserPlus, History } from "lucide-react";

// Status que usuários comuns podem definir
const USER_ALLOWED_STATUSES = ["solicitado_digitacao", "proposta_digitada"];

// Status exclusivos para gestor/admin
const GESTOR_ONLY_STATUSES = ["pendente", "pago", "cancelado"];

// Todos os status disponíveis
const ALL_STATUSES = [...USER_ALLOWED_STATUSES, ...GESTOR_ONLY_STATUSES];

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
}

interface TelevendaWithUser extends Televenda {
  user_id: string;
  user?: {
    name: string;
  } | null;
}

interface StatusHistoryItem {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by: string;
  changed_by_name?: string;
}

// Utility functions for currency formatting
const formatCurrencyDisplay = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatCurrencyInput = (value: string): string => {
  const numbers = value.replace(/\D/g, "");
  if (!numbers) return "";
  const amount = parseInt(numbers) / 100;
  return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const parseCurrencyToNumber = (value: string): number => {
  if (!value) return 0;
  // Remove pontos de milhar e substitui vírgula por ponto
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

export const TelevendasManagement = () => {
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();
  const { createPendingNotification } = useTelevendasNotifications();
  const [televendas, setTelevendas] = useState<TelevendaWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [companyUsers, setCompanyUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTv, setSelectedTv] = useState<TelevendaWithUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTv, setEditingTv] = useState<TelevendaWithUser | null>(null);
  const [deletingTvId, setDeletingTvId] = useState<string | null>(null);
  const [isGestor, setIsGestor] = useState(false);
  const [userCompanyIds, setUserCompanyIds] = useState<string[]>([]);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>("");

  // Form states for edit dialog with proper formatting
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

  // Verificar se o usuário é gestor da empresa
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

  // Buscar nome do usuário atual para notificações
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

  // Fetch users from the same company for gestor assignment
  useEffect(() => {
    const fetchCompanyUsers = async () => {
      if (!user?.id || (!isGestor && !isAdmin)) return;

      try {
        if (isAdmin) {
          // Admin can see all users
          const { data, error } = await supabase
            .from('profiles')
            .select('id, name')
            .order('name');
          
          if (error) throw error;
          setCompanyUsers(data || []);
        } else if (isGestor && userCompanyIds.length > 0) {
          // Gestor can only see users from their companies
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
  }, [user?.id, isGestor, isAdmin, userCompanyIds]);

  // Verificar se pode editar a proposta (admin ou gestor da empresa)
  const canEditTv = (tv: TelevendaWithUser) => {
    if (isAdmin) return true;
    if (isGestor && tv.company_id && userCompanyIds.includes(tv.company_id)) return true;
    return false;
  };

  const fetchUsers = async () => {
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
  };

  const fetchTelevendas = async () => {
    try {
      let query = supabase
        .from("televendas")
        .select("*")
        .order("created_at", { ascending: false });

      // Colaborador só pode ver suas próprias propostas
      if (!isAdmin && !isGestor) {
        query = query.eq("user_id", user?.id);
      } else if (isGestor && !isAdmin && userCompanyIds.length > 0) {
        // Gestor pode ver propostas de sua empresa
        query = query.in("company_id", userCompanyIds);
      }

      if (selectedMonth && selectedMonth !== "all") {
        const [year, month] = selectedMonth.split("-");
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        
        query = query
          .gte("data_venda", startDate.toISOString().split("T")[0])
          .lte("data_venda", endDate.toISOString().split("T")[0]);
      }

      if (selectedUserId && selectedUserId !== "all") {
        query = query.eq("user_id", selectedUserId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user names for each televenda
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
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchTelevendas();
  }, [selectedMonth, selectedUserId]);

  // Verificar se pode alterar status (qualquer usuário pode alterar seus próprios, gestor/admin podem alterar todos)
  const canChangeStatus = (tv?: TelevendaWithUser) => {
    if (isAdmin) return true;
    // Gestor pode alterar status de propostas da sua empresa
    if (isGestor && tv?.company_id && userCompanyIds.includes(tv.company_id)) return true;
    // Usuário comum pode alterar status das suas próprias propostas
    if (tv?.user_id === user?.id) return true;
    return false;
  };

  // Verificar se pode mudar para um status específico
  const canChangeToStatus = (newStatus: string, tv?: TelevendaWithUser) => {
    // Admin e gestor podem mudar para qualquer status
    if (isAdmin) return true;
    if (isGestor && tv?.company_id && userCompanyIds.includes(tv.company_id)) return true;
    
    // Usuário comum só pode mudar para status permitidos
    if (USER_ALLOWED_STATUSES.includes(newStatus)) {
      return true;
    }
    
    return false;
  };

  // Obter status disponíveis para o usuário baseado na proposta
  const getAvailableStatuses = (tv?: TelevendaWithUser) => {
    if (isAdmin) return ALL_STATUSES;
    if (isGestor && tv?.company_id && userCompanyIds.includes(tv.company_id)) return ALL_STATUSES;
    // Usuário comum só pode usar status permitidos
    return USER_ALLOWED_STATUSES;
  };

  const updateStatus = async (id: string, newStatus: string, tv?: TelevendaWithUser) => {
    // Verificar permissão para alterar status
    if (!canChangeStatus(tv)) {
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para alterar o status desta proposta.",
        variant: "destructive",
      });
      return;
    }

    // Verificação para status específicos (gestor only)
    if (!canChangeToStatus(newStatus, tv)) {
      toast({
        title: "Sem permissão",
        description: "Este status só pode ser definido por gestores ou administradores.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Buscar o status atual para registrar no histórico
      const currentTv = televendas.find(televenda => televenda.id === id);
      const fromStatus = currentTv?.status || null;

      // Atualizar o status com informações de auditoria
      const { error } = await supabase
        .from("televendas")
        .update({ 
          status: newStatus,
          status_updated_at: new Date().toISOString(),
          status_updated_by: user?.id
        })
        .eq("id", id);

      if (error) throw error;

      // Registrar no histórico de mudanças de status
      const { error: historyError } = await supabase
        .from("televendas_status_history")
        .insert({
          televendas_id: id,
          from_status: fromStatus,
          to_status: newStatus,
          changed_by: user?.id,
        });

      if (historyError) {
        console.error("Error inserting status history:", historyError);
      }

      // Se marcou como PENDENTE, criar notificação para o usuário responsável
      if (newStatus === "pendente" && currentTv && currentTv.user_id !== user?.id) {
        await createPendingNotification(
          id,
          currentTv.user_id,
          currentTv.nome,
          currentUserName
        );
      }

      // Se marcou como PAGO, criar alerta de reaproveitamento
      if (newStatus === "pago") {
        await createReuseAlert(id);
      }

      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso!",
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

  // Criar alerta de reaproveitamento quando uma proposta for marcada como PAGA
  const createReuseAlert = async (televendaId: string) => {
    try {
      // Buscar dados da televenda
      const televenda = televendas.find(tv => tv.id === televendaId);
      if (!televenda) return;

      // Buscar configuração do banco
      const { data: bankSettings, error: bankError } = await supabase
        .from("bank_reuse_settings")
        .select("*")
        .eq("bank_name", televenda.banco)
        .eq("is_active", true)
        .maybeSingle();

      if (bankError) {
        console.error("Erro ao buscar configuração do banco:", bankError);
        return;
      }

      // Se não houver configuração para o banco, não criar alerta
      if (!bankSettings) {
        console.log(`Banco ${televenda.banco} não tem configuração de reaproveitamento`);
        return;
      }

      // Calcular data do alerta (data_venda + prazo em meses)
      // Adicionar T12:00:00 para evitar problemas de timezone
      const paymentDate = new Date(televenda.data_venda + 'T12:00:00');
      const alertDate = new Date(paymentDate);
      alertDate.setMonth(alertDate.getMonth() + bankSettings.reuse_months);

      // Buscar gestor da empresa (se houver)
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
        
        if (gestorData) {
          gestorId = gestorData.user_id;
        }
      }

      // Verificar se já existe um alerta para esta televenda
      const { data: existingAlert } = await supabase
        .from("client_reuse_alerts")
        .select("id")
        .eq("televendas_id", televendaId)
        .maybeSingle();

      if (existingAlert) {
        console.log("Alerta já existe para esta televenda");
        return;
      }

      // Criar o alerta de reaproveitamento
      const { error: alertError } = await supabase
        .from("client_reuse_alerts")
        .insert({
          proposta_id: 0, // Usamos televendas_id ao invés
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

      if (alertError) {
        console.error("Erro ao criar alerta de reaproveitamento:", alertError);
        return;
      }

      console.log(`Alerta de reaproveitamento criado para ${televenda.nome} - ${televenda.banco} em ${alertDate.toISOString().split("T")[0]}`);
      
      toast({
        title: "Alerta programado!",
        description: `Cliente ${televenda.nome} será notificado para nova operação em ${alertDate.toLocaleDateString("pt-BR")}`,
      });
    } catch (error) {
      console.error("Erro ao criar alerta de reaproveitamento:", error);
    }
  };

  const handleEdit = (tv: TelevendaWithUser, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEditTv(tv)) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para editar esta proposta",
        variant: "destructive",
      });
      return;
    }
    
    // Initialize form data with proper formatting
    setEditFormData({
      nome: tv.nome,
      cpf: formatCPF(tv.cpf),
      telefone: formatPhone(tv.telefone),
      data_venda: tv.data_venda,
      banco: tv.banco,
      tipo_operacao: tv.tipo_operacao,
      parcela: formatCurrencyDisplay(tv.parcela),
      troco: formatCurrencyDisplay(tv.troco),
      saldo_devedor: formatCurrencyDisplay(tv.saldo_devedor),
      observacao: tv.observacao || "",
      user_id: tv.user_id,
    });
    
    setEditingTv(tv);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (tvId: string, tv: TelevendaWithUser, e: React.MouseEvent) => {
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
      // Parse currency values correctly
      const parcelaValue = parseCurrencyToNumber(editFormData.parcela);
      const trocoValue = editFormData.troco ? parseCurrencyToNumber(editFormData.troco) : null;
      const saldoDevedorValue = editFormData.saldo_devedor ? parseCurrencyToNumber(editFormData.saldo_devedor) : null;

      const updateData: any = {
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
      };

      const { error } = await (supabase as any)
        .from("televendas")
        .update(updateData)
        .eq("id", editingTv.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Proposta atualizada com sucesso!",
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
      const { error } = await (supabase as any)
        .from("televendas")
        .delete()
        .eq("id", deletingTvId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Proposta excluída com sucesso!",
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string }> = {
      solicitado_digitacao: { variant: "outline", label: "Solicitado Digitação", className: "bg-blue-500/10 text-blue-600 border-blue-300" },
      proposta_digitada: { variant: "outline", label: "Proposta Digitada", className: "bg-purple-500/10 text-purple-600 border-purple-300" },
      pendente: { variant: "default", label: "Pendente", className: "bg-yellow-500/10 text-yellow-600 border-yellow-300" },
      pago: { variant: "secondary", label: "Pago", className: "bg-green-500/10 text-green-600 border-green-300" },
      cancelado: { variant: "destructive", label: "Cancelado" },
    };
    
    const config = statusConfig[status] || { variant: "default", label: status };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      solicitado_digitacao: "Solicitado Digitação",
      proposta_digitada: "Proposta Digitada",
      pendente: "Pendente",
      pago: "Pago",
      cancelado: "Cancelado",
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

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
        // Buscar nomes dos usuários que fizeram as alterações
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

  const handleRowClick = (tv: TelevendaWithUser) => {
    setSelectedTv(tv);
    setIsDialogOpen(true);
    // Buscar histórico de status quando abrir o dialog
    fetchStatusHistory(tv.id);
  };

  const getMonthOptions = () => {
    const months = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      months.push({ value, label });
    }
    return months;
  };

  // Filter televendas based on search term and status
  const filteredTelevendas = televendas.filter((tv) => {
    const matchesSearch = !searchTerm || 
      tv.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tv.cpf.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || tv.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Status counts for badges
  const statusCounts = {
    all: televendas.length,
    solicitado_digitacao: televendas.filter(tv => tv.status === "solicitado_digitacao").length,
    proposta_digitada: televendas.filter(tv => tv.status === "proposta_digitada").length,
    pago: televendas.filter(tv => tv.status === "pago").length,
    pendente: televendas.filter(tv => tv.status === "pendente").length,
    cancelado: televendas.filter(tv => tv.status === "cancelado").length,
  };

  const tipoOperacaoOptions = [
    { value: "Portabilidade", label: "Portabilidade" },
    { value: "Novo empréstimo", label: "Novo Empréstimo" },
    { value: "Refinanciamento", label: "Refinanciamento" },
    { value: "Cartão", label: "Cartão" },
  ];

  return (
    <>
      <Card className="mb-20 md:mb-0">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-base md:text-xl">Gestão de Propostas - Televendas</CardTitle>
            </div>
            
            {/* Status filter badges - horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap md:overflow-visible">
              <Badge 
                variant={selectedStatus === "all" ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap flex-shrink-0"
                onClick={() => setSelectedStatus("all")}
              >
                Todos ({statusCounts.all})
              </Badge>
              <Badge 
                variant={selectedStatus === "solicitado_digitacao" ? "default" : "outline"}
                className="cursor-pointer bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 whitespace-nowrap flex-shrink-0"
                onClick={() => setSelectedStatus("solicitado_digitacao")}
              >
                📝 Solicitado ({statusCounts.solicitado_digitacao})
              </Badge>
              <Badge 
                variant={selectedStatus === "proposta_digitada" ? "default" : "outline"}
                className="cursor-pointer bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 whitespace-nowrap flex-shrink-0"
                onClick={() => setSelectedStatus("proposta_digitada")}
              >
                📋 Digitada ({statusCounts.proposta_digitada})
              </Badge>
              <Badge 
                variant={selectedStatus === "pendente" ? "default" : "outline"}
                className="cursor-pointer bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 whitespace-nowrap flex-shrink-0"
                onClick={() => setSelectedStatus("pendente")}
              >
                ⏳ Pendentes ({statusCounts.pendente})
              </Badge>
              <Badge 
                variant={selectedStatus === "pago" ? "default" : "outline"}
                className="cursor-pointer bg-green-500/10 text-green-600 hover:bg-green-500/20 whitespace-nowrap flex-shrink-0"
                onClick={() => setSelectedStatus("pago")}
              >
                ✓ Pagas ({statusCounts.pago})
              </Badge>
              <Badge 
                variant={selectedStatus === "cancelado" ? "default" : "outline"}
                className="cursor-pointer bg-red-500/10 text-red-600 hover:bg-red-500/20 whitespace-nowrap flex-shrink-0"
                onClick={() => setSelectedStatus("cancelado")}
              >
                ✕ Canceladas ({statusCounts.cancelado})
              </Badge>
            </div>
            
            <div className="flex flex-col gap-3">
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* Filters row */}
              <div className="flex flex-col sm:flex-row gap-2">
                {/* User filter (admin e gestor) */}
                {(isAdmin || isGestor) && (
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filtrar por usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os usuários</SelectItem>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || 'Sem nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                {/* Month filter */}
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filtrar por mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {getMonthOptions().map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0">
          {/* Mobile: Card layout */}
          <div className="block md:hidden space-y-3">
            {filteredTelevendas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">
                {searchTerm ? 'Nenhuma venda encontrada' : 'Nenhuma venda registrada'}
              </p>
            ) : (
              filteredTelevendas.map((tv) => (
                <div 
                  key={tv.id} 
                  className="p-3 border rounded-lg bg-card space-y-2"
                  onClick={() => handleRowClick(tv)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{tv.nome}</p>
                      <p className="text-xs text-muted-foreground">{formatCPF(tv.cpf)}</p>
                    </div>
                    {getStatusBadge(tv.status)}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{tv.banco}</span>
                    <span>•</span>
                    <span>{tv.tipo_operacao}</span>
                    <span>•</span>
                    <span>R$ {formatCurrencyDisplay(tv.parcela)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">
                      {tv.data_venda ? tv.data_venda.split('-').reverse().join('/') : '-'}
                    </span>
                    {canChangeStatus(tv) && (
                      <Select
                        value={tv.status}
                        onValueChange={(value) => updateStatus(tv.id, value, tv)}
                      >
                        <SelectTrigger className="w-32 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                          <SelectValue>
                            {getStatusLabel(tv.status)}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableStatuses(tv).map((status) => (
                            <SelectItem key={status} value={status}>
                              {getStatusLabel(status)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: Table layout */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                  {(isAdmin || isGestor) && <TableHead>Gerenciar</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTelevendas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={(isAdmin || isGestor) ? 10 : 9} className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'Nenhuma venda encontrada' : 'Nenhuma venda registrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTelevendas.map((tv) => (
                  <TableRow 
                    key={tv.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(tv)}
                  >
                    <TableCell className="text-sm text-muted-foreground">{tv.user?.name || 'N/A'}</TableCell>
                    <TableCell>{tv.nome}</TableCell>
                    <TableCell>{formatCPF(tv.cpf)}</TableCell>
                    <TableCell>{tv.data_venda ? tv.data_venda.split('-').reverse().join('/') : '-'}</TableCell>
                    <TableCell>{tv.banco}</TableCell>
                    <TableCell>{tv.tipo_operacao}</TableCell>
                    <TableCell>R$ {formatCurrencyDisplay(tv.parcela)}</TableCell>
                    <TableCell>{getStatusBadge(tv.status)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {canChangeStatus(tv) ? (
                        <Select
                          value={tv.status}
                          onValueChange={(value) => updateStatus(tv.id, value, tv)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue>
                              {getStatusLabel(tv.status)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableStatuses(tv).map((status) => (
                              <SelectItem key={status} value={status}>
                                {getStatusLabel(status)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        getStatusBadge(tv.status)
                      )}
                    </TableCell>
                    {(isAdmin || isGestor) && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {canEditTv(tv) ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleEdit(tv, e)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => handleDelete(tv.id, tv, e)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Detalhes da Venda</span>
              {selectedTv && getStatusBadge(selectedTv.status)}
            </DialogTitle>
            <DialogDescription>
              Informações completas da proposta de venda
            </DialogDescription>
          </DialogHeader>
          {selectedTv && (
            <div className="space-y-6">
              {/* Dados do Cliente */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary border-b pb-2">Dados do Cliente</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nome do Cliente</Label>
                    <p className="font-medium text-foreground">{selectedTv.nome}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">CPF</Label>
                    <p className="font-medium text-foreground font-mono">{formatCPF(selectedTv.cpf)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p className="font-medium text-foreground">{formatPhone(selectedTv.telefone)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Data da Venda</Label>
                    <p className="font-medium text-foreground">
                      {selectedTv.data_venda ? selectedTv.data_venda.split('-').reverse().join('/') : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dados da Operação */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary border-b pb-2">Dados da Operação</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Banco</Label>
                    <p className="font-medium text-foreground">{selectedTv.banco}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Tipo de Operação</Label>
                    <Badge variant="outline" className="mt-1">
                      {selectedTv.tipo_operacao}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Valores */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary border-b pb-2">Valores</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <Label className="text-xs text-muted-foreground">Parcela</Label>
                    <p className="font-bold text-lg text-foreground">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTv.parcela)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <Label className="text-xs text-muted-foreground">Troco</Label>
                    <p className="font-bold text-lg text-foreground">
                      {selectedTv.troco 
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTv.troco)
                        : "R$ 0,00"}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                    <Label className="text-xs text-muted-foreground">Saldo Devedor</Label>
                    <p className="font-bold text-lg text-foreground">
                      {selectedTv.saldo_devedor 
                        ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedTv.saldo_devedor)
                        : "R$ 0,00"}
                    </p>
                  </div>
                </div>
                {selectedTv.tipo_operacao?.toLowerCase() === 'portabilidade' && (
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                    <Label className="text-xs text-muted-foreground">Valor Bruto (Saldo Devedor + Troco)</Label>
                    <p className="font-bold text-lg text-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                        (selectedTv.saldo_devedor || 0) + (selectedTv.troco || 0)
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary border-b pb-2">Observações</h4>
                <div className="p-4 bg-muted/50 rounded-lg min-h-[60px]">
                  {selectedTv.observacao ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selectedTv.observacao}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma observação registrada</p>
                  )}
                </div>
              </div>

              {/* Histórico de Alterações de Status */}
              {(isAdmin || isGestor) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-primary border-b pb-2 flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Alterações de Status
                  </h4>
                  <div className="p-4 bg-muted/50 rounded-lg max-h-[200px] overflow-y-auto">
                    {loadingHistory ? (
                      <p className="text-sm text-muted-foreground">Carregando histórico...</p>
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
                                <Badge variant={history.to_status === "pago" ? "secondary" : history.to_status === "cancelado" ? "destructive" : "default"} className="text-xs">
                                  {history.to_status}
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
                      <p className="text-sm text-muted-foreground italic">Nenhuma alteração de status registrada</p>
                    )}
                  </div>
                </div>
              )}

              {/* Metadados */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                <span>Cadastrado em: {new Date(selectedTv.created_at).toLocaleString("pt-BR")}</span>
                {selectedTv.user?.name && (
                  <span>Vendedor: {selectedTv.user.name}</span>
                )}
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
            <DialogDescription>
              Edite os dados da proposta de televenda
            </DialogDescription>
          </DialogHeader>
          {editingTv && (
            <div className="grid gap-4">
              {/* Responsável pela proposta - Only for gestor/admin */}
              {(isAdmin || isGestor) && (
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
                      <SelectValue placeholder="Selecione o responsável" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyUsers.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name || 'Sem nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Altere o usuário responsável por esta proposta
                  </p>
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
                    placeholder="000.000.000-00"
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
                    placeholder="(00) 00000-0000"
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
                      <SelectValue placeholder="Selecione o tipo" />
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

      {/* Delete Confirmation Dialog */}
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
    </>
  );
};
