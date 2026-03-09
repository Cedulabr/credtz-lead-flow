import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  ShieldAlert, ShieldCheck, ShieldX, MapPin, Wifi, Camera, 
  Search, Calendar, Loader2, Eye, TrendingUp, Users, AlertTriangle,
  RefreshCw, CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { TrustScoreBadge } from './TrustScoreBadge';
import { useAuditEngine } from './useAuditEngine';
import { clockTypeLabels, type TimeClock, type AuditStatus, type AuditFlag } from './types';
import { useToast } from '@/hooks/use-toast';

interface AuditRecord extends TimeClock {
  user_name?: string;
  user_email?: string;
}

export function AuditDashboard() {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // Re-audit state
  const [reauditing, setReauditing] = useState(false);
  const [reauditProgress, setReauditProgress] = useState({ current: 0, total: 0 });
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    normal: 0,
    suspicious: 0,
    irregular: 0,
    outsideGeofence: 0,
  });

  const { bulkReaudit } = useAuditEngine();
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
    loadRecords();
  }, [dateFrom, dateTo, statusFilter, userFilter]);

  const loadUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('is_active', true);
    
    if (data) {
      setUsers(data.map(u => ({ id: u.id, name: u.name || u.email || 'Usuário' })));
    }
  };

  const loadRecords = async () => {
    setLoading(true);
    
    let query = supabase
      .from('time_clock')
      .select('*')
      .gte('clock_date', dateFrom)
      .lte('clock_date', dateTo)
      .order('clock_date', { ascending: false })
      .order('clock_time', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('audit_status', statusFilter);
    }

    if (userFilter !== 'all') {
      query = query.eq('user_id', userFilter);
    }

    const { data } = await query;

    if (data) {
      // Enrich with user names
      const userIds = [...new Set(data.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const userMap = new Map(profiles?.map(p => [p.id, p.name || p.email || 'Usuário']));

      const enrichedRecords = data.map(r => ({
        ...r,
        user_name: userMap.get(r.user_id) || 'Usuário',
        audit_flags: (Array.isArray(r.audit_flags) ? r.audit_flags : []) as unknown as AuditFlag[],
      })) as AuditRecord[];

      setRecords(enrichedRecords);

      // Calculate stats
      const normal = enrichedRecords.filter(r => r.audit_status === 'normal').length;
      const suspicious = enrichedRecords.filter(r => r.audit_status === 'suspicious').length;
      const irregular = enrichedRecords.filter(r => r.audit_status === 'irregular').length;
      const outsideGeofence = enrichedRecords.filter(r => 
        r.audit_flags?.some(f => f.code === 'fora_da_area')
      ).length;

      setStats({
        total: enrichedRecords.length,
        normal,
        suspicious,
        irregular,
        outsideGeofence,
      });
    }

    setLoading(false);
  };

  const handleReaudit = async () => {
    setReauditing(true);
    setReauditProgress({ current: 0, total: 0 });
    
    try {
      const result = await bulkReaudit(dateFrom, dateTo, (current, total) => {
        setReauditProgress({ current, total });
      });
      
      toast({
        title: 'Re-auditoria concluída',
        description: `${result.processed} registros processados, ${result.flagged} com alertas detectados.`,
      });
      
      // Reload records to show updated data
      await loadRecords();
    } catch (error) {
      toast({
        title: 'Erro na re-auditoria',
        description: 'Ocorreu um erro ao processar os registros.',
        variant: 'destructive',
      });
    } finally {
      setReauditing(false);
      setReauditProgress({ current: 0, total: 0 });
    }
  };

  const filteredRecords = records.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.user_name?.toLowerCase().includes(term) ||
      r.ip_address?.toLowerCase().includes(term) ||
      r.city?.toLowerCase().includes(term)
    );
  });

  // Prepare chart data - score trends by date
  const chartData = (() => {
    const byDate = new Map<string, { date: string; avgScore: number; count: number; sum: number }>();
    
    records.forEach(r => {
      if (r.trust_score !== null) {
        const existing = byDate.get(r.clock_date);
        if (existing) {
          existing.count++;
          existing.sum += r.trust_score;
          existing.avgScore = Math.round(existing.sum / existing.count);
        } else {
          byDate.set(r.clock_date, {
            date: r.clock_date,
            avgScore: r.trust_score,
            count: 1,
            sum: r.trust_score,
          });
        }
      }
    });

    return Array.from(byDate.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  })();

  // Status distribution for bar chart
  const statusDistribution = [
    { name: 'Confiável', value: stats.normal, fill: 'hsl(var(--chart-2))' },
    { name: 'Suspeito', value: stats.suspicious, fill: 'hsl(var(--chart-4))' },
    { name: 'Irregular', value: stats.irregular, fill: 'hsl(var(--chart-1))' },
  ];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records" className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            Registros
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Análise
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Confiáveis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.normal}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  <ShieldAlert className="h-4 w-4 text-yellow-600" />
                  Suspeitos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.suspicious}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  <ShieldX className="h-4 w-4 text-red-600" />
                  Irregulares
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.irregular}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-orange-600" />
                  Fora da Área
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.outsideGeofence}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-5">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">De</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Até</label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="normal">Confiável</SelectItem>
                      <SelectItem value="suspicious">Suspeito</SelectItem>
                      <SelectItem value="irregular">Irregular</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Colaborador</label>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {users.map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome, IP, cidade..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Records Table */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Alertas</TableHead>
                        <TableHead>Foto</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Nenhum registro encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecords.map((record) => (
                          <TableRow 
                            key={record.id}
                            className={
                              record.audit_status === 'irregular' ? 'bg-red-50' :
                              record.audit_status === 'suspicious' ? 'bg-yellow-50' : ''
                            }
                          >
                            <TableCell className="font-medium">{record.user_name}</TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {format(new Date(record.clock_date), 'dd/MM/yyyy')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(record.clock_time), 'HH:mm:ss')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {clockTypeLabels[record.clock_type]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <TrustScoreBadge
                                score={record.trust_score}
                                status={record.audit_status}
                                flags={record.audit_flags}
                                size="sm"
                              />
                            </TableCell>
                            <TableCell>
                              {record.audit_flags && record.audit_flags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {record.audit_flags.map((flag, idx) => (
                                    <Badge key={idx} variant="destructive" className="text-xs">
                                      {flag.code === 'fora_da_area' && <MapPin className="h-3 w-3 mr-1" />}
                                      {flag.code === 'ip_suspeito' && <Wifi className="h-3 w-3 mr-1" />}
                                      {flag.code.startsWith('foto') && <Camera className="h-3 w-3 mr-1" />}
                                      {flag.label.split(' ')[0]}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {record.photo_url ? (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Foto do Registro</DialogTitle>
                                    </DialogHeader>
                                    <img 
                                      src={record.photo_url} 
                                      alt="Registro" 
                                      className="w-full rounded-lg"
                                    />
                                  </DialogContent>
                                </Dialog>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {record.city && record.state ? (
                                <span className="text-xs">{record.city}, {record.state}</span>
                              ) : record.latitude && record.longitude ? (
                                <span className="text-xs text-muted-foreground">
                                  {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-xs font-mono">
                                {record.ip_address || '—'}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Score Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tendência de Score</CardTitle>
                <CardDescription>Média diária dos últimos 30 dias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(v) => format(new Date(v), 'dd/MM')}
                        className="text-xs"
                      />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip
                        labelFormatter={(v) => format(new Date(v), 'dd/MM/yyyy')}
                        formatter={(value: number) => [`${value} pts`, 'Score médio']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgScore" 
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Status</CardTitle>
                <CardDescription>Classificação dos registros</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={80} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alert types breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Tipos de Alertas Detectados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                {[
                  { code: 'fora_da_area', label: 'Fora da Área', icon: MapPin, color: 'text-orange-600' },
                  { code: 'ip_suspeito', label: 'IP Suspeito', icon: Wifi, color: 'text-purple-600' },
                  { code: 'foto_invalida', label: 'Foto Inválida', icon: Camera, color: 'text-red-600' },
                  { code: 'foto_borrada', label: 'Foto Borrada', icon: Camera, color: 'text-yellow-600' },
                ].map(alertType => {
                  const count = records.filter(r => 
                    r.audit_flags?.some(f => f.code === alertType.code)
                  ).length;
                  const Icon = alertType.icon;
                  
                  return (
                    <Card key={alertType.code}>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-8 w-8 ${alertType.color}`} />
                          <div>
                            <div className="text-2xl font-bold">{count}</div>
                            <div className="text-sm text-muted-foreground">{alertType.label}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
