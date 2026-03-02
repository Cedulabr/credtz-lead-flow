import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ScrollText, RefreshCw, Download, Search, Filter, 
  LogIn, Upload, Send, Edit, Trash2, UserPlus, Clock,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  module: string;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  login: { label: 'Login', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: LogIn },
  logout: { label: 'Logout', color: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400', icon: LogIn },
  import_leads: { label: 'Importação', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Upload },
  create_campaign: { label: 'Criação', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: UserPlus },
  send_sms: { label: 'Envio SMS', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Send },
  update_status: { label: 'Atualização', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Edit },
  create_lead: { label: 'Novo Lead', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400', icon: UserPlus },
  create_proposal: { label: 'Proposta', color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400', icon: UserPlus },
  delete: { label: 'Exclusão', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: Trash2 },
};

const MODULE_OPTIONS = [
  { value: 'all', label: 'Todos os Módulos' },
  { value: 'auth', label: 'Autenticação' },
  { value: 'activate_leads', label: 'Activate Leads' },
  { value: 'leads_premium', label: 'Leads Premium' },
  { value: 'televendas', label: 'Televendas' },
  { value: 'sms', label: 'SMS' },
  { value: 'baseoff', label: 'Base Off' },
  { value: 'admin', label: 'Admin' },
];

const ACTION_OPTIONS = [
  { value: 'all', label: 'Todas as Ações' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'import_leads', label: 'Importação' },
  { value: 'create_campaign', label: 'Criação de Campanha' },
  { value: 'send_sms', label: 'Envio de SMS' },
  { value: 'update_status', label: 'Atualização de Status' },
  { value: 'create_lead', label: 'Criação de Lead' },
  { value: 'create_proposal', label: 'Criação de Proposta' },
  { value: 'delete', label: 'Exclusão' },
];

const PAGE_SIZE = 50;

export function AdminLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [hasMore, setHasMore] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLogs = useCallback(async (append = false) => {
    if (!append) setLoading(true);
    try {
      let query = supabase
        .from('system_activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (append && logs.length > 0) {
        query = query.lt('created_at', logs[logs.length - 1].created_at);
      }

      if (moduleFilter !== 'all') query = query.eq('module', moduleFilter);
      if (actionFilter !== 'all') query = query.eq('action', actionFilter);
      if (searchTerm.trim()) {
        query = query.or(`user_name.ilike.%${searchTerm}%,user_email.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const typedData = (data || []) as unknown as ActivityLog[];
      if (append) {
        setLogs(prev => [...prev, ...typedData]);
      } else {
        setLogs(typedData);
      }
      setHasMore(typedData.length === PAGE_SIZE);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, actionFilter, searchTerm, logs]);

  useEffect(() => {
    fetchLogs(false);
  }, [moduleFilter, actionFilter]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchLogs(false), 10000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, moduleFilter, actionFilter, searchTerm]);

  const handleSearch = () => fetchLogs(false);

  const handleExportCSV = () => {
    if (logs.length === 0) { toast.info('Nenhum log para exportar'); return; }
    const header = 'Data;Usuário;Email;Ação;Módulo;Descrição';
    const rows = logs.map(l => [
      format(new Date(l.created_at), 'dd/MM/yyyy HH:mm:ss'),
      l.user_name || '',
      l.user_email || '',
      ACTION_CONFIG[l.action]?.label || l.action,
      l.module,
      (l.description || '').replace(/;/g, ','),
    ].join(';'));
    const csv = '\uFEFF' + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${logs.length} logs exportados`);
  };

  const getActionBadge = (action: string) => {
    const config = ACTION_CONFIG[action] || { label: action, color: 'bg-muted text-muted-foreground', icon: Clock };
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.color} gap-1 text-[11px] font-medium border-0`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4 p-4 md:p-0">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <ScrollText className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Logs de Atividade</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {logs.length} registros {autoRefresh && '• Atualização automática ativa'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={autoRefresh ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Ao Vivo' : 'Tempo Real'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchLogs(false)} className="gap-1.5 text-xs">
                <RefreshCw className="h-3.5 w-3.5" /> Atualizar
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-9 h-9"
                />
              </div>
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODULE_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleSearch} className="h-9 gap-1.5">
              <Search className="h-3.5 w-3.5" /> Buscar
            </Button>
          </div>

          {/* Table */}
          <ScrollArea className="h-[calc(100vh-320px)] rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Data/Hora</TableHead>
                  <TableHead className="w-[180px]">Usuário</TableHead>
                  <TableHead className="w-[120px]">Ação</TableHead>
                  <TableHead className="w-[120px]">Módulo</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Carregando logs...</p>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <ScrollText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                      <p className="text-sm text-muted-foreground">Nenhum log encontrado</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id} className="group">
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{log.user_name || 'N/A'}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{log.user_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[11px]">{log.module}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {log.description}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {hasMore && logs.length > 0 && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={() => fetchLogs(true)} className="gap-1.5">
                <ChevronDown className="h-4 w-4" /> Carregar mais
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
