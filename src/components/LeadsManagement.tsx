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
  Sparkles
} from "lucide-react";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  convenio: string;
  status: string;
  created_at: string;
  assigned_to?: string;
  created_by?: string;
  is_rework?: boolean;
  rework_date?: string;
  notes?: string;
  future_contact_date?: string;
  rejection_reason?: string;
  rejection_offered_value?: number;
  rejection_bank?: string;
  rejection_description?: string;
  banco_operacao?: string;
  valor_operacao?: number;
  history?: any;
}

interface LeadRequest {
  convenio: string;
  count: number;
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(30);
  const [remainingLeads, setRemainingLeads] = useState(30);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showImportBase, setShowImportBase] = useState(false);
  const [leadRequest, setLeadRequest] = useState<LeadRequest>({
    convenio: "",
    count: 10
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

  const isAdmin = profile?.role === 'admin';

  const conveniOptions = ["INSS", "SIAPE", "GOV BA", "Servidor Federal", "Servidor Estadual", "Servidor Municipal", "FGTS", "Forças Armadas"];

  useEffect(() => {
    if (user) {
      fetchLeads();
      checkDailyLimit();
      processExpiredFutureContacts();
    }
  }, [user]);

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

  const checkDailyLimit = async () => {
    try {
      const { data, error } = await supabase
        .rpc('check_daily_lead_limit', { user_id_param: user?.id });

      if (error) throw error;
      setRemainingLeads(data || 0);
    } catch (error) {
      console.error('Error checking daily limit:', error);
    }
  };

  const requestLeads = async () => {
    if (!user) return;

    if (leadRequest.count > remainingLeads) {
      toast({
        title: "Limite excedido",
        description: `Você só pode solicitar ${remainingLeads} leads hoje.`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('request_leads', {
          convenio_filter: leadRequest.convenio || null,
          banco_filter: null,
          produto_filter: null,
          leads_requested: leadRequest.count
        });

      if (error) throw error;

      if (data && data.length > 0) {
        const leadsToInsert = data.map((lead: any) => ({
          name: lead.name,
          cpf: lead.cpf,
          phone: lead.phone,
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
          description: `${data.length} leads foram adicionados à sua lista.`,
        });

        setShowRequestDialog(false);
        fetchLeads();
        checkDailyLimit();
        setLeadRequest({ convenio: "", count: 10 });
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
          history: [...currentHistory, historyEntry]
        })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, status: newStatus } : l
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

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = (lead.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (lead.cpf || "").includes(searchTerm) ||
                           (lead.phone || "").includes(searchTerm) ||
                           (lead.convenio || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [leads, searchTerm, statusFilter]);

  const stats = useMemo(() => ({
    total: leads.length,
    new: leads.filter(l => l.status === "new_lead").length,
    inProgress: leads.filter(l => ["em_andamento", "aguardando_retorno"].includes(l.status)).length,
    completed: leads.filter(l => l.status === "cliente_fechado").length,
    rejected: leads.filter(l => l.status === "recusou_oferta").length,
    rework: leads.filter(l => l.is_rework).length,
    remaining: remainingLeads
  }), [leads, remainingLeads]);

  if (showImportBase) {
    return (
      <div className="p-4 md:p-6 pb-20 md:pb-6">
        <ImportBase onBack={() => setShowImportBase(false)} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6 bg-gradient-to-br from-background via-background to-muted/20 min-h-screen">
      {/* Modern Header */}
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Gerenciar Leads
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Acompanhe e gerencie suas oportunidades de negócio
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchLeads}
              disabled={isLoading}
              className="hover:bg-primary/10"
            >
              <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            
            {isAdmin && (
              <Button 
                variant="outline" 
                className="flex items-center gap-2 hover:bg-primary/10"
                onClick={() => setShowImportBase(true)}
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar Base</span>
              </Button>
            )}
            
            <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Solicitar Leads</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold">Solicitar Novos Leads</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                    <p className="text-sm text-muted-foreground">
                      Leads restantes hoje: <span className="font-bold text-primary text-lg">{remainingLeads}</span>
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Convênio</label>
                    <Select value={leadRequest.convenio} onValueChange={(value) => 
                      setLeadRequest(prev => ({ ...prev, convenio: value }))
                    }>
                      <SelectTrigger className="border-2 focus:border-primary">
                        <SelectValue placeholder="Selecione o convênio" />
                      </SelectTrigger>
                      <SelectContent>
                        {conveniOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantidade</label>
                    <Input
                      type="number"
                      min="1"
                      max="80"
                      value={leadRequest.count}
                      onChange={(e) => setLeadRequest(prev => ({ 
                        ...prev, 
                        count: Math.min(Number(e.target.value), 80, remainingLeads) 
                      }))}
                      placeholder="Número de leads (máx. 80)"
                      className="border-2 focus:border-primary"
                    />
                  </div>

                  <Button 
                    onClick={requestLeads} 
                    disabled={isLoading || remainingLeads === 0}
                    className="w-full bg-gradient-to-r from-primary to-primary/80"
                  >
                    {isLoading ? "Solicitando..." : "Solicitar Leads"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Modern Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-slate-500 to-slate-600 flex items-center justify-center mx-auto mb-2">
                <Target className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.new}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Novos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 border-amber-200 dark:border-amber-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.inProgress}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Em Andamento</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.completed}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Fechados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-950 dark:to-red-900 border-rose-200 dark:border-rose-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 flex items-center justify-center mx-auto mb-2">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{stats.rejected}</p>
              <p className="text-xs text-rose-600 dark:text-rose-400">Recusados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950 dark:to-indigo-900 border-purple-200 dark:border-purple-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center mx-auto mb-2">
                <Users className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{stats.remaining}</p>
              <p className="text-xs text-purple-600 dark:text-purple-400">Restantes Hoje</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modern Filters */}
      <Card className="border-2 border-muted/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, CPF, telefone ou convênio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 focus:border-primary transition-colors"
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-52 border-2 focus:border-primary">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      Todos os Status
                    </span>
                  </SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modern Table */}
      <Card className="border-2 border-muted/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/60 hover:to-muted/40">
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">CPF</TableHead>
                <TableHead className="font-semibold">Telefone</TableHead>
                <TableHead className="font-semibold">Convênio</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.map((lead) => {
                const status = STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG];
                const StatusIcon = status?.icon || AlertCircle;
                
                return (
                  <TableRow 
                    key={lead.id} 
                    className="group hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{lead.name}</span>
                          {lead.is_rework && (
                            <Badge variant="outline" className="w-fit mt-1 text-xs bg-orange-50 text-orange-700 border-orange-200">
                              <RefreshCcw className="h-3 w-3 mr-1" />
                              Re-trabalho
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">{lead.cpf}</TableCell>
                    <TableCell>{lead.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium">
                        {lead.convenio}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${status?.bgColor} ${status?.textColor} ${status?.borderColor} border`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status?.label}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`tel:${lead.phone}`, '_self')}
                          className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`, '_blank')}
                          className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>

                        <Select 
                          value={lead.status} 
                          onValueChange={(value) => handleStatusChange(lead, value)}
                          disabled={!canEditLead(lead)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${config.dotColor}`}></span>
                                  {config.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredLeads.length === 0 && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-muted to-muted/50 flex items-center justify-center mx-auto mb-4">
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum lead encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar os filtros ou solicitar novos leads.
            </p>
            <Button 
              onClick={() => setShowRequestDialog(true)}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              Solicitar Leads
            </Button>
          </div>
        )}
      </Card>

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
    </div>
  );
}
