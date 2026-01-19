import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  RefreshCw, 
  Merge, 
  Trash2, 
  Edit, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Loader2,
  Users,
  AlertCircle,
  Sparkles,
  History,
  Eye,
  ChevronRight,
  Phone,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DuplicatePair {
  id: string;
  original_lead_id: string;
  duplicate_lead_id: string;
  similarity_score: number;
  match_type: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  original_lead?: LeadDetails;
  duplicate_lead?: LeadDetails;
}

interface LeadDetails {
  id: string;
  nome: string;
  telefone: string;
  cpf: string | null;
  origem: string;
  status: string;
  created_at: string;
  has_quality_issues: boolean;
  quality_issues: any;
}

interface QualityStats {
  total_leads: number;
  duplicates_pending: number;
  leads_with_errors: number;
  clean_percentage: number;
}

interface DuplicateManagerProps {
  onBack: () => void;
}

const MATCH_TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  cpf: { label: 'CPF', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300', icon: <User className="h-3 w-3" /> },
  telefone: { label: 'Telefone', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300', icon: <Phone className="h-3 w-3" /> },
  nome_telefone_extracted: { label: 'Tel. no Nome', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300', icon: <AlertTriangle className="h-3 w-3" /> },
  nome_similar: { label: 'Nome Similar', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: <Users className="h-3 w-3" /> },
};

export const DuplicateManager = ({ onBack }: DuplicateManagerProps) => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [stats, setStats] = useState<QualityStats | null>(null);
  const [selectedPair, setSelectedPair] = useState<DuplicatePair | null>(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadDetails | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', telefone: '', cpf: '' });
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_activate_leads_quality_stats');
      if (error) throw error;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        setStats(data as unknown as QualityStats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  const fetchDuplicates = useCallback(async (status: string = 'pending') => {
    setLoading(true);
    try {
      const { data: pairs, error } = await supabase
        .from('activate_leads_duplicates')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      if (pairs && pairs.length > 0) {
        const leadIds = new Set<string>();
        pairs.forEach(p => {
          leadIds.add(p.original_lead_id);
          leadIds.add(p.duplicate_lead_id);
        });

        const { data: leads, error: leadsError } = await supabase
          .from('activate_leads')
          .select('id, nome, telefone, cpf, origem, status, created_at, has_quality_issues, quality_issues')
          .in('id', Array.from(leadIds));

        if (leadsError) throw leadsError;

        const leadsMap = new Map(leads?.map(l => [l.id, l]) || []);

        const enrichedPairs = pairs.map(p => ({
          ...p,
          original_lead: leadsMap.get(p.original_lead_id),
          duplicate_lead: leadsMap.get(p.duplicate_lead_id),
        }));

        setDuplicates(enrichedPairs);
      } else {
        setDuplicates([]);
      }
    } catch (error) {
      console.error('Error fetching duplicates:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as duplicatas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('activate_leads_duplicate_logs')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchDuplicates('pending');
  }, [fetchStats, fetchDuplicates]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'pending') {
      fetchDuplicates('pending');
    } else if (activeTab === 'resolved') {
      fetchDuplicates('merged');
    }
  }, [activeTab, fetchDuplicates, fetchLogs]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.rpc('scan_activate_leads_duplicates');
      if (error) throw error;

      toast({
        title: '✅ Varredura concluída',
        description: `Encontradas ${data?.[0]?.duplicates_found || 0} duplicatas e ${data?.[0]?.leads_with_issues || 0} leads com problemas.`,
      });

      fetchStats();
      fetchDuplicates('pending');
    } catch (error: any) {
      console.error('Error scanning:', error);
      toast({
        title: 'Erro na varredura',
        description: error.message || 'Não foi possível realizar a varredura.',
        variant: 'destructive',
      });
    } finally {
      setScanning(false);
    }
  };

  const handleMerge = async (keepLeadId: string, removeLeadId: string) => {
    if (!user?.id) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('merge_activate_leads', {
        keep_lead_id: keepLeadId,
        remove_lead_id: removeLeadId,
        performed_by_user: user.id,
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; error?: string };
      if (result?.success) {
        toast({
          title: '✅ Leads mesclados',
          description: 'Os registros foram mesclados com sucesso.',
        });
        setIsCompareModalOpen(false);
        fetchStats();
        fetchDuplicates('pending');
      } else {
        throw new Error(result?.error || 'Erro ao mesclar');
      }
    } catch (error: any) {
      console.error('Error merging:', error);
      toast({
        title: 'Erro ao mesclar',
        description: error.message || 'Não foi possível mesclar os leads.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleIgnore = async (pairId: string) => {
    if (!user?.id) return;
    setProcessing(true);
    try {
      const { error: updateError } = await supabase
        .from('activate_leads_duplicates')
        .update({ status: 'ignored', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq('id', pairId);

      if (updateError) throw updateError;

      const pair = duplicates.find(d => d.id === pairId);
      if (pair) {
        await supabase.from('activate_leads_duplicate_logs').insert({
          duplicate_id: pairId,
          original_lead_id: pair.original_lead_id,
          duplicate_lead_id: pair.duplicate_lead_id,
          action: 'ignore',
          action_details: { reason: 'User marked as not duplicate' },
          performed_by: user.id,
        });
      }

      toast({
        title: '✅ Marcado como ignorado',
        description: 'Este par não será mais mostrado como duplicata.',
      });
      setIsCompareModalOpen(false);
      fetchStats();
      fetchDuplicates('pending');
    } catch (error: any) {
      console.error('Error ignoring:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível ignorar a duplicata.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!user?.id || !selectedPair) return;
    setProcessing(true);
    try {
      await supabase.from('activate_leads_duplicate_logs').insert({
        duplicate_id: selectedPair.id,
        original_lead_id: selectedPair.original_lead_id,
        duplicate_lead_id: selectedPair.duplicate_lead_id,
        action: 'delete',
        action_details: { deleted_lead_id: leadId },
        performed_by: user.id,
      });

      const { error } = await supabase
        .from('activate_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: '✅ Lead excluído',
        description: 'O registro duplicado foi removido.',
      });
      setIsCompareModalOpen(false);
      fetchStats();
      fetchDuplicates('pending');
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Não foi possível excluir o lead.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleEdit = async () => {
    if (!user?.id || !editingLead) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('activate_leads')
        .update({
          nome: editForm.nome.trim(),
          telefone: editForm.telefone.replace(/\D/g, ''),
          cpf: editForm.cpf.replace(/\D/g, '') || null,
          sanitized: true,
          sanitized_at: new Date().toISOString(),
          has_quality_issues: false,
          quality_issues: null,
        })
        .eq('id', editingLead.id);

      if (error) throw error;

      await supabase.from('activate_leads_duplicate_logs').insert({
        original_lead_id: editingLead.id,
        action: 'edit',
        action_details: { 
          before: { nome: editingLead.nome, telefone: editingLead.telefone, cpf: editingLead.cpf },
          after: editForm 
        },
        performed_by: user.id,
      });

      toast({
        title: '✅ Lead atualizado',
        description: 'Os dados foram corrigidos com sucesso.',
      });
      setIsEditModalOpen(false);
      fetchStats();
      fetchDuplicates('pending');
    } catch (error: any) {
      console.error('Error editing:', error);
      toast({
        title: 'Erro ao editar',
        description: error.message || 'Não foi possível atualizar o lead.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (lead: LeadDetails) => {
    setEditingLead(lead);
    setEditForm({
      nome: lead.nome,
      telefone: lead.telefone,
      cpf: lead.cpf || '',
    });
    setIsEditModalOpen(true);
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return '-';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Saneamento de Base
            </h2>
            <p className="text-sm text-muted-foreground">
              Detecte e corrija leads duplicados e com erros de dados
            </p>
          </div>
        </div>
        <Button 
          onClick={handleScan} 
          disabled={scanning}
          className="gap-2"
        >
          {scanning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {scanning ? 'Analisando...' : 'Iniciar Varredura'}
        </Button>
      </div>

      {/* Quality Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Total de Leads</p>
                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.total_leads}</p>
                  </div>
                  <Users className="h-10 w-10 text-blue-500/50" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 dark:text-orange-400">Duplicatas Pendentes</p>
                    <p className="text-3xl font-bold text-orange-700 dark:text-orange-300">{stats.duplicates_pending}</p>
                  </div>
                  <AlertTriangle className="h-10 w-10 text-orange-500/50" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400">Leads com Erro</p>
                    <p className="text-3xl font-bold text-red-700 dark:text-red-300">{stats.leads_with_errors}</p>
                  </div>
                  <AlertCircle className="h-10 w-10 text-red-500/50" />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border-emerald-200 dark:border-emerald-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400">Base Limpa</p>
                    <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{stats.clean_percentage}%</p>
                  </div>
                  <Sparkles className="h-10 w-10 text-emerald-500/50" />
                </div>
                <Progress value={stats.clean_percentage} className="mt-2" />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="pending" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Pendentes
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Resolvidos
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : duplicates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-16 w-16 text-emerald-500 mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma duplicata pendente!</h3>
                <p className="text-muted-foreground">A base está limpa. Execute uma varredura para verificar novamente.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Duplicatas Encontradas</CardTitle>
                <CardDescription>
                  Clique em "Revisar" para analisar e tomar ação sobre cada par de duplicatas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead Original</TableHead>
                        <TableHead>Lead Duplicado</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Similaridade</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {duplicates.map((pair) => (
                          <motion.tr
                            key={pair.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="border-b hover:bg-muted/50"
                          >
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium truncate max-w-[200px]">
                                  {pair.original_lead?.nome || 'N/A'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatPhone(pair.original_lead?.telefone || '')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium truncate max-w-[200px]">
                                  {pair.duplicate_lead?.nome || 'N/A'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatPhone(pair.duplicate_lead?.telefone || '')}
                                </span>
                                {pair.duplicate_lead?.has_quality_issues && (
                                  <Badge variant="destructive" className="w-fit mt-1 text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Dados com erro
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={MATCH_TYPE_LABELS[pair.match_type]?.color || 'bg-gray-100'}>
                                {MATCH_TYPE_LABELS[pair.match_type]?.icon}
                                <span className="ml-1">{MATCH_TYPE_LABELS[pair.match_type]?.label || pair.match_type}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono">{pair.similarity_score}%</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(pair.created_at), 'dd/MM/yy', { locale: ptBR })}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedPair(pair);
                                  setIsCompareModalOpen(true);
                                }}
                                className="gap-1"
                              >
                                <Eye className="h-4 w-4" />
                                Revisar
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : duplicates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma duplicata resolvida ainda</h3>
                <p className="text-muted-foreground">As duplicatas mescladas aparecerão aqui.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Duplicatas Resolvidas</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lead Original</TableHead>
                        <TableHead>Lead Removido</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Data Resolução</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {duplicates.map((pair) => (
                        <TableRow key={pair.id}>
                          <TableCell>{pair.original_lead?.nome || 'Removido'}</TableCell>
                          <TableCell className="text-muted-foreground line-through">
                            {pair.duplicate_lead?.nome || 'Removido'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{MATCH_TYPE_LABELS[pair.match_type]?.label}</Badge>
                          </TableCell>
                          <TableCell>
                            {pair.reviewed_at ? format(new Date(pair.reviewed_at), 'dd/MM/yy HH:mm', { locale: ptBR }) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          {loadingLogs ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : logs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">Nenhum registro ainda</h3>
                <p className="text-muted-foreground">As ações realizadas serão registradas aqui.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Ações</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {logs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className={`p-2 rounded-full ${
                          log.action === 'merge' ? 'bg-emerald-100 text-emerald-600' :
                          log.action === 'delete' ? 'bg-red-100 text-red-600' :
                          log.action === 'ignore' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {log.action === 'merge' && <Merge className="h-4 w-4" />}
                          {log.action === 'delete' && <Trash2 className="h-4 w-4" />}
                          {log.action === 'ignore' && <XCircle className="h-4 w-4" />}
                          {log.action === 'edit' && <Edit className="h-4 w-4" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium capitalize">{log.action}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(log.performed_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Compare Modal */}
      <Dialog open={isCompareModalOpen} onOpenChange={setIsCompareModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Comparar Leads Duplicados
            </DialogTitle>
            <DialogDescription>
              Analise os registros e escolha a ação apropriada
            </DialogDescription>
          </DialogHeader>

          {selectedPair && (
            <div className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Tipo de Duplicidade: {MATCH_TYPE_LABELS[selectedPair.match_type]?.label}</AlertTitle>
                <AlertDescription>
                  {selectedPair.match_type === 'nome_telefone_extracted' && 
                    'Foi detectado um número de telefone no campo de nome deste lead.'}
                  {selectedPair.match_type === 'telefone' && 
                    'Estes leads possuem o mesmo número de telefone.'}
                  {selectedPair.match_type === 'cpf' && 
                    'Estes leads possuem o mesmo CPF.'}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-6">
                {/* Original Lead */}
                <Card className="border-2 border-emerald-200 dark:border-emerald-800">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-100 text-emerald-800">Lead Original</Badge>
                      <span className="text-xs text-muted-foreground">
                        Criado em {selectedPair.original_lead?.created_at ? 
                          format(new Date(selectedPair.original_lead.created_at), 'dd/MM/yy', { locale: ptBR }) : '-'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <p className="font-medium">{selectedPair.original_lead?.nome || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Telefone</Label>
                      <p className="font-mono">{formatPhone(selectedPair.original_lead?.telefone || '')}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">CPF</Label>
                      <p className="font-mono">{formatCPF(selectedPair.original_lead?.cpf || null)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <p>{selectedPair.original_lead?.status || '-'}</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => selectedPair.original_lead && openEditModal(selectedPair.original_lead)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => selectedPair.original_lead && selectedPair.duplicate_lead && 
                          handleMerge(selectedPair.original_lead.id, selectedPair.duplicate_lead.id)}
                        disabled={processing}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        Manter Este
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Duplicate Lead */}
                <Card className={`border-2 ${selectedPair.duplicate_lead?.has_quality_issues ? 'border-red-300 dark:border-red-800' : 'border-orange-200 dark:border-orange-800'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-orange-100 text-orange-800">Lead Duplicado</Badge>
                      <span className="text-xs text-muted-foreground">
                        Criado em {selectedPair.duplicate_lead?.created_at ? 
                          format(new Date(selectedPair.duplicate_lead.created_at), 'dd/MM/yy', { locale: ptBR }) : '-'}
                      </span>
                    </div>
                    {selectedPair.duplicate_lead?.has_quality_issues && (
                      <Alert variant="destructive" className="mt-2 py-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Telefone detectado no nome: {selectedPair.duplicate_lead?.quality_issues?.extracted_phone}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <p className={`font-medium ${selectedPair.duplicate_lead?.has_quality_issues ? 'text-red-600' : ''}`}>
                        {selectedPair.duplicate_lead?.nome || '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Telefone</Label>
                      <p className="font-mono">{formatPhone(selectedPair.duplicate_lead?.telefone || '')}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">CPF</Label>
                      <p className="font-mono">{formatCPF(selectedPair.duplicate_lead?.cpf || null)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <p>{selectedPair.duplicate_lead?.status || '-'}</p>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => selectedPair.duplicate_lead && openEditModal(selectedPair.duplicate_lead)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => selectedPair.duplicate_lead && handleDelete(selectedPair.duplicate_lead.id)}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <DialogFooter className="flex justify-between sm:justify-between">
                <Button 
                  variant="ghost" 
                  onClick={() => handleIgnore(selectedPair.id)}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Ignorar (não são duplicados)
                </Button>
                <Button variant="outline" onClick={() => setIsCompareModalOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Lead
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-nome">Nome</Label>
              <Input
                id="edit-nome"
                value={editForm.nome}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/\d/.test(value)) {
                    toast({
                      title: '⚠️ Nome inválido',
                      description: 'O nome do cliente não pode conter números.',
                      variant: 'destructive',
                    });
                    return;
                  }
                  setEditForm(prev => ({ ...prev, nome: value }));
                }}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="edit-telefone">Telefone</Label>
              <Input
                id="edit-telefone"
                value={editForm.telefone}
                onChange={(e) => setEditForm(prev => ({ ...prev, telefone: e.target.value.replace(/\D/g, '') }))}
                placeholder="DDD + Número"
                maxLength={11}
              />
            </div>
            <div>
              <Label htmlFor="edit-cpf">CPF (opcional)</Label>
              <Input
                id="edit-cpf"
                value={editForm.cpf}
                onChange={(e) => setEditForm(prev => ({ ...prev, cpf: e.target.value.replace(/\D/g, '') }))}
                placeholder="Apenas números"
                maxLength={11}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={processing || !editForm.nome.trim()}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
