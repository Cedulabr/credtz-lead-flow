import { useState, useEffect, useMemo, useCallback } from "react";
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
import { LeadHistoryModal } from "./LeadHistoryModal";
import { DailyLeadsTracking } from "./DailyLeadsTracking";
import { AnimatedContainer, StaggerContainer, StaggerItem } from "./ui/animated-container";
import { SimulationSummaryCards, SimulationRequestButton, SimulationManager } from "./leads";
import { useSimulationNotifications } from "@/hooks/useSimulationNotifications";
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
  Send,
  Tag
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
  tag?: string;
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
  simulation_status?: string | null;
  simulation_id?: string | null;
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
  tags: string[];
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
  },
  nao_e_whatsapp: {
    label: "Não é WhatsApp",
    color: "from-orange-500 to-red-500",
    textColor: "text-orange-700",
    bgColor: "bg-gradient-to-r from-orange-50 to-red-100",
    borderColor: "border-orange-200",
    icon: MessageCircle,
    dotColor: "bg-orange-500"
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
  const [convenioFilter, setConvenioFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
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
    ddds: [],
    tags: []
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

  // Available Tags for filtering
  const [availableTags, setAvailableTags] = useState<{tag: string, available_count: number}[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

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

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedLeadForHistory, setSelectedLeadForHistory] = useState<Lead | null>(null);

  // Daily tracking state
  const [showDailyTracking, setShowDailyTracking] = useState(false);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (user) {
      fetchLeads();
      fetchUserCredits();
      fetchAvailableConvenios();
      fetchAvailableDdds();
      fetchAvailableTags();
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

  const toggleTagSelection = (tag: string) => {
    setLeadRequest(prev => {
      const isSelected = prev.tags.includes(tag);
      if (isSelected) {
        return { ...prev, tags: prev.tags.filter(t => t !== tag) };
      } else {
        return { ...prev, tags: [...prev.tags, tag] };
      }
    });
  };

  const fetchAvailableTags = async () => {
    try {
      setLoadingTags(true);
      const { data, error } = await supabase.rpc('get_available_tags');
      
      if (error) throw error;
      setAvailableTags(data || []);
    } catch (error) {
      console.error('Error fetching available tags:', error);
      setAvailableTags([]);
    } finally {
      setLoadingTags(false);
    }
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
      // Use the new credits-based function with DDD and Tag filters
      const { data, error } = await supabase
        .rpc('request_leads_with_credits', {
          convenio_filter: leadRequest.convenio || null,
          banco_filter: null,
          produto_filter: null,
          leads_requested: leadRequest.count,
          ddd_filter: leadRequest.ddds.length > 0 ? leadRequest.ddds : null,
          tag_filter: leadRequest.tags.length > 0 ? leadRequest.tags : null
        });

      if (error) throw error;

      if (data && data.length > 0) {
        const requestedAt = new Date().toISOString();
        const leadsToInsert = data.map((lead: any) => ({
          name: lead.name,
          cpf: lead.cpf ?? '',
          phone: lead.phone,
          phone2: lead.phone2 || null,
          convenio: lead.convenio,
          tag: lead.tag || null,
          status: 'new_lead',
          created_by: user.id,
          assigned_to: user.id,
          origem_lead: 'Sistema - Solicitação',
          banco_operacao: lead.banco,
          valor_operacao: null,
          requested_at: requestedAt,
          requested_by: user.id,
          history: JSON.stringify([{
            action: 'created',
            timestamp: requestedAt,
            user_id: user.id,
            user_name: profile?.name || user?.email,
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
        setLeadRequest({ convenio: "", count: 10, ddds: [], tags: [] });
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
        user_name: profile?.name || user?.email,
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
        user_name: profile?.name || user?.email,
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
        user_name: profile?.name || user?.email,
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
      const targetUserName = getUserName(targetUserId);
      
      // Update each lead with history entry
      for (const leadId of selectedLeadsForAssign) {
        const lead = leads.find(l => l.id === leadId);
        if (!lead) continue;

        const previousAssignedTo = lead.assigned_to;
        const previousAssignedToName = getUserName(previousAssignedTo);
        const currentHistory = lead.history || [];

        const historyEntry = {
          action: 'assigned',
          timestamp: new Date().toISOString(),
          user_id: user?.id,
          user_name: profile?.name || user?.email,
          previous_assigned_to: previousAssignedTo,
          previous_assigned_to_name: previousAssignedToName !== 'Não atribuído' ? previousAssignedToName : null,
          assigned_to: targetUserId,
          assigned_to_name: targetUserName,
          note: `Lead atribuído para ${targetUserName}`
        };

        await supabase
          .from('leads')
          .update({ 
            assigned_to: targetUserId,
            updated_at: new Date().toISOString(),
            history: [...currentHistory, historyEntry]
          })
          .eq('id', leadId);
      }

      toast({
        title: "Leads Atribuídos",
        description: `${selectedLeadsForAssign.length} lead(s) atribuídos para ${targetUserName}.`,
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

  const handleOpenHistoryModal = (lead: Lead) => {
    setSelectedLeadForHistory(lead);
    setShowHistoryModal(true);
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

      const statusLabel = STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus;
      const previousStatusLabel = STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG]?.label || lead.status;

      const historyEntry = {
        action: 'status_change',
        from_status: lead.status,
        to_status: newStatus,
        timestamp: new Date().toISOString(),
        user_id: user?.id,
        user_name: profile?.name || user?.email,
        note: `Status alterado de "${previousStatusLabel}" para "${statusLabel}"`
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

      // Add specific history entry for digitação request
      const currentHistory = selectedLead.history || [];
      const digitacaoHistoryEntry = {
        action: 'digitacao_requested',
        from_status: selectedLead.status,
        to_status: 'cliente_fechado',
        timestamp: new Date().toISOString(),
        user_id: user.id,
        user_name: profile?.name || user?.email,
        note: `Digitação solicitada - Banco: ${digitacaoForm.banco}, Operação: ${digitacaoForm.tipo_operacao}`,
        digitacao_data: {
          banco: digitacaoForm.banco,
          tipo_operacao: digitacaoForm.tipo_operacao,
          parcela: parcelaValue,
          troco: trocoValue,
          saldo_devedor: saldoDevedorValue
        }
      };

      // Update lead status with specific digitação history
      await supabase
        .from('leads')
        .update({ 
          status: 'cliente_fechado',
          history: [...currentHistory, digitacaoHistoryEntry],
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedLead.id);

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
      
      const matchesConvenio = convenioFilter === "all" || lead.convenio === convenioFilter;
      
      const matchesTag = tagFilter === "all" || lead.tag === tagFilter;
      
      return matchesSearch && matchesStatus && matchesUser && matchesConvenio && matchesTag;
    });
  }, [leads, searchTerm, statusFilter, userFilter, convenioFilter, tagFilter]);

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

  if (showDailyTracking) {
    return (
      <div className="p-4 md:p-6 pb-20 md:pb-6">
        <DailyLeadsTracking onBack={() => setShowDailyTracking(false)} />
      </div>
    );
  }

  return (
    <AnimatedContainer animation="slide-up" className="p-3 md:p-8 space-y-6 md:space-y-8 pb-24 md:pb-8 bg-gradient-to-br from-background via-background to-muted/20 min-h-screen">
      {/* Simulation Manager Cards - Mostra simulações pendentes e prontas */}
      <SimulationManager onUpdate={fetchLeads} />

      {/* Header Simplificado */}
      <div className="flex flex-col space-y-4 md:space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4">
          <div className="space-y-1 md:space-y-2">
            <h1 className="text-2xl md:text-5xl font-black bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent tracking-tight">
              Leads Premium
            </h1>
            <p className="text-sm md:text-xl text-muted-foreground font-medium">
              🚀 Trabalhe seus leads e feche negócios!
            </p>
          </div>
          
          <div className="flex gap-2 md:gap-3 flex-wrap w-full md:w-auto">
            <Button 
              variant="outline" 
              size="default"
              onClick={fetchLeads}
              disabled={isLoading}
              className="hover:bg-primary/10 text-sm md:text-base font-semibold h-10 md:h-12 flex-1 md:flex-none"
            >
              <RefreshCcw className={`h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            
            {isAdmin && (
              <>
                <Button 
                  variant="outline" 
                  size="default"
                  className="flex items-center gap-1.5 hover:bg-primary/10 text-sm md:text-base font-semibold h-10 md:h-12"
                  onClick={() => setShowImportBase(true)}
                >
                  <Upload className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Importar</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="default"
                  className="flex items-center gap-1.5 hover:bg-orange-500/10 text-orange-600 border-orange-200 text-sm md:text-base font-semibold h-10 md:h-12"
                  onClick={() => setShowDistributedManager(true)}
                >
                  <Settings className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden lg:inline">Gerenciar Distribuídos</span>
                  <span className="lg:hidden hidden sm:inline">Dist.</span>
                </Button>

                <Button 
                  variant="outline" 
                  size="default"
                  className="flex items-center gap-1.5 hover:bg-purple-500/10 text-purple-600 border-purple-200 text-sm md:text-base font-semibold h-10 md:h-12"
                  onClick={() => setShowDailyTracking(true)}
                >
                  <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden lg:inline">Leads do Dia</span>
                  <span className="lg:hidden hidden sm:inline">Dia</span>
                </Button>
              </>
            )}
            
            <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
              <DialogTrigger asChild>
                <Button 
                  size="default" 
                  className="flex items-center gap-1.5 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/30 text-sm md:text-lg font-bold h-10 md:h-12 px-4 md:px-6 flex-1 md:flex-none"
                >
                  <Plus className="h-4 w-4 md:h-5 md:w-5" />
                  <span>Pedir Leads</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader className="pb-2">
                  <DialogTitle className="text-xl sm:text-2xl font-bold">🎯 Solicitar Leads</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 sm:space-y-6 py-2 sm:py-4">
                  <div className={`p-3 sm:p-4 rounded-xl border-2 ${userCredits === 0 ? 'bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/30' : 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20'}`}>
                    <p className="text-sm sm:text-lg text-muted-foreground">
                      Créditos disponíveis: <span className={`font-black text-xl sm:text-2xl ${userCredits === 0 ? 'text-red-500' : 'text-primary'}`}>{userCredits}</span>
                    </p>
                    {userCredits === 0 && (
                      <p className="text-xs sm:text-sm text-red-500 mt-1 sm:mt-2 font-medium">
                        ⚠️ Créditos acabaram. Solicite ao admin.
                      </p>
                    )}
                  </div>
                  
                  {/* Disponibilidade de Leads */}
                  <div className={`p-3 sm:p-4 rounded-xl border-2 ${totalAvailableLeads === 0 ? 'bg-gradient-to-r from-amber-500/10 to-amber-500/5 border-amber-500/30' : 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/20'}`}>
                    <p className="text-sm sm:text-lg text-muted-foreground">
                      Leads disponíveis: <span className={`font-black text-xl sm:text-2xl ${totalAvailableLeads === 0 ? 'text-amber-500' : 'text-emerald-600'}`}>{totalAvailableLeads}</span>
                    </p>
                    {totalAvailableLeads === 0 && (
                      <p className="text-xs sm:text-sm text-amber-600 mt-1 sm:mt-2 font-medium">
                        ⚠️ Sem leads disponíveis no momento.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm sm:text-base font-semibold">Convênio</label>
                    {loadingConvenios ? (
                      <div className="h-10 sm:h-12 flex items-center justify-center text-muted-foreground text-sm">
                        Carregando convênios...
                      </div>
                    ) : availableConvenios.length === 0 ? (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-center">
                        <p className="text-amber-700 dark:text-amber-400 font-medium text-sm">
                          Nenhum convênio disponível
                        </p>
                      </div>
                    ) : (
                      <Select value={leadRequest.convenio} onValueChange={(value) => 
                        setLeadRequest(prev => ({ ...prev, convenio: value }))
                      }>
                        <SelectTrigger className="border-2 focus:border-primary h-10 sm:h-12 text-sm sm:text-base">
                          <SelectValue placeholder="Selecione o convênio" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableConvenios.map(option => (
                            <SelectItem key={option.convenio} value={option.convenio} className="text-sm sm:text-base py-2 sm:py-3">
                              {option.convenio} ({option.available_count})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Filtro por DDD - Visual moderno */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                        <span>Filtrar por DDD</span>
                      </label>
                      {leadRequest.ddds.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setLeadRequest(prev => ({ ...prev, ddds: [] }))}
                          className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                    
                    {loadingDdds ? (
                      <div className="h-16 flex items-center justify-center text-muted-foreground bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border-2 border-dashed border-muted text-sm">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Carregando...
                      </div>
                    ) : availableDdds.length === 0 ? (
                      <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-2 border-amber-200 dark:border-amber-800 text-center">
                        <MapPin className="h-5 w-5 mx-auto mb-1 text-amber-500" />
                        <p className="text-amber-700 dark:text-amber-400 font-medium text-xs sm:text-sm">
                          Nenhum DDD disponível
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2 max-h-28 sm:max-h-36 overflow-y-auto p-2 sm:p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-slate-200 dark:border-slate-700">
                          {availableDdds.map(({ ddd, available_count }) => {
                            const isSelected = leadRequest.ddds.includes(ddd);
                            return (
                              <button
                                key={ddd}
                                type="button"
                                onClick={() => toggleDddSelection(ddd)}
                                className={`
                                  relative flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all duration-200 
                                  ${isSelected 
                                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/30 ring-1 ring-primary/50' 
                                    : 'bg-white dark:bg-slate-800 hover:bg-primary/10 dark:hover:bg-primary/20 border border-slate-200 dark:border-slate-600'
                                  }
                                `}
                              >
                                {isSelected && (
                                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
                                    <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 text-white" />
                                  </div>
                                )}
                                <span className={`text-sm sm:text-base font-bold ${isSelected ? '' : 'text-foreground'}`}>
                                  {ddd}
                                </span>
                                <span className={`text-[8px] sm:text-[10px] font-medium ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                  {available_count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Info de seleção */}
                        {leadRequest.ddds.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap p-2 rounded-lg bg-primary/10 border border-primary/20">
                            <CheckCircle className="h-3 w-3 text-primary flex-shrink-0" />
                            <span className="text-xs font-medium text-primary">
                              {leadRequest.ddds.length} selecionado(s):
                            </span>
                            <div className="flex gap-0.5 flex-wrap">
                              {leadRequest.ddds.slice(0, 6).map(d => (
                                <span key={d} className="px-1.5 py-0.5 bg-primary text-primary-foreground rounded-full text-[10px] font-bold">
                                  {d}
                                </span>
                              ))}
                              {leadRequest.ddds.length > 6 && (
                                <span className="px-1.5 py-0.5 bg-primary/50 text-primary-foreground rounded-full text-[10px] font-bold">
                                  +{leadRequest.ddds.length - 6}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Filtro por Tag/Perfil - Visual moderno */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm sm:text-base font-semibold flex items-center gap-1.5 sm:gap-2">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                          <Tag className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                        </div>
                        <span>Filtrar por Perfil</span>
                      </label>
                      {leadRequest.tags.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setLeadRequest(prev => ({ ...prev, tags: [] }))}
                          className="text-xs text-muted-foreground hover:text-destructive h-7 px-2"
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                    
                    {loadingTags ? (
                      <div className="h-16 flex items-center justify-center text-muted-foreground bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border-2 border-dashed border-muted text-sm">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Carregando...
                      </div>
                    ) : availableTags.length === 0 ? (
                      <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-slate-200 dark:border-slate-700 text-center">
                        <Tag className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-muted-foreground font-medium text-xs sm:text-sm">
                          Nenhum perfil cadastrado
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2 max-h-24 sm:max-h-28 overflow-y-auto p-2 sm:p-3 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-slate-200 dark:border-slate-700">
                          {availableTags.map(({ tag, available_count }) => {
                            const isSelected = leadRequest.tags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTagSelection(tag)}
                                className={`
                                  relative flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl transition-all duration-200 
                                  ${isSelected 
                                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30 ring-1 ring-emerald-400/50' 
                                    : 'bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border border-slate-200 dark:border-slate-600'
                                  }
                                `}
                              >
                                {isSelected && (
                                  <div className="absolute -top-0.5 -right-0.5 w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white flex items-center justify-center shadow-sm">
                                    <CheckCircle className="h-2 w-2 sm:h-3 sm:w-3 text-emerald-600" />
                                  </div>
                                )}
                                <Tag className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${isSelected ? 'text-white' : 'text-emerald-600'}`} />
                                <span className={`text-xs sm:text-sm font-semibold ${isSelected ? '' : 'text-foreground'}`}>
                                  {tag}
                                </span>
                                <span className={`text-[10px] sm:text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded-full ${
                                  isSelected 
                                    ? 'bg-white/20 text-white' 
                                    : 'bg-slate-100 dark:bg-slate-700 text-muted-foreground'
                                }`}>
                                  {available_count}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Info de seleção de tags */}
                        {leadRequest.tags.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap p-2 rounded-lg bg-emerald-500/10 border border-emerald-400/20">
                            <CheckCircle className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              {leadRequest.tags.length} selecionado(s):
                            </span>
                            <div className="flex gap-0.5 flex-wrap">
                              {leadRequest.tags.slice(0, 4).map(t => (
                                <span key={t} className="px-1.5 py-0.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-full text-[10px] font-bold">
                                  {t}
                                </span>
                              ))}
                              {leadRequest.tags.length > 4 && (
                                <span className="px-1.5 py-0.5 bg-emerald-500/50 text-white rounded-full text-[10px] font-bold">
                                  +{leadRequest.tags.length - 4}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm sm:text-base font-semibold">Quantidade</label>
                    <Input
                      type="number"
                      min="1"
                      max="80"
                      value={leadRequest.count}
                      onChange={(e) => setLeadRequest(prev => ({ 
                        ...prev, 
                        count: Math.min(Number(e.target.value), 80, userCredits) 
                      }))}
                      placeholder="Nº de leads (máx. 80)"
                      className="border-2 focus:border-primary h-10 sm:h-12 text-base sm:text-lg font-semibold"
                    />
                  </div>

                  <Button 
                    onClick={requestLeads} 
                    disabled={isLoading || userCredits === 0 || totalAvailableLeads === 0 || availableConvenios.length === 0}
                    className="w-full bg-gradient-to-r from-primary to-primary/80 h-11 sm:h-14 text-sm sm:text-lg font-bold mt-2"
                  >
                    {isLoading ? "Solicitando..." : userCredits === 0 ? "❌ Sem Créditos" : totalAvailableLeads === 0 ? "⚠️ Sem Leads" : "🚀 Pedir Leads"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Cards de Status - Mobile Scroll Horizontal */}
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 pb-2 scrollbar-hide">
          <div className="flex md:grid md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 min-w-max md:min-w-0">
            <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-200 w-28 md:w-auto flex-shrink-0">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-r from-slate-500 to-slate-600 flex items-center justify-center mx-auto mb-2 shadow-md">
                  <Target className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{stats.total}</p>
                <p className="text-xs font-semibold text-muted-foreground mt-0.5">TOTAL</p>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-200 dark:border-blue-800 hover:shadow-xl transition-all duration-200 w-28 md:w-auto flex-shrink-0">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-2 shadow-md">
                  <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.new}</p>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5">NOVOS</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 border-2 border-amber-200 dark:border-amber-800 hover:shadow-xl transition-all duration-200 w-28 md:w-auto flex-shrink-0">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-2 shadow-md">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-amber-700 dark:text-amber-300">{stats.inProgress}</p>
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">TRAB.</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 border-2 border-emerald-200 dark:border-emerald-800 hover:shadow-xl transition-all duration-200 w-28 md:w-auto flex-shrink-0">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-2 shadow-md">
                  <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-emerald-700 dark:text-emerald-300">{stats.completed}</p>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">FECHADOS</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-950 dark:to-red-900 border-2 border-rose-200 dark:border-rose-800 hover:shadow-xl transition-all duration-200 w-28 md:w-auto flex-shrink-0">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 flex items-center justify-center mx-auto mb-2 shadow-md">
                  <XCircle className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <p className="text-2xl md:text-3xl font-bold text-rose-700 dark:text-rose-300">{stats.rejected}</p>
                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5">RECUSADOS</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950 dark:to-indigo-900 border-2 border-purple-200 dark:border-purple-800 hover:shadow-xl transition-all duration-200 w-28 md:w-auto flex-shrink-0">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center mx-auto mb-2 shadow-md">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <p className={`text-2xl md:text-3xl font-bold ${stats.credits === 0 ? 'text-red-500' : 'text-purple-700 dark:text-purple-300'}`}>{stats.credits}</p>
                <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-0.5">CRÉDITOS</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Filtros Simplificados */}
      <Card className="border-2 border-muted/50 shadow-lg">
        <CardContent className="p-3 md:p-6">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                  <Input
                    placeholder="🔍 Buscar nome, CPF, telefone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 md:pl-12 border-2 focus:border-primary transition-colors h-11 md:h-14 text-sm md:text-lg font-medium"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 lg:flex gap-2 md:gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-44 border-2 focus:border-primary h-11 md:h-14 text-sm md:text-base font-semibold">
                    <Filter className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2 flex-shrink-0" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-sm md:text-base py-2 md:py-3">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-slate-400"></span>
                        Todos
                      </span>
                    </SelectItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key} className="text-sm md:text-base py-2 md:py-3">
                        <span className="flex items-center gap-2 font-semibold">
                          <span className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${config.dotColor}`}></span>
                          <span className="truncate">{config.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filtro por Convênio - Disponível para todos */}
                <Select value={convenioFilter} onValueChange={setConvenioFilter}>
                  <SelectTrigger className="w-full md:w-44 border-2 focus:border-primary h-11 md:h-14 text-sm md:text-base font-semibold">
                    <Building2 className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2 flex-shrink-0" />
                    <SelectValue placeholder="Convênio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-sm md:text-base py-2 md:py-3">
                      <span className="flex items-center gap-2 font-semibold">
                        <Building2 className="h-4 w-4" />
                        Todos Convênios
                      </span>
                    </SelectItem>
                    {[...new Set(leads.map(l => l.convenio).filter(Boolean))].sort().map(convenio => (
                      <SelectItem key={convenio} value={convenio} className="text-sm md:text-base py-2 md:py-3">
                        <span className="flex items-center gap-2 font-semibold">
                          {convenio}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filtro por Tag - Disponível para todos */}
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="w-full md:w-44 border-2 focus:border-primary h-11 md:h-14 text-sm md:text-base font-semibold">
                    <Tag className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2 flex-shrink-0" />
                    <SelectValue placeholder="Tag/Perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-sm md:text-base py-2 md:py-3">
                      <span className="flex items-center gap-2 font-semibold">
                        <Tag className="h-4 w-4" />
                        Todas Tags
                      </span>
                    </SelectItem>
                    {[...new Set(leads.map(l => l.tag).filter(Boolean))].sort().map(tag => (
                      <SelectItem key={tag} value={tag!} className="text-sm md:text-base py-2 md:py-3">
                        <span className="flex items-center gap-2 font-semibold">
                          <Tag className="h-4 w-4" />
                          {tag}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {isAdmin && (
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-full md:w-44 border-2 focus:border-primary h-11 md:h-14 text-sm md:text-base font-semibold">
                      <User className="h-4 w-4 md:h-5 md:w-5 mr-1.5 md:mr-2 flex-shrink-0" />
                      <SelectValue placeholder="Usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-sm md:text-base py-2 md:py-3">
                        <span className="flex items-center gap-2 font-semibold">
                          <Users className="h-4 w-4" />
                          Todos
                        </span>
                      </SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id} className="text-sm md:text-base py-2 md:py-3">
                          <span className="flex items-center gap-2 font-semibold truncate">
                            <User className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{u.name || u.email || 'Usuário'}</span>
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
                          {lead.tag && (
                            <Badge className="bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 border-violet-200 font-semibold text-sm px-3 py-1">
                              <Tag className="h-3 w-3 mr-1" />
                              {lead.tag}
                            </Badge>
                          )}
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
                          onClick={() => {
                            const firstName = lead.name.split(' ')[0];
                            const message = encodeURIComponent(`Olá, ${firstName} tudo bem?`);
                            window.open(`https://wa.me/55${lead.phone.replace(/\D/g, '')}?text=${message}`, '_blank');
                          }}
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
                            onClick={() => {
                              const firstName = lead.name.split(' ')[0];
                              const message = encodeURIComponent(`Olá, ${firstName} tudo bem?`);
                              window.open(`https://wa.me/55${lead.phone2!.replace(/\D/g, '')}?text=${message}`, '_blank');
                            }}
                            className="h-10 md:h-12 px-3 md:px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 border-emerald-300 hover:border-emerald-400 font-bold text-sm md:text-base"
                            title="WhatsApp Telefone 2"
                          >
                            <MessageCircle className="h-4 w-4 md:h-5 md:w-5 md:mr-1" />
                            <span className="hidden md:inline">Zap 2</span>
                          </Button>
                        )}

                        {/* Botão Histórico */}
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => handleOpenHistoryModal(lead)}
                          className="h-10 md:h-12 px-3 md:px-4 hover:bg-purple-100 hover:text-purple-700 hover:border-purple-300 font-bold text-sm md:text-base"
                          title="Ver Histórico"
                        >
                          <History className="h-4 w-4 md:h-5 md:w-5 md:mr-2" />
                          <span className="hidden md:inline">Histórico</span>
                        </Button>

                        {/* Botão Solicitar Simulação */}
                        <SimulationRequestButton
                          leadId={lead.id}
                          leadName={lead.name}
                          currentSimulationStatus={lead.simulation_status}
                          onSuccess={fetchLeads}
                        />

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

      {/* Lead History Modal */}
      <LeadHistoryModal
        isOpen={showHistoryModal}
        onClose={() => {
          setShowHistoryModal(false);
          setSelectedLeadForHistory(null);
        }}
        leadName={selectedLeadForHistory?.name || ''}
        history={selectedLeadForHistory?.history || []}
        users={users}
      />
    </AnimatedContainer>
  );
}
