import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Search, 
  Filter, 
  Upload, 
  RefreshCw, 
  Phone, 
  User, 
  CalendarIcon, 
  Download,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  UserX,
  Loader2,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Target,
  Users,
  Zap
} from 'lucide-react';
import { format, addDays, parseISO, isToday, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ActivateLead {
  id: string;
  nome: string;
  telefone: string;
  origem: string;
  produto: string | null;
  status: string;
  assigned_to: string | null;
  company_id: string | null;
  motivo_recusa: string | null;
  data_proxima_operacao: string | null;
  ultima_interacao: string | null;
  proxima_acao: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// Modern status configuration with vibrant colors
const STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  textColor: string; 
  bgColor: string; 
  borderColor: string;
  icon: React.ReactNode;
  dotColor: string;
}> = {
  novo: { 
    label: 'Novo', 
    color: 'from-blue-500 to-blue-600', 
    textColor: 'text-blue-700', 
    bgColor: 'bg-gradient-to-r from-blue-50 to-blue-100',
    borderColor: 'border-blue-200',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    dotColor: 'bg-blue-500'
  },
  em_andamento: { 
    label: 'Em Andamento', 
    color: 'from-amber-500 to-orange-500', 
    textColor: 'text-amber-700', 
    bgColor: 'bg-gradient-to-r from-amber-50 to-orange-100',
    borderColor: 'border-amber-200',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
    dotColor: 'bg-amber-500'
  },
  fechado: { 
    label: 'Fechado', 
    color: 'from-emerald-500 to-green-500', 
    textColor: 'text-emerald-700', 
    bgColor: 'bg-gradient-to-r from-emerald-50 to-green-100',
    borderColor: 'border-emerald-200',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
    dotColor: 'bg-emerald-500'
  },
  sem_possibilidade: { 
    label: 'Sem Possibilidade', 
    color: 'from-rose-500 to-red-500', 
    textColor: 'text-rose-700', 
    bgColor: 'bg-gradient-to-r from-rose-50 to-red-100',
    borderColor: 'border-rose-200',
    icon: <XCircle className="h-3.5 w-3.5" />,
    dotColor: 'bg-rose-500'
  },
  operacoes_recentes: { 
    label: 'Operações Recentes', 
    color: 'from-orange-500 to-amber-600', 
    textColor: 'text-orange-700', 
    bgColor: 'bg-gradient-to-r from-orange-50 to-amber-100',
    borderColor: 'border-orange-200',
    icon: <Clock className="h-3.5 w-3.5" />,
    dotColor: 'bg-orange-500'
  },
  fora_do_perfil: { 
    label: 'Fora do Perfil', 
    color: 'from-slate-500 to-gray-500', 
    textColor: 'text-slate-700', 
    bgColor: 'bg-gradient-to-r from-slate-50 to-gray-100',
    borderColor: 'border-slate-200',
    icon: <UserX className="h-3.5 w-3.5" />,
    dotColor: 'bg-slate-500'
  },
};

const ORIGEM_OPTIONS = ['site', 'aplicativo', 'importacao', 'indicacao'];
const ITEMS_PER_PAGE = 20;

export const ActivateLeads = () => {
  const { user, profile } = useAuth();
  const [leads, setLeads] = useState<ActivateLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [origemFilter, setOrigemFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [gestorId, setGestorId] = useState<string | null>(null);

  // Modal states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPullLeadsModalOpen, setIsPullLeadsModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);
  
  const [selectedLead, setSelectedLead] = useState<ActivateLead | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [dataProximaOperacao, setDataProximaOperacao] = useState<Date | undefined>();
  const [valorOfertado, setValorOfertado] = useState('');
  
  // Import states
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<{ nome: string; telefone: string }[]>([]);
  const [importing, setImporting] = useState(false);
  
  // Pull leads states
  const [pullSource, setPullSource] = useState<string>('');
  const [pullCount, setPullCount] = useState(20);
  const [pulling, setPulling] = useState(false);

  const isAdmin = profile?.role === 'admin';
  const isGestor = gestorId !== null;
  const canImport = isAdmin || isGestor;

  const fetchGestorId = useCallback(async () => {
    if (!user?.id) return;
    
    const { data } = await supabase
      .from('user_companies')
      .select('id, company_role')
      .eq('user_id', user.id)
      .eq('company_role', 'gestor')
      .eq('is_active', true)
      .maybeSingle();
    
    if (data) {
      setGestorId(data.id);
    }
  }, [user?.id]);

  const fetchLeads = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activate_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads((data as ActivateLead[]) || []);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast({
        title: 'Erro ao carregar leads',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGestorId();
    fetchLeads();
  }, [fetchGestorId, fetchLeads]);

  const formatPhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const normalizePhone = (phone: string): string => {
    return phone.replace(/\D/g, '');
  };

  const canEditLead = (lead: ActivateLead) => {
    if (isAdmin) return true;
    return lead.assigned_to === user?.id || lead.created_by === user?.id;
  };

  const handleStatusChange = (lead: ActivateLead, status: string) => {
    if (!canEditLead(lead)) {
      toast({
        title: 'Sem permissão',
        description: 'Você só pode alterar leads que você trabalha.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedLead(lead);
    setNewStatus(status);
    setMotivoRecusa('');
    setDataProximaOperacao(undefined);
    setValorOfertado('');

    if (status === 'sem_possibilidade' || status === 'fora_do_perfil') {
      setIsStatusModalOpen(true);
    } else if (status === 'operacoes_recentes') {
      setIsDateModalOpen(true);
    } else {
      updateLeadStatus(lead, status);
    }
  };

  const updateLeadStatus = async (lead: ActivateLead, status: string, extraData: Partial<ActivateLead> = {}) => {
    if (!user?.id) return;

    try {
      const updateData: any = {
        status,
        ultima_interacao: new Date().toISOString(),
        ...extraData,
      };

      const { error: updateError } = await supabase
        .from('activate_leads')
        .update(updateData)
        .eq('id', lead.id);

      if (updateError) throw updateError;

      // Add to history
      await supabase.from('activate_leads_history').insert({
        lead_id: lead.id,
        user_id: user.id,
        action_type: 'status_change',
        from_status: lead.status,
        to_status: status,
        notes: extraData.motivo_recusa || null,
        metadata: extraData.data_proxima_operacao 
          ? { data_proxima_operacao: extraData.data_proxima_operacao } 
          : null,
      });

      // Create notification for operacoes_recentes
      if (status === 'operacoes_recentes' && extraData.data_proxima_operacao) {
        await supabase.from('activate_leads_notifications').insert([
          {
            lead_id: lead.id,
            user_id: user.id,
            scheduled_date: extraData.data_proxima_operacao,
            notification_type: 'operacao_disponivel',
          },
          ...(gestorId ? [{
            lead_id: lead.id,
            user_id: gestorId,
            gestor_id: gestorId,
            scheduled_date: extraData.data_proxima_operacao,
            notification_type: 'operacao_disponivel',
          }] : []),
        ]);
      }

      toast({
        title: 'Status atualizado',
        description: `Lead atualizado para: ${STATUS_CONFIG[status]?.label || status}`,
      });

      fetchLeads();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleStatusModalSubmit = () => {
    if (!selectedLead || !motivoRecusa.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, informe o motivo.',
        variant: 'destructive',
      });
      return;
    }

    updateLeadStatus(selectedLead, newStatus, { motivo_recusa: motivoRecusa });
    setIsStatusModalOpen(false);
  };

  const handleDateModalSubmit = () => {
    if (!selectedLead || !dataProximaOperacao) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, selecione a data da próxima operação.',
        variant: 'destructive',
      });
      return;
    }

    updateLeadStatus(selectedLead, newStatus, { 
      data_proxima_operacao: format(dataProximaOperacao, 'yyyy-MM-dd'),
      proxima_acao: `Contato em ${format(dataProximaOperacao, 'dd/MM/yyyy')}`,
    });
    setIsDateModalOpen(false);
  };

  const handleGenerateLeads = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const { data: availableLeads, error } = await supabase
        .from('activate_leads')
        .select('*')
        .is('assigned_to', null)
        .eq('status', 'novo')
        .limit(20);

      if (error) throw error;

      if (!availableLeads || availableLeads.length === 0) {
        toast({
          title: 'Sem leads disponíveis',
          description: 'Não há leads disponíveis para distribuição no momento.',
        });
        return;
      }

      const leadIds = availableLeads.map(l => l.id);
      
      const { error: updateError } = await supabase
        .from('activate_leads')
        .update({ assigned_to: user.id, ultima_interacao: new Date().toISOString() })
        .in('id', leadIds);

      if (updateError) throw updateError;

      const distributions = availableLeads.map(lead => ({
        lead_id: lead.id,
        user_id: user.id,
      }));

      await supabase.from('activate_leads_distribution').insert(distributions);

      toast({
        title: 'Leads gerados!',
        description: `${availableLeads.length} leads foram atribuídos a você.`,
      });

      fetchLeads();
    } catch (error: any) {
      console.error('Error generating leads:', error);
      toast({
        title: 'Erro ao gerar leads',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].toLowerCase().split(/[,;]/).map(h => h.trim());
      
      const nomeIndex = headers.findIndex(h => h.includes('nome'));
      const telefoneIndex = headers.findIndex(h => h.includes('telefone') || h.includes('phone'));

      if (nomeIndex === -1 || telefoneIndex === -1) {
        toast({
          title: 'Formato inválido',
          description: 'O arquivo deve conter colunas "Nome" e "Telefone".',
          variant: 'destructive',
        });
        return;
      }

      const parsed = lines.slice(1).map(line => {
        const values = line.split(/[,;]/).map(v => v.trim().replace(/^["']|["']$/g, ''));
        return {
          nome: values[nomeIndex] || '',
          telefone: normalizePhone(values[telefoneIndex] || ''),
        };
      }).filter(l => l.nome && l.telefone);

      setParsedLeads(parsed);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCSV(file);
    }
  };

  const handleImportSubmit = async () => {
    if (!user?.id || parsedLeads.length === 0) return;

    setImporting(true);
    try {
      const leadsToInsert = parsedLeads.map(lead => ({
        nome: lead.nome,
        telefone: lead.telefone,
        origem: 'importacao',
        status: 'novo',
        created_by: user.id,
      }));

      const { error } = await supabase
        .from('activate_leads')
        .insert(leadsToInsert);

      if (error) throw error;

      toast({
        title: 'Importação concluída!',
        description: `${parsedLeads.length} leads foram importados com sucesso.`,
      });

      setIsImportModalOpen(false);
      setCsvFile(null);
      setParsedLeads([]);
      fetchLeads();
    } catch (error: any) {
      console.error('Error importing leads:', error);
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const content = 'Nome,Telefone\nJoão Silva,11999998888\nMaria Santos,21988887777';
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_activate_leads.csv';
    link.click();
  };

  // Filters
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.telefone.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
      const matchesOrigem = origemFilter === 'all' || lead.origem === origemFilter;
      const matchesUser = isAdmin || lead.assigned_to === user?.id || lead.assigned_to === null;
      
      return matchesSearch && matchesStatus && matchesOrigem && matchesUser;
    });
  }, [leads, searchTerm, statusFilter, origemFilter, isAdmin, user?.id]);

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = useMemo(() => ({
    total: filteredLeads.length,
    novos: filteredLeads.filter(l => l.status === 'novo').length,
    emAndamento: filteredLeads.filter(l => l.status === 'em_andamento').length,
    fechados: filteredLeads.filter(l => l.status === 'fechado').length,
    semPossibilidade: filteredLeads.filter(l => l.status === 'sem_possibilidade').length,
    alertas: filteredLeads.filter(l => 
      l.data_proxima_operacao && 
      (isToday(parseISO(l.data_proxima_operacao)) || isBefore(parseISO(l.data_proxima_operacao), new Date()))
    ).length,
  }), [filteredLeads]);

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6 bg-gradient-to-br from-background via-background to-muted/20 min-h-screen">
      {/* Modern Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Activate Leads
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Gerencie e ative seus leads de múltiplas fontes
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={fetchLeads}
              disabled={loading}
              className="hover:bg-primary/10"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            
            <Button 
              onClick={handleGenerateLeads} 
              disabled={loading}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25"
            >
              <Zap className="h-4 w-4 mr-2" />
              Gerar Leads (20)
            </Button>
            
            {canImport && (
              <>
                <Button variant="outline" onClick={() => setIsImportModalOpen(true)} className="hover:bg-primary/10">
                  <Upload className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Importar</span>
                </Button>
                <Button variant="outline" onClick={() => setIsPullLeadsModalOpen(true)} className="hover:bg-primary/10">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Puxar</span>
                </Button>
              </>
            )}
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
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.novos}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Novos</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-900 border-amber-200 dark:border-amber-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.emAndamento}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Em Andamento</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-950 dark:to-green-900 border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.fechados}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Fechados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-rose-50 to-red-100 dark:from-rose-950 dark:to-red-900 border-rose-200 dark:border-rose-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 flex items-center justify-center mx-auto mb-2">
                <XCircle className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{stats.semPossibilidade}</p>
              <p className="text-xs text-rose-600 dark:text-rose-400">Sem Possibilidade</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950 dark:to-amber-900 border-orange-200 dark:border-orange-800 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-2">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{stats.alertas}</p>
              <p className="text-xs text-orange-600 dark:text-orange-400">Alertas</p>
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
                  placeholder="Buscar por nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 focus:border-primary transition-colors"
                />
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48 border-2 focus:border-primary">
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
                        <span className={cn("w-2 h-2 rounded-full", config.dotColor)}></span>
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={origemFilter} onValueChange={setOrigemFilter}>
                <SelectTrigger className="w-full md:w-40 border-2 focus:border-primary">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Origens</SelectItem>
                  {ORIGEM_OPTIONS.map(origem => (
                    <SelectItem key={origem} value={origem}>
                      {origem.charAt(0).toUpperCase() + origem.slice(1)}
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
                <TableHead className="font-semibold">Telefone</TableHead>
                <TableHead className="font-semibold">Origem</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Próxima Ação</TableHead>
                <TableHead className="font-semibold text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-muted to-muted/50 flex items-center justify-center mb-4">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-foreground">Nenhum lead encontrado</h3>
                      <p className="text-sm text-muted-foreground mt-1">Tente ajustar os filtros ou gerar novos leads</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedLeads.map((lead) => {
                  const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;
                  const hasAlert = lead.data_proxima_operacao && 
                    (isToday(parseISO(lead.data_proxima_operacao)) || 
                     isBefore(parseISO(lead.data_proxima_operacao), new Date()));
                  
                  return (
                    <TableRow 
                      key={lead.id} 
                      className={cn(
                        "group hover:bg-muted/30 transition-colors",
                        hasAlert && "bg-orange-50/50 dark:bg-orange-950/20"
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{lead.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{formatPhone(lead.telefone)}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium capitalize">
                          {lead.origem}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
                          statusConfig.bgColor,
                          statusConfig.textColor,
                          statusConfig.borderColor
                        )}>
                          {statusConfig.icon}
                          {statusConfig.label}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.proxima_acao || (lead.data_proxima_operacao 
                          ? `Operação em ${format(parseISO(lead.data_proxima_operacao), "dd/MM/yyyy", { locale: ptBR })}`
                          : <span className="text-muted-foreground">-</span>)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`tel:${lead.telefone}`, '_self')}
                            className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(`https://wa.me/${lead.telefone.replace(/\D/g, '')}`, '_blank')}
                            className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>

                          <Select 
                            value={lead.status}
                            onValueChange={(value) => handleStatusChange(lead, value)}
                            disabled={!canEditLead(lead)}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  <span className="flex items-center gap-2">
                                    <span className={cn("w-2 h-2 rounded-full", config.dotColor)}></span>
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
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Modern Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)} de {filteredLeads.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="hover:bg-primary/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-3">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="hover:bg-primary/10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Importar Leads Activate
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="hover:bg-primary/10">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Baixar Template CSV
              </Button>
            </div>
            
            <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar ou arraste o arquivo CSV
                </p>
                {csvFile && (
                  <p className="mt-2 text-sm text-primary font-medium">{csvFile.name}</p>
                )}
              </label>
            </div>

            {parsedLeads.length > 0 && (
              <div className="max-h-60 overflow-y-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedLeads.slice(0, 10).map((lead, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{lead.nome}</TableCell>
                        <TableCell className="font-mono">{formatPhone(lead.telefone)}</TableCell>
                      </TableRow>
                    ))}
                    {parsedLeads.length > 10 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          ... e mais {parsedLeads.length - 10} leads
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleImportSubmit} 
              disabled={parsedLeads.length === 0 || importing}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importar {parsedLeads.length} Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Modal */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {newStatus === 'sem_possibilidade' ? (
                <XCircle className="h-5 w-5 text-rose-500" />
              ) : (
                <UserX className="h-5 w-5 text-slate-500" />
              )}
              {newStatus === 'sem_possibilidade' ? 'Sem Possibilidade' : 'Cliente Fora do Perfil'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm">
                <strong>Lead:</strong> {selectedLead?.nome}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo (obrigatório)</Label>
              <Textarea
                id="motivo"
                placeholder="Informe o motivo..."
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                rows={4}
                className="border-2 focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleStatusModalSubmit} 
              disabled={!motivoRecusa.trim()}
              className="bg-gradient-to-r from-rose-500 to-red-500"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date Modal */}
      <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Operações Recentes (INSS)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Selecione quando o cliente poderá realizar uma nova operação
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Data da Próxima Operação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal border-2",
                      !dataProximaOperacao && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataProximaOperacao 
                      ? format(dataProximaOperacao, "dd/MM/yyyy", { locale: ptBR })
                      : "Selecione a data"
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataProximaOperacao}
                    onSelect={setDataProximaOperacao}
                    disabled={(date) => date < new Date() || date > addDays(new Date(), 365)}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDateModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDateModalSubmit} 
              disabled={!dataProximaOperacao}
              className="bg-gradient-to-r from-orange-500 to-amber-500"
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pull Leads Modal */}
      <Dialog open={isPullLeadsModalOpen} onOpenChange={setIsPullLeadsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Puxar Leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Origem dos Leads</Label>
              <Select value={pullSource} onValueChange={setPullSource}>
                <SelectTrigger className="border-2 focus:border-primary">
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="aplicativo">Aplicativo</SelectItem>
                  <SelectItem value="base_antiga">Base Antiga</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                value={pullCount}
                onChange={(e) => setPullCount(Number(e.target.value))}
                min={1}
                max={100}
                className="border-2 focus:border-primary"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPullLeadsModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                toast({
                  title: 'Em desenvolvimento',
                  description: 'Funcionalidade em implementação.',
                });
                setIsPullLeadsModalOpen(false);
              }}
              disabled={!pullSource || pulling}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {pulling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Puxar Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
