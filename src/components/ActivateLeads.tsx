import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ChevronRight
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  novo: { label: 'Novo', color: 'bg-blue-500', icon: <User className="h-3 w-3" /> },
  em_andamento: { label: 'Em Andamento', color: 'bg-yellow-500', icon: <Clock className="h-3 w-3" /> },
  fechado: { label: 'Fechado', color: 'bg-green-500', icon: <CheckCircle className="h-3 w-3" /> },
  sem_possibilidade: { label: 'Sem Possibilidade', color: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
  operacoes_recentes: { label: 'Operações Recentes (INSS)', color: 'bg-orange-500', icon: <AlertTriangle className="h-3 w-3" /> },
  fora_do_perfil: { label: 'Fora do Perfil', color: 'bg-gray-500', icon: <UserX className="h-3 w-3" /> },
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
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 || digits.length === 10) {
      return digits;
    }
    return digits;
  };

  const handleStatusChange = (lead: ActivateLead, status: string) => {
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
      
      // Get available leads not assigned to this user
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

      // Assign leads to user
      const leadIds = availableLeads.map(l => l.id);
      
      const { error: updateError } = await supabase
        .from('activate_leads')
        .update({ assigned_to: user.id, ultima_interacao: new Date().toISOString() })
        .in('id', leadIds);

      if (updateError) throw updateError;

      // Register distribution
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
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.telefone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesOrigem = origemFilter === 'all' || lead.origem === origemFilter;
    
    // Only show leads assigned to user or unassigned (if not admin)
    const matchesUser = isAdmin || lead.assigned_to === user?.id || lead.assigned_to === null;
    
    return matchesSearch && matchesStatus && matchesOrigem && matchesUser;
  });

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = {
    total: filteredLeads.length,
    novos: filteredLeads.filter(l => l.status === 'novo').length,
    emAndamento: filteredLeads.filter(l => l.status === 'em_andamento').length,
    fechados: filteredLeads.filter(l => l.status === 'fechado').length,
    alertas: filteredLeads.filter(l => 
      l.data_proxima_operacao && 
      (isToday(parseISO(l.data_proxima_operacao)) || isBefore(parseISO(l.data_proxima_operacao), new Date()))
    ).length,
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activate Leads</h1>
          <p className="text-muted-foreground">Gerencie e ative seus leads de múltiplas fontes</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleGenerateLeads} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Gerar Leads (20)
          </Button>
          {canImport && (
            <>
              <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Leads
              </Button>
              <Button variant="outline" onClick={() => setIsPullLeadsModalOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Puxar Leads
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.novos}</p>
                <p className="text-xs text-muted-foreground">Novos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emAndamento}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.fechados}</p>
                <p className="text-xs text-muted-foreground">Fechados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.alertas}</p>
                <p className="text-xs text-muted-foreground">Alertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={origemFilter} onValueChange={setOrigemFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Origens</SelectItem>
                {ORIGEM_OPTIONS.map(origem => (
                  <SelectItem key={origem} value={origem}>
                    {origem.charAt(0).toUpperCase() + origem.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Interação</TableHead>
                  <TableHead>Próxima Ação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum lead encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLeads.map((lead) => {
                    const statusConfig = STATUS_CONFIG[lead.status] || STATUS_CONFIG.novo;
                    const hasAlert = lead.data_proxima_operacao && 
                      (isToday(parseISO(lead.data_proxima_operacao)) || 
                       isBefore(parseISO(lead.data_proxima_operacao), new Date()));
                    
                    return (
                      <TableRow key={lead.id} className={cn(hasAlert && "bg-orange-50 dark:bg-orange-950/20")}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{lead.nome}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <a 
                            href={`tel:${lead.telefone}`}
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                            {formatPhone(lead.telefone)}
                          </a>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {lead.origem.charAt(0).toUpperCase() + lead.origem.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>{lead.produto || '-'}</TableCell>
                        <TableCell>
                          <Badge className={cn("text-white", statusConfig.color)}>
                            <span className="flex items-center gap-1">
                              {statusConfig.icon}
                              {statusConfig.label}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.ultima_interacao 
                            ? format(parseISO(lead.ultima_interacao), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {lead.proxima_acao || (lead.data_proxima_operacao 
                            ? `Operação em ${format(parseISO(lead.data_proxima_operacao), "dd/MM/yyyy", { locale: ptBR })}`
                            : '-')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Select 
                            value={lead.status}
                            onValueChange={(value) => handleStatusChange(lead, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>
                                  <span className="flex items-center gap-2">
                                    {config.icon}
                                    {config.label}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)} de {filteredLeads.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Leads Activate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Baixar Template CSV
              </Button>
            </div>
            
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
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
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedLeads.slice(0, 10).map((lead, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{lead.nome}</TableCell>
                        <TableCell>{formatPhone(lead.telefone)}</TableCell>
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
            >
              {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importar {parsedLeads.length} Leads
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Modal (for sem_possibilidade and fora_do_perfil) */}
      <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newStatus === 'sem_possibilidade' ? 'Sem Possibilidade' : 'Cliente Fora do Perfil'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo (obrigatório)</Label>
              <Textarea
                id="motivo"
                placeholder="Informe o motivo..."
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleStatusModalSubmit} disabled={!motivoRecusa.trim()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Date Modal (for operacoes_recentes) */}
      <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Operações Recentes (INSS)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Data da Próxima Operação (obrigatório)</Label>
              <p className="text-sm text-muted-foreground">
                Selecione quando o cliente poderá realizar uma nova operação
              </p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
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
            <Button onClick={handleDateModalSubmit} disabled={!dataProximaOperacao}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pull Leads Modal */}
      <Dialog open={isPullLeadsModalOpen} onOpenChange={setIsPullLeadsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Puxar Leads</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Origem dos Leads</Label>
              <Select value={pullSource} onValueChange={setPullSource}>
                <SelectTrigger>
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
              <Label>Quantidade de Leads</Label>
              <Input
                type="number"
                value={pullCount}
                onChange={(e) => setPullCount(Number(e.target.value))}
                min={1}
                max={100}
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
                  title: 'Funcionalidade em desenvolvimento',
                  description: 'A integração com as fontes de leads será implementada em breve.',
                });
                setIsPullLeadsModalOpen(false);
              }} 
              disabled={!pullSource || pulling}
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
