import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ImportBase } from "./ImportBase";
import { DistributedLeadsManager } from "./DistributedLeadsManager";
import { AnimatedContainer, StaggerContainer, StaggerItem } from "./ui/animated-container";
import { SkeletonCard } from "./ui/skeleton-card";
import { 
  Search, 
  Filter, 
  Phone,
  PhoneOff,
  MessageCircle, 
  Clock, 
  CheckCircle, 
  XCircle,
  Star,
  MapPin,
  DollarSign,
  Target,
  TrendingUp,
  AlertCircle,
  Plus,
  Users,
  User,
  Upload,
  Database,
  RefreshCcw,
  Calendar,
  Ban,
  ArrowRightCircle,
  UserCheck,
  UserX,
  History,
  Sparkles,
  Settings,
  FileEdit,
  Building2,
  Loader2,
  Send
} from "lucide-react";
import { Label } from "./ui/label";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  phone2?: string;
  convenio: string;
  status: string;
  created_at: string;
  updated_at?: string;
  assigned_to?: string;
  created_by?: string;
  is_rework?: boolean;
  rework_date?: string;
  notes?: string;
  future_contact_date?: string;
  future_contact_time?: string;
  rejection_reason?: string;
  rejection_offered_value?: number;
  rejection_bank?: string;
  rejection_description?: string;
  banco_operacao?: string;
  valor_operacao?: number;
  history?: any;
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
}

interface LeadRequest {
  convenio: string;
  count: number;
  ddds: string[];
}

// Modern status configuration with vibrant colors
const STATUS_CONFIG = {
  new_lead: { 
    label: "Novo Lead", 
    color: "from-blue-500 to-blue-600", 
    textColor: "text-blue-700", 
    bgColor: "bg-gradient-to-r from-blue-50 to-blue-100",
    borderColor: "border-blue-200",
    icon: Sparkles,
    dotColor: "bg-blue-500"
  },
  em_andamento: { 
    label: "Em Andamento", 
    color: "from-amber-500 to-orange-500", 
    textColor: "text-amber-700", 
    bgColor: "bg-gradient-to-r from-amber-50 to-orange-100",
    borderColor: "border-amber-200",
    icon: TrendingUp,
    dotColor: "bg-amber-500"
  },
  aguardando_retorno: { 
    label: "Aguardando Retorno", 
    color: "from-purple-500 to-indigo-500", 
    textColor: "text-purple-700", 
    bgColor: "bg-gradient-to-r from-purple-50 to-indigo-100",
    borderColor: "border-purple-200",
    icon: Clock,
    dotColor: "bg-purple-500"
  },
  cliente_fechado: { 
    label: "Cliente Fechado", 
    color: "from-emerald-500 to-green-500", 
    textColor: "text-emerald-700", 
    bgColor: "bg-gradient-to-r from-emerald-50 to-green-100",
    borderColor: "border-emerald-200",
    icon: CheckCircle,
    dotColor: "bg-emerald-500"
  },
  recusou_oferta: { 
    label: "Recusado", 
    color: "from-rose-500 to-red-500", 
    textColor: "text-rose-700", 
    bgColor: "bg-gradient-to-r from-rose-50 to-red-100",
    borderColor: "border-rose-200",
    icon: XCircle,
    dotColor: "bg-rose-500"
  },
  contato_futuro: { 
    label: "Contato Futuro", 
    color: "from-slate-500 to-gray-500", 
    textColor: "text-slate-700", 
    bgColor: "bg-gradient-to-r from-slate-50 to-gray-100",
    borderColor: "border-slate-200",
    icon: Calendar,
    dotColor: "bg-slate-500"
  },
  agendamento: { 
    label: "Agendamento", 
    color: "from-indigo-500 to-violet-500", 
    textColor: "text-indigo-700", 
    bgColor: "bg-gradient-to-r from-indigo-50 to-violet-100",
    borderColor: "border-indigo-200",
    icon: Calendar,
    dotColor: "bg-indigo-500"
  },
  nao_e_cliente: {
    label: "Não é o cliente",
    color: "from-gray-500 to-zinc-500",
    textColor: "text-gray-700",
    bgColor: "bg-gradient-to-r from-gray-50 to-zinc-100",
    borderColor: "border-gray-200",
    icon: UserX,
    dotColor: "bg-gray-500"
  },
  sem_interesse: {
    label: "Sem Interesse",
    color: "from-yellow-500 to-amber-600",
    textColor: "text-yellow-800",
    bgColor: "bg-gradient-to-r from-yellow-50 to-amber-100",
    borderColor: "border-yellow-200",
    icon: Ban,
    dotColor: "bg-yellow-500"
  },
  sem_retorno: {
    label: "Sem retorno",
    color: "from-zinc-500 to-neutral-600",
    textColor: "text-zinc-700",
    bgColor: "bg-gradient-to-r from-zinc-50 to-neutral-100",
    borderColor: "border-zinc-200",
    icon: PhoneOff,
    dotColor: "bg-zinc-500"
  }
};

const REJECTION_REASONS = [
  { id: "valor_baixo", label: "Cliente achou o valor baixo", requiresValue: true, requiresBank: true },
  { id: "sem_interesse", label: "Não teve interesse", requiresValue: false, requiresBank: false },
  { id: "contratou_outro", label: "Já contratou com outro banco", requiresValue: false, requiresBank: false },
  { id: "outros", label: "Outros", requiresValue: false, requiresBank: false }
];

const BANKS_LIST = [
  "BRADESCO", "BMG", "C6", "DAYCOVAL", "FACTA", "ITAU", "MASTER", 
  "MERCANTIL", "OLE", "PAN", "PARANÁ", "SAFRA", "SANTANDER"
];

export function LeadsManagement() {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showImportBase, setShowImportBase] = useState(false);
  const [showDistributedManager, setShowDistributedManager] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedLeadsForAssign, setSelectedLeadsForAssign] = useState<string[]>([]);
  const [targetUserId, setTargetUserId] = useState("");
  const [leadRequest, setLeadRequest] = useState<LeadRequest>({
    convenio: "",
    count: 10,
    ddds: []
  });

  // Modal states
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [showFutureContactModal, setShowFutureContactModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Rejection form
  const [rejectionForm, setRejectionForm] = useState({
    reason: "",
    offeredValue: "",
    bank: "",
    description: ""
  });

  // Future contact form
  const [futureContactDate, setFutureContactDate] = useState("");
  
  // Schedule form (agendamento)
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  
  // Dynamic convenios from database
  const [availableConvenios, setAvailableConvenios] = useState<{convenio: string, available_count: number}[]>([]);
  const [loadingConvenios, setLoadingConvenios] = useState(false);
  const [totalAvailableLeads, setTotalAvailableLeads] = useState(0);
  
  // Available DDDs for filtering
  const [availableDdds, setAvailableDdds] = useState<{ddd: string, available_count: number}[]>([]);
  const [loadingDdds, setLoadingDdds] = useState(false);

  // Solicitar Digitação states
  const [showDigitacaoModal, setShowDigitacaoModal] = useState(false);
  const [digitacaoForm, setDigitacaoForm] = useState({
    banco: "",
    parcela: "",
    troco: "",
    saldo_devedor: "",
    tipo_operacao: "Novo empréstimo",
    observacao: ""
  });
  const [televendasBanks, setTelevendasBanks] = useState<{id: string, name: string}[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [submittingDigitacao, setSubmittingDigitacao] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchUserCredits();
      fetchAvailableConvenios();
      fetchAvailableDdds();
      fetchTelevendasBanks();
      processExpiredFutureContacts();
      if (isAdmin) {
        fetchUsers();
      }
    }
  }, [user, isAdmin]);

  const fetchTelevendasBanks = async () => {
    try {
      setLoadingBanks(true);
      const { data, error } = await supabase
        .from('televendas_banks')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setTelevendasBanks(data || []);
    } catch (error) {
      console.error('Error fetching televendas banks:', error);
      // Fallback to static list if table doesn't exist
      setTelevendasBanks(BANKS_LIST.map((name, i) => ({ id: String(i), name })));
    } finally {
      setLoadingBanks(false);
    }
  };

  const fetchAvailableConvenios = async () => {
    try {
      setLoadingConvenios(true);
      const { data, error } = await supabase.rpc('get_available_convenios');
      
      if (error) throw error;
      
      const convenios = data || [];
      setAvailableConvenios(convenios);
      setTotalAvailableLeads(convenios.reduce((sum: number, c: any) => sum + Number(c.available_count), 0));
    } catch (error) {
      console.error('Error fetching available convenios:', error);
      setAvailableConvenios([]);
      setTotalAvailableLeads(0);
    } finally {
      setLoadingConvenios(false);
    }
  };

  const fetchAvailableDdds = async () => {
    try {
      setLoadingDdds(true);
      const { data, error } = await supabase.rpc('get_available_ddds');
      
      if (error) throw error;
      setAvailableDdds(data || []);
    } catch (error) {
      console.error('Error fetching available DDDs:', error);
      setAvailableDdds([]);
    } finally {
      setLoadingDdds(false);
    }
  };

  const toggleDddSelection = (ddd: string) => {
    setLeadRequest(prev => {
      const isSelected = prev.ddds.includes(ddd);
      if (isSelected) {
        return { ...prev, ddds: prev.ddds.filter(d => d !== ddd) };
      } else {
        return { ...prev, ddds: [...prev.ddds, ddd] };
      }
    });
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLeads = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      // For non-admin users, only fetch their own leads
      if (!isAdmin) {
        query = query.or(`assigned_to.eq.${user?.id},created_by.eq.${user?.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processExpiredFutureContacts = async () => {
    try {
      const { data, error } = await supabase.rpc('process_expired_future_contacts');
      if (error) {
        console.error('Error processing expired contacts:', error);
      } else if (data && data > 0) {
        toast({
          title: "Leads Atualizados",
          description: `${data} lead(s) retornaram automaticamente como Novo Lead.`,
        });
        fetchLeads();
      }
    } catch (error) {
      console.error('Error processing expired contacts:', error);
    }
  };

  const fetchUserCredits = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_user_credits', { target_user_id: user?.id });

      if (error) throw error;
      setUserCredits(data || 0);
    } catch (error) {
      console.error('Error fetching user credits:', error);
      setUserCredits(0);
    }
  };

  const requestLeads = async () => {
    if (!user) return;

    // Check credits first
    if (userCredits <= 0) {
      toast({
        title: "Sem créditos",
        description: "Seus créditos de leads acabaram. Solicite liberação ao administrador.",
        variant: "destructive",
      });
      return;
    }

    if (leadRequest.count > userCredits) {
      toast({
        title: "Créditos insuficientes",
        description: `Você só possui ${userCredits} créditos disponíveis.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use the new credits-based function with DDD filter
      const { data, error } = await supabase
        .rpc('request_leads_with_credits', {
          convenio_filter: leadRequest.convenio || null,
          banco_filter: null,
          produto_filter: null,
          leads_requested: leadRequest.count,
          ddd_filter: leadRequest.ddds.length > 0 ? leadRequest.ddds : null
        });

      if (error) throw error;

      if (data && data.length > 0) {
        const leadsToInsert = data.map((lead: any) => ({
          name: lead.name,
          cpf: lead.cpf,
          phone: lead.phone,
          phone2: lead.phone2 || null,
          convenio: lead.convenio,
          status: 'new_lead',
          created_by: user.id,
          assigned_to: user.id,
          origem_lead: 'Sistema - Solicitação',
          banco_operacao: lead.banco,
          valor_operacao: null,
          history: JSON.stringify([{
            action: 'created',
            timestamp: new Date().toISOString(),
            user_id: user.id,
            note: 'Lead solicitado do sistema'
          }])
        }));

        const { error: insertError } = await supabase
          .from('leads')
          .insert(leadsToInsert);

        if (insertError) throw insertError;

        toast({
          title: "Leads solicitados!",
          description: `${data.length} leads foram adicionados à sua lista. Créditos restantes: ${userCredits - data.length}`,
        });

        setShowRequestDialog(false);
        fetchLeads();
        fetchUserCredits();
        setLeadRequest({ convenio: "", count: 10, ddds: [] });
      } else {
        toast({
          title: "Nenhum lead encontrado",
          description: "Não há leads disponíveis com esses filtros.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error requesting leads:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao solicitar leads",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canEditLead = (lead: Lead) => {
    if (isAdmin) return true;
    return lead.assigned_to === user?.id || lead.created_by === user?.id;
  };

  const handleStatusChange = async (lead: Lead, newStatus: string) => {
    if (!canEditLead(lead)) {
      toast({
        title: "Sem permissão",
        description: "Você só pode alterar leads que você trabalha.",
        variant: "destructive",
      });
      return;
    }

    setSelectedLead(lead);

    if (newStatus === 'recusou_oferta') {
      setRejectionForm({ reason: "", offeredValue: "", bank: "", description: "" });
      setShowRejectionModal(true);
    } else if (newStatus === 'contato_futuro') {
      const defaultDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
      setFutureContactDate(defaultDate);
      setShowFutureContactModal(true);
    } else if (newStatus === 'agendamento') {
      setScheduleDate(format(new Date(), 'yyyy-MM-dd'));
      setScheduleTime("10:00");
      setShowScheduleModal(true);
    } else if (newStatus === 'cliente_fechado') {
      await handleClienteFechado(lead);
    } else {
      await updateLeadStatus(lead.id, newStatus);
    }
  };

  const handleClienteFechado = async (lead: Lead) => {
    try {
      // Get user's company first
      const { data: userCompanies, error: companyError } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .limit(1);

      if (companyError) {
        console.error('Error fetching user company:', companyError);
      }

      const companyId = userCompanies?.[0]?.company_id || null;

      // Create client in "Meus Clientes" (propostas table)
      const { error: propostaError } = await supabase
        .from('propostas')
        .insert({
          "Nome do cliente": lead.name,
          cpf: lead.cpf,
          telefone: lead.phone,
          convenio: lead.convenio,
          pipeline_stage: "contato_iniciado",
          client_status: "cliente_intencionado",
          origem_lead: "leads_premium",
          created_by_id: user?.id,
          assigned_to: user?.id,
          company_id: companyId,
          notes: `Convertido de Leads Premium em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`
        });

      if (propostaError) {
        console.error('Error creating proposta:', propostaError);
        throw propostaError;
      }

      // Update lead status only after successful proposta creation
      await updateLeadStatus(lead.id, 'cliente_fechado');

      toast({
        title: "Cliente Fechado!",
        description: "Lead convertido e adicionado em Meus Clientes como 'Cliente Intencionado'.",
      });

      fetchLeads();
    } catch (error: any) {
      console.error('Error handling cliente fechado:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao converter lead em cliente",
        variant: "destructive",
      });
    }
  };

  const handleRejectionSubmit = async () => {
    if (!selectedLead) return;

    const selectedReason = REJECTION_REASONS.find(r => r.id === rejectionForm.reason);
    
    if (!rejectionForm.reason) {
      toast({
        title: "Erro",
        description: "Selecione o motivo da recusa",
        variant: "destructive",
      });
      return;
    }

    if (selectedReason?.requiresValue && !rejectionForm.offeredValue) {
      toast({
        title: "Erro",
        description: "Informe o valor ofertado",
        variant: "destructive",
      });
      return;
    }

    if (selectedReason?.requiresBank && !rejectionForm.bank) {
      toast({
        title: "Erro",
        description: "Selecione o banco da simulação",
        variant: "destructive",
      });
      return;
    }

    if (!rejectionForm.description.trim()) {
      toast({
        title: "Erro",
        description: "Informe uma descrição do motivo",
        variant: "destructive",
      });
      return;
    }

    try {
      const offeredValue = rejectionForm.offeredValue 
        ? parseFloat(rejectionForm.offeredValue.replace(/\D/g, '')) / 100 
        : null;

      const historyEntry = {
        action: 'status_change',
        from_status: selectedLead.status,
        to_status: 'recusou_oferta',
        timestamp: new Date().toISOString(),
        user_id: user?.id,
        note: `Recusado: ${selectedReason?.label}`,
        rejection_data: {
          reason: rejectionForm.reason,
          offered_value: offeredValue,
          bank: rejectionForm.bank,
          description: rejectionForm.description
        }
      };

      const currentHistory = selectedLead.history || [];
      
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: 'recusou_oferta',
          rejection_reason: rejectionForm.reason,
          rejection_offered_value: offeredValue,
          rejection_bank: rejectionForm.bank,
          rejection_description: rejectionForm.description,
          history: [...currentHistory, historyEntry]
        })
        .eq('id', selectedLead.id);

      if (error) throw error;

      // Add to blacklist
      await supabase.rpc('add_lead_to_blacklist', {
        lead_cpf: selectedLead.cpf,
        blacklist_reason: `recusou_oferta: ${selectedReason?.label}`
      });

      toast({
        title: "Lead Recusado",
        description: "Status atualizado e motivo registrado.",
      });

      setShowRejectionModal(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (error) {
      console.error('Error updating rejection:', error);
      toast({
        title: "Erro",
        description: "Erro ao registrar recusa",
        variant: "destructive",
      });
    }
  };

  const handleFutureContactSubmit = async () => {
    if (!selectedLead || !futureContactDate) {
      toast({
        title: "Erro",
        description: "Selecione a data do contato futuro",
        variant: "destructive",
      });
      return;
    }

    try {
      const historyEntry = {
        action: 'status_change',
        from_status: selectedLead.status,
        to_status: 'contato_futuro',
        timestamp: new Date().toISOString(),
        user_id: user?.id,
        note: `Contato agendado para ${format(new Date(futureContactDate), 'dd/MM/yyyy', { locale: ptBR })}`,
        future_contact_date: futureContactDate
      };

      const currentHistory = selectedLead.history || [];

      // Update lead
      const { error } = await supabase
        .from('leads')
        .update({ 
          status: 'contato_futuro',
          future_contact_date: futureContactDate,
          notes: `Contato futuro agendado para ${format(new Date(futureContactDate), 'dd/MM/yyyy', { locale: ptBR })}`,
          history: [...currentHistory, historyEntry]
        })
        .eq('id', selectedLead.id);

      if (error) throw error;

      // Create alert
      await supabase.from('lead_alerts').insert({
        lead_id: selectedLead.id,
        user_id: user?.id,
        alert_type: 'future_contact',
        scheduled_date: futureContactDate,
        notes: 'Alerta automático de contato futuro - 30 dias'
      });

      toast({
        title: "Contato Futuro Agendado",
        description: `Lead retornará automaticamente como Novo Lead em ${format(new Date(futureContactDate), 'dd/MM/yyyy', { locale: ptBR })}.`,
      });

      setShowFutureContactModal(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (error) {
      console.error('Error setting future contact:', error);
      toast({
        title: "Erro",
        description: "Erro ao agendar contato futuro",
        variant: "destructive",
      });
    }
  };

  const handleScheduleSubmit = async () => {
    if (!selectedLead || !scheduleDate || !scheduleTime) {
      toast({
        title: "Erro",
        description: "Preencha a data e horário do agendamento",
        variant: "destructive",
      });
      return;
    }

    try {
      const scheduledDateTime = `${scheduleDate}T${scheduleTime}:00`;
      const historyEntry = {
        action: 'status_change',
        from_status: selectedLead.status,
        to_status: 'agendamento',
        timestamp: new Date().toISOString(),
        user_id: user?.id,
        note: `Agendamento marcado para ${format(new Date(scheduledDateTime), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
        scheduled_date: scheduleDate,
        scheduled_time: scheduleTime
      };

      const currentHistory = selectedLead.history || [];

      const { error } = await supabase
        .from('leads')
        .update({ 
          status: 'agendamento',
          future_contact_date: scheduleDate,
          future_contact_time: scheduleTime,
          notes: `Agendamento: ${format(new Date(scheduledDateTime), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
          history: [...currentHistory, historyEntry],
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLead.id);

      if (error) throw error;

      toast({
        title: "Agendamento Confirmado",
        description: `Agendamento marcado para ${format(new Date(scheduledDateTime), 'dd/MM/yyyy HH:mm', { locale: ptBR })}.`,
      });

      setShowScheduleModal(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (error) {
      console.error('Error setting schedule:', error);
      toast({
        title: "Erro",
        description: "Erro ao agendar",
        variant: "destructive",
      });
    }
  };

  const handleAssignLeads = async () => {
    if (!targetUserId || selectedLeadsForAssign.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione um usuário e pelo menos um lead",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          assigned_to: targetUserId,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedLeadsForAssign);

      if (error) throw error;

      toast({
        title: "Leads Atribuídos",
        description: `${selectedLeadsForAssign.length} lead(s) atribuídos com sucesso.`,
      });

      setShowAssignModal(false);
      setSelectedLeadsForAssign([]);
      setTargetUserId("");
      fetchLeads();
    } catch (error) {
      console.error('Error assigning leads:', error);
      toast({
        title: "Erro",
        description: "Erro ao atribuir leads",
        variant: "destructive",
      });
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadsForAssign(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const getUserName = (userId: string | undefined) => {
    if (!userId) return 'Não atribuído';
    const foundUser = users.find(u => u.id === userId);
    return foundUser?.name || foundUser?.email || 'Usuário';
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const lead = leads.find(l => l.id === leadId);
      if (!lead) return;

      const historyEntry = {
        action: 'status_change',
        from_status: lead.status,
        to_status: newStatus,
        timestamp: new Date().toISOString(),
        user_id: user?.id
      };

      const currentHistory = lead.history || [];

      const { error } = await supabase
        .from('leads')
        .update({ 
          status: newStatus,
          history: [...currentHistory, historyEntry],
          updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, status: newStatus, updated_at: new Date().toISOString() } : l
      ));

      const statusLabel = STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus;
      toast({
        title: "Status atualizado!",
        description: `Lead atualizado para: ${statusLabel}`,
      });
    } catch (error) {
      console.error('Error updating lead status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do lead",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const formatted = (parseInt(numericValue || '0') / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
    return formatted;
  };

  const handleOpenDigitacaoModal = (lead: Lead) => {
    setSelectedLead(lead);
    setDigitacaoForm({
      banco: "",
      parcela: "",
      troco: "",
      saldo_devedor: "",
      tipo_operacao: "Novo empréstimo",
      observacao: ""
    });
    setShowDigitacaoModal(true);
  };

  const handleDigitacaoSubmit = async () => {
    if (!selectedLead || !user) return;
    
    if (!digitacaoForm.banco || !digitacaoForm.parcela) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione o banco e informe o valor da parcela.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmittingDigitacao(true);

      // Parse currency values
      const parseCurrencyValue = (val: string): number | null => {
        if (!val) return null;
        const numbers = val.replace(/\D/g, "");
        if (!numbers) return null;
        return parseInt(numbers) / 100;
      };

      const parcelaValue = parseCurrencyValue(digitacaoForm.parcela) || 0;
      const trocoValue = parseCurrencyValue(digitacaoForm.troco);
      const saldoDevedorValue = parseCurrencyValue(digitacaoForm.saldo_devedor);

      // Get user's company_id
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      // Insert into televendas with status 'solicitado_digitacao'
      const { error: insertError } = await (supabase as any).from("televendas").insert({
        user_id: user.id,
        company_id: userCompany?.company_id || null,
        nome: selectedLead.name,
        cpf: selectedLead.cpf.replace(/\D/g, ""),
        data_venda: new Date().toISOString().split('T')[0],
        telefone: selectedLead.phone.replace(/\D/g, ""),
        banco: digitacaoForm.banco,
        parcela: parcelaValue,
        troco: trocoValue,
        saldo_devedor: saldoDevedorValue,
        tipo_operacao: digitacaoForm.tipo_operacao,
        observacao: digitacaoForm.observacao || `Lead ID: ${selectedLead.id}`,
        status: 'solicitado_digitacao',
      });

      if (insertError) throw insertError;

      // Update lead status to indicate digitação was requested
      await updateLeadStatus(selectedLead.id, 'cliente_fechado');

      toast({
        title: "Digitação solicitada!",
        description: "O cliente foi enviado para a Gestão Televendas com sucesso.",
      });

      setShowDigitacaoModal(false);
      setSelectedLead(null);
      fetchLeads();
    } catch (error) {
      console.error('Error submitting digitação:', error);
      toast({
        title: "Erro",
        description: "Erro ao solicitar digitação. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmittingDigitacao(false);
    }
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = (lead.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (lead.cpf || "").includes(searchTerm) ||
                           (lead.phone || "").includes(searchTerm) ||
                           (lead.convenio || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      
      const matchesUser = userFilter === "all" || lead.assigned_to === userFilter;
      
      return matchesSearch && matchesStatus && matchesUser;
    });
  }, [leads, searchTerm, statusFilter, userFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === "new_lead").length,
    inProgress: leads.filter(l => ["em_andamento", "aguardando_retorno"].includes(l.status)).length,
    completed: leads.filter(l => l.status === "cliente_fechado").length,
    rejected: leads.filter(l => l.status === "recusou_oferta").length,
    rework: leads.filter(l => l.is_rework).length,
    credits: userCredits
  }), [leads, userCredits]);

  if (showImportBase) {
    return (
      <div className="p-4 md:p-6 pb-20 md:pb-6">
        <ImportBase onBack={() => setShowImportBase(false)} />
      </div>
    );
  }

  if (showDistributedManager) {
    return (
      <div className="p-4 md:p-6 pb-20 md:pb-6">
        <DistributedLeadsManager onBack={() => setShowDistributedManager(false)} />
      </div>
    );
  }

  return (
    <AnimatedContainer animation="slide-up" className="p-4 md:p-8 space-y-8 pb-24 md:pb-8 bg-gradient-to-br from-background via-background to-muted/20 min-h-screen">
      {/* Header Simplificado */}
      <div className="flex flex-col space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent tracking-tight">
              Leads Premium
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-medium">
              🚀 Trabalhe seus leads e feche negócios!
            </p>
          </div>
          
          <div className="flex gap-3 flex-wrap">
            <Button 
              variant="outline" 
              size="lg"
              onClick={fetchLeads}
              disabled={isLoading}
              className="hover:bg-primary/10 text-base font-semibold h-12"
            >
              <RefreshCcw className={`h-5 w-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            {isAdmin && (
              <>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="flex items-center gap-2 hover:bg-primary/10 text-base font-semibold h-12"
                  onClick={() => setShowImportBase(true)}
                >
                  <Upload className="h-5 w-5" />
                  Importar
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg"
                  className="flex items-center gap-2 hover:bg-orange-500/10 text-orange-600 border-orange-200 text-base font-semibold h-12"
                  onClick={() => setShowDistributedManager(true)}
                >
                  <Settings className="h-5 w-5" />
                  Gerenciar Distribuídos
                </Button>
              </>
            )}
            
            <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
              <DialogTrigger asChild>
                <Button 
                  size="lg" 
                  className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/30 text-lg font-bold h-12 px-6"
                >
                  <Plus className="h-5 w-5" />
                  Pedir Leads
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">🎯 Solicitar Leads</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className={`p-4 rounded-xl border-2 ${userCredits === 0 ? 'bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/30' : 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20'}`}>
                    <p className="text-lg text-muted-foreground">
                      Créditos disponíveis: <span className={`font-black text-2xl ${userCredits === 0 ? 'text-red-500' : 'text-primary'}`}>{userCredits}</span>
                    </p>
                    {userCredits === 0 && (
                      <p className="text-sm text-red-500 mt-2 font-medium">
                        ⚠️ Seus créditos de leads acabaram. Solicite liberação ao administrador.
                      </p>
                    )}
                  </div>
                  
                  {/* Disponibilidade de Leads */}
                  <div className={`p-4 rounded-xl border-2 ${totalAvailableLeads === 0 ? 'bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/30' : 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20'}`}>
                    <p className="text-lg text-muted-foreground">
                      Leads disponíveis no sistema: <span className={`font-black text-2xl ${totalAvailableLeads === 0 ? 'text-amber-500' : 'text-emerald-600'}`}>{totalAvailableLeads}</span>
                    </p>
                    {totalAvailableLeads === 0 && (
                      <p className="text-sm text-amber-600 mt-2 font-medium">
                        ⚠️ Não há leads disponíveis no momento. Aguarde novas importações.
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-base font-semibold">Convênio</label>
                    {loadingConvenios ? (
                      <div className="h-12 flex items-center justify-center text-muted-foreground">
                        Carregando convênios...
                      </div>
                    ) : availableConvenios.length === 0 ? (
                      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                        <p className="text-amber-700 dark:text-amber-400 font-medium">
                          Nenhum convênio disponível no momento
                        </p>
                      </div>
                    ) : (
                      <Select value={leadRequest.convenio} onValueChange={(value) => 
                        setLeadRequest(prev => ({ ...prev, convenio: value }))
                      }>
                        <SelectTrigger className="border-2 focus:border-primary h-12 text-base">
                          <SelectValue placeholder="Selecione o convênio" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableConvenios.map(option => (
                            <SelectItem key={option.convenio} value={option.convenio} className="text-base py-3">
                              {option.convenio} ({option.available_count} disponíveis)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Filtro por DDD */}
                  <div className="space-y-3">
                    <label className="text-base font-semibold flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Filtrar por DDD (Região)
                    </label>
                    {loadingDdds ? (
                      <div className="h-12 flex items-center justify-center text-muted-foreground">
                        Carregando DDDs...
                      </div>
                    ) : availableDdds.length === 0 ? (
                      <div className="p-3 rounded-xl bg-muted/30 border border-muted text-center">
                        <p className="text-muted-foreground text-sm">
                          Nenhum DDD disponível
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 rounded-lg border bg-background">
                          {availableDdds.map(({ ddd, available_count }) => (
                            <Button
                              key={ddd}
                              type="button"
                              size="sm"
                              variant={leadRequest.ddds.includes(ddd) ? "default" : "outline"}
                              className={`h-8 px-3 text-sm font-medium ${
                                leadRequest.ddds.includes(ddd) 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'hover:bg-primary/10'
                              }`}
                              onClick={() => toggleDddSelection(ddd)}
                            >
                              {ddd} ({available_count})
                            </Button>
                          ))}
                        </div>
                        {leadRequest.ddds.length > 0 && (
                          <p className="text-sm text-muted-foreground">
                            DDDs selecionados: <strong>{leadRequest.ddds.join(', ')}</strong>
                          </p>
                        )}
                        {leadRequest.ddds.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            Nenhum DDD selecionado = todos os DDDs disponíveis
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="text-base font-semibold">Quantidade</label>
                    <Input
                      type="number"
                      min="1"
                      max="80"
                      value={leadRequest.count}
                      onChange={(e) => setLeadRequest(prev => ({ 
                        ...prev, 
                        count: Math.min(Number(e.target.value), 80, userCredits) 
                      }))}
                      placeholder="Número de leads (máx. 80)"
                      className="border-2 focus:border-primary h-12 text-lg font-semibold"
                    />
                  </div>

                  <Button 
                    onClick={requestLeads} 
                    disabled={isLoading || userCredits === 0 || totalAvailableLeads === 0 || availableConvenios.length === 0}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 h-14 text-lg font-bold"
                  >
                    {isLoading ? "Solicitando..." : userCredits === 0 ? "❌ Sem Créditos" : totalAvailableLeads === 0 ? "⚠️ Sem Leads Disponíveis" : "🚀 Pedir Leads Agora!"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Cards de Status Grandes e Vibrantes */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-slate-500 to-slate-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Target className="h-7 w-7 text-white" />
              </div>
              <p className="text-4xl font-black text-foreground">{stats.total}</p>
              <p className="text-sm font-semibold text-muted-foreground mt-1">TOTAL</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-200 dark:border-blue-800 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <p className="text-4xl font-black text-blue-700 dark:text-blue-300">{stats.new}</p>
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">NOVOS</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 border-2 border-amber-200 dark:border-amber-800 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <p className="text-4xl font-black text-amber-700 dark:text-amber-300">{stats.inProgress}</p>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1">TRABALHANDO</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 border-2 border-emerald-200 dark:border-emerald-800 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <CheckCircle className="h-7 w-7 text-white" />
              </div>
              <p className="text-4xl font-black text-emerald-700 dark:text-emerald-300">{stats.completed}</p>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">FECHADOS 🎉</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-950 dark:to-red-900 border-2 border-rose-200 dark:border-rose-800 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-rose-500 to-red-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <XCircle className="h-7 w-7 text-white" />
              </div>
              <p className="text-4xl font-black text-rose-700 dark:text-rose-300">{stats.rejected}</p>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-1">RECUSADOS</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950 dark:to-indigo-900 border-2 border-purple-200 dark:border-purple-800 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
                <Users className="h-7 w-7 text-white" />
              </div>
              <p className={`text-4xl font-black ${stats.credits === 0 ? 'text-red-500' : 'text-purple-700 dark:text-purple-300'}`}>{stats.credits}</p>
              <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 mt-1">CRÉDITOS</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros Simplificados */}
      <Card className="border-2 border-muted/50 shadow-lg">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="🔍 Buscar nome, CPF, telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 border-2 focus:border-primary transition-colors h-14 text-lg font-medium"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-60 border-2 focus:border-primary h-14 text-base font-semibold">
                    <Filter className="h-5 w-5 mr-2" />
                    <SelectValue placeholder="Filtrar Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-base py-3">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="w-3 h-3 rounded-full bg-slate-400"></span>
                        Todos os Status
                      </span>
                    </SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-base py-3">
                        <span className="flex items-center gap-2 font-semibold">
                          <span className={`w-3 h-3 rounded-full ${config.dotColor}`}></span>
                          {config.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isAdmin && (
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-full md:w-60 border-2 focus:border-primary h-14 text-base font-semibold">
                      <User className="h-5 w-5 mr-2" />
                      <SelectValue placeholder="Filtrar Usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-base py-3">
                        <span className="flex items-center gap-2 font-semibold">
                          <Users className="h-4 w-4" />
                          Todos os Usuários
                        </span>
                      </SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id} className="text-base py-3">
                          <span className="flex items-center gap-2 font-semibold">
                            <User className="h-4 w-4" />
                            {u.name || u.email || 'Usuário'}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Ações para Admin - Atribuir Leads */}
            {isAdmin && (
              <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedLeadsForAssign.length > 0 && selectedLeadsForAssign.length === filteredLeads.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedLeadsForAssign(filteredLeads.map(l => l.id));
                      } else {
                        setSelectedLeadsForAssign([]);
                      }
                    }}
                    className="h-5 w-5 rounded border-2 border-indigo-400"
                  />
                  <span className="text-sm font-medium text-muted-foreground">
                    {selectedLeadsForAssign.length > 0 
                      ? `${selectedLeadsForAssign.length} lead(s) selecionado(s)`
                      : 'Selecionar leads para atribuir'
                    }
                  </span>
                </div>
                
                <Button
                  variant="outline"
                  size="lg"
                  disabled={selectedLeadsForAssign.length === 0}
                  onClick={() => setShowAssignModal(true)}
                  className="border-indigo-300 hover:bg-indigo-100 hover:text-indigo-700 font-semibold"
                >
                  <UserCheck className="h-5 w-5 mr-2" />
                  Atribuir Leads
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Leads em Cards (mais visual e intuitivo) */}
      <div className="grid gap-4">
        {filteredLeads.map((lead) => {
          const status = STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG];
          const StatusIcon = status?.icon || AlertCircle;
          const isSelected = selectedLeadsForAssign.includes(lead.id);
          
          return (
            <Card 
              key={lead.id} 
              className={`border-2 ${isSelected ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20' : status?.borderColor || 'border-muted'} hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
            >
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                  {/* Indicador de Status Lateral */}
                  <div className={`w-full md:w-2 h-2 md:h-auto bg-gradient-to-r md:bg-gradient-to-b ${status?.color || 'from-gray-400 to-gray-500'}`} />
                  
                  {/* Conteúdo Principal */}
                  <div className="flex-1 p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Checkbox para seleção (admin) */}
                      {isAdmin && (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleLeadSelection(lead.id)}
                            className="h-5 w-5 rounded border-2 border-indigo-400 mr-4"
                          />
                        </div>
                      )}
                      
                      {/* Info do Lead */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-xl md:text-2xl font-bold text-foreground">
                            {lead.name}
                          </h3>
                          {lead.is_rework && (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-300 font-semibold">
                              <RefreshCcw className="h-3 w-3 mr-1" />
                              Re-trabalho
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-base text-muted-foreground">
                          <span className="font-mono font-semibold">{lead.cpf}</span>
                          <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                            <span className="flex items-center gap-1 font-semibold">
                              <Phone className="h-4 w-4" />
                              📱1: {lead.phone}
                            </span>
                            {lead.phone2 && (
                              <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                📱2: {lead.phone2}
                              </span>
                            )}
                          </div>
                          <Badge variant="outline" className="font-bold text-sm px-3 py-1">
                            {lead.convenio}
                          </Badge>
                          {isAdmin && lead.assigned_to && (
                            <Badge variant="secondary" className="font-semibold text-sm px-3 py-1">
                              <User className="h-3 w-3 mr-1" />
                              {getUserName(lead.assigned_to)}
                            </Badge>
                          )}
                          {lead.updated_at && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <History className="h-3 w-3" />
                              {format(new Date(lead.updated_at), 'dd/MM HH:mm', { locale: ptBR })}
                            </span>
                          )}
                          {lead.status === 'agendamento' && lead.future_contact_date && (
                            <Badge className="bg-indigo-100 text-indigo-700 border-indigo-300 font-semibold">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(lead.future_contact_date + (lead.future_contact_time ? `T${lead.future_contact_time}` : '')), 
                                lead.future_contact_time ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy', 
                                { locale: ptBR })}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${status?.bgColor} ${status?.textColor} ${status?.borderColor} border-2`}>
                        <StatusIcon className="h-4 w-4" />
                        {status?.label}
                      </div>

                      {/* Ações Grandes e Claras */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Botão Ligar Tel 1 */}
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => window.open(`tel:${lead.phone}`, '_self')}
                          className="h-10 md:h-12 px-3 md:px-4 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 font-bold text-sm md:text-base"
                          title="Ligar Telefone 1"
                        >
                          <Phone className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
                          <span className="hidden md:inline">Ligar 1</span>
                        </Button>
                        
                        {/* Botão WhatsApp Tel 1 */}
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => window.open(`https://wa.me/55${lead.phone.replace(/\D/g, '')}`, '_blank')}
                          className="h-10 md:h-12 px-3 md:px-4 bg-green-50 hover:bg-green-100 text-green-700 hover:text-green-800 border-green-300 hover:border-green-400 font-bold text-sm md:text-base"
                          title="WhatsApp Telefone 1"
                        >
                          <MessageCircle className="h-4 w-4 md:h-5 md:w-5 md:mr-1" />
                          <span className="hidden md:inline">Zap 1</span>
                        </Button>

                        {/* Botão WhatsApp Tel 2 - apenas se tiver telefone 2 */}
                        {lead.phone2 && (
                          <Button
                            size="lg"
                            variant="outline"
                            onClick={() => window.open(`https://wa.me/55${lead.phone2!.replace(/\D/g, '')}`, '_blank')}
                            className="h-10 md:h-12 px-3 md:px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border-emerald-300 hover:border-emerald-400 font-bold text-sm md:text-base"
                            title="WhatsApp Telefone 2"
                          >
                            <MessageCircle className="h-4 w-4 md:h-5 md:w-5 md:mr-1" />
                            <span className="hidden md:inline">Zap 2</span>
                          </Button>
                        )}

                        {/* Botão Solicitar Digitação - Destaque para mobile */}
                        <Button
                          size="lg"
                          onClick={() => handleOpenDigitacaoModal(lead)}
                          className="h-10 md:h-12 px-3 md:px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-sm md:text-base shadow-lg"
                        >
                          <FileEdit className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
                          <span className="hidden sm:inline">Solicitar Digitação</span>
                          <span className="sm:hidden">Digitar</span>
                        </Button>

                        <Select 
                          value={lead.status} 
                          onValueChange={(value) => handleStatusChange(lead, value)}
                          disabled={!canEditLead(lead)}
                        >
                          <SelectTrigger className="w-32 md:w-44 h-10 md:h-12 text-xs md:text-sm font-bold border-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key} className="text-sm py-3">
                                <span className="flex items-center gap-2 font-semibold">
                                  <span className={`w-3 h-3 rounded-full ${config.dotColor}`}></span>
                                  {config.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredLeads.length === 0 && (
          <Card className="border-2 border-dashed border-muted">
            <CardContent className="p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6">
                <Target className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">
                Nenhum lead encontrado
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                Solicite novos leads para começar a trabalhar!
              </p>
              <Button 
                size="lg"
                onClick={() => setShowRequestDialog(true)}
                className="bg-gradient-to-r from-primary to-primary/80 h-14 text-lg font-bold px-8"
              >
                🚀 Solicitar Leads
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Rejection Modal */}
      <Dialog open={showRejectionModal} onOpenChange={setShowRejectionModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <XCircle className="h-5 w-5 text-rose-500" />
              Registrar Recusa
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800">
              <p className="text-sm text-rose-700 dark:text-rose-300">
                <strong>Lead:</strong> {selectedLead?.name}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo da Recusa *</label>
              <Select 
                value={rejectionForm.reason} 
                onValueChange={(value) => setRejectionForm(prev => ({ ...prev, reason: value }))}
              >
                <SelectTrigger className="border-2 focus:border-rose-500">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASONS.map(reason => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {REJECTION_REASONS.find(r => r.id === rejectionForm.reason)?.requiresValue && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor Ofertado *</label>
                <Input
                  placeholder="R$ 0,00"
                  value={formatCurrency(rejectionForm.offeredValue)}
                  onChange={(e) => setRejectionForm(prev => ({ 
                    ...prev, 
                    offeredValue: e.target.value.replace(/\D/g, '') 
                  }))}
                  className="border-2 focus:border-rose-500"
                />
              </div>
            )}

            {REJECTION_REASONS.find(r => r.id === rejectionForm.reason)?.requiresBank && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Banco da Simulação *</label>
                <Select 
                  value={rejectionForm.bank} 
                  onValueChange={(value) => setRejectionForm(prev => ({ ...prev, bank: value }))}
                >
                  <SelectTrigger className="border-2 focus:border-rose-500">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {BANKS_LIST.map(bank => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição do Motivo *</label>
              <Textarea
                placeholder="Descreva o motivo da recusa..."
                value={rejectionForm.description}
                onChange={(e) => setRejectionForm(prev => ({ ...prev, description: e.target.value }))}
                className="border-2 focus:border-rose-500 min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectionModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRejectionSubmit}
              className="bg-gradient-to-r from-rose-500 to-red-500"
            >
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Future Contact Modal */}
      <Dialog open={showFutureContactModal} onOpenChange={setShowFutureContactModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-slate-500" />
              Agendar Contato Futuro
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <strong>Lead:</strong> {selectedLead?.name}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Após a data selecionada, o lead retornará automaticamente como <strong>"Novo Lead"</strong> com observação <strong>"Lead em re-trabalho"</strong>.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data do Próximo Contato</label>
              <Input
                type="date"
                value={futureContactDate}
                onChange={(e) => setFutureContactDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="border-2 focus:border-primary"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFutureContactModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleFutureContactSubmit}
              className="bg-gradient-to-r from-slate-500 to-gray-500"
            >
              Agendar Contato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal (Agendamento) */}
      <Dialog open={showScheduleModal} onOpenChange={setShowScheduleModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-500" />
              Agendar Atendimento
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                <strong>Lead:</strong> {selectedLead?.name}
              </p>
            </div>

            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <Clock className="h-4 w-4 inline mr-2" />
                Informe a data e horário do agendamento com o cliente.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data do Agendamento *</label>
                <Input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="border-2 focus:border-indigo-500"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Horário *</label>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="border-2 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleScheduleSubmit}
              className="bg-gradient-to-r from-indigo-500 to-violet-500"
            >
              Confirmar Agendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Leads Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-indigo-500" />
              Atribuir Leads
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 dark:border-indigo-800">
              <p className="text-lg text-indigo-700 dark:text-indigo-300 font-semibold">
                {selectedLeadsForAssign.length} lead(s) selecionado(s)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Atribuir para o Usuário</label>
              <Select 
                value={targetUserId} 
                onValueChange={setTargetUserId}
              >
                <SelectTrigger className="border-2 focus:border-indigo-500 h-12">
                  <SelectValue placeholder="Selecione o usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id} className="text-base py-3">
                      <span className="flex items-center gap-2 font-semibold">
                        <User className="h-4 w-4" />
                        {u.name || u.email || 'Usuário'}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAssignModal(false);
              setSelectedLeadsForAssign([]);
              setTargetUserId("");
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssignLeads}
              disabled={!targetUserId}
              className="bg-gradient-to-r from-indigo-500 to-violet-500"
            >
              Atribuir Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Solicitar Digitação - Responsivo para Mobile */}
      <Dialog open={showDigitacaoModal} onOpenChange={setShowDigitacaoModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-r from-emerald-500/20 to-teal-500/20">
                <FileEdit className="h-5 w-5 text-emerald-600" />
              </div>
              Solicitar Digitação
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Info do Lead */}
            <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900">
                  <User className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-emerald-800 dark:text-emerald-200 truncate">
                    {selectedLead?.name}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1 text-sm text-emerald-600 dark:text-emerald-400">
                    <span className="font-mono">{selectedLead?.cpf}</span>
                    <span>•</span>
                    <span>{selectedLead?.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Banco - Campo obrigatório */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Banco *
              </Label>
              <Select 
                value={digitacaoForm.banco} 
                onValueChange={(value) => setDigitacaoForm(prev => ({ ...prev, banco: value }))}
              >
                <SelectTrigger className="h-12 border-2 focus:border-emerald-500 text-base">
                  <SelectValue placeholder="Selecione o banco" />
                </SelectTrigger>
                <SelectContent>
                  {loadingBanks ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : televendasBanks.length > 0 ? (
                    televendasBanks.map(bank => (
                      <SelectItem key={bank.id} value={bank.name} className="py-3">
                        {bank.name}
                      </SelectItem>
                    ))
                  ) : (
                    BANKS_LIST.map(bank => (
                      <SelectItem key={bank} value={bank} className="py-3">
                        {bank}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Operação */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Tipo de Operação *</Label>
              <Select 
                value={digitacaoForm.tipo_operacao} 
                onValueChange={(value) => setDigitacaoForm(prev => ({ ...prev, tipo_operacao: value }))}
              >
                <SelectTrigger className="h-12 border-2 focus:border-emerald-500 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Novo empréstimo" className="py-3">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Novo Empréstimo
                    </span>
                  </SelectItem>
                  <SelectItem value="Portabilidade" className="py-3">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      Portabilidade
                    </span>
                  </SelectItem>
                  <SelectItem value="Refinanciamento" className="py-3">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                      Refinanciamento
                    </span>
                  </SelectItem>
                  <SelectItem value="Cartão" className="py-3">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      Cartão
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Valores - Grid responsivo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Parcela *
                </Label>
                <Input
                  placeholder="R$ 0,00"
                  value={digitacaoForm.parcela}
                  onChange={(e) => setDigitacaoForm(prev => ({ 
                    ...prev, 
                    parcela: formatCurrency(e.target.value) 
                  }))}
                  className="h-12 border-2 focus:border-emerald-500 text-base font-medium"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Troco/Liberado</Label>
                <Input
                  placeholder="R$ 0,00"
                  value={digitacaoForm.troco}
                  onChange={(e) => setDigitacaoForm(prev => ({ 
                    ...prev, 
                    troco: formatCurrency(e.target.value) 
                  }))}
                  className="h-12 border-2 focus:border-emerald-500 text-base"
                />
              </div>
            </div>

            {/* Saldo Devedor */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Saldo Devedor</Label>
              <Input
                placeholder="R$ 0,00"
                value={digitacaoForm.saldo_devedor}
                onChange={(e) => setDigitacaoForm(prev => ({ 
                  ...prev, 
                  saldo_devedor: formatCurrency(e.target.value) 
                }))}
                className="h-12 border-2 focus:border-emerald-500 text-base"
              />
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Observação</Label>
              <Textarea
                placeholder="Informações adicionais sobre a operação..."
                value={digitacaoForm.observacao}
                onChange={(e) => setDigitacaoForm(prev => ({ ...prev, observacao: e.target.value }))}
                className="min-h-[80px] border-2 focus:border-emerald-500 text-base resize-none"
              />
            </div>

            {/* Info */}
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                <Send className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>O cliente será enviado para a <strong>Gestão Televendas</strong> com status <strong>"Solicitado Digitação"</strong>.</span>
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDigitacaoModal(false)}
              className="w-full sm:w-auto h-12 font-semibold"
              disabled={submittingDigitacao}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDigitacaoSubmit}
              disabled={submittingDigitacao || !digitacaoForm.banco || !digitacaoForm.parcela}
              className="w-full sm:w-auto h-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 font-bold"
            >
              {submittingDigitacao ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  Solicitar Digitação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AnimatedContainer>
  );
}
