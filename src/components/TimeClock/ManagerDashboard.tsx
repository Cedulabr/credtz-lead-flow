import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, Clock, AlertTriangle, CheckCircle, XCircle, 
  TrendingUp, Calendar, Image, MapPin, Loader2, Eye,
  FileText, Bell
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { JustificationManager } from './JustificationManager';

interface DailyOverview {
  user_id: string;
  user_name: string;
  user_email: string;
  entry_time: string | null;
  exit_time: string | null;
  break_start: string | null;
  break_end: string | null;
  status: 'present' | 'late' | 'absent' | 'incomplete';
  delay_minutes: number;
  photo_url: string | null;
  city: string | null;
  state: string | null;
}

interface Alert {
  id: string;
  user_id: string;
  user_name: string;
  alert_type: string;
  severity: string;
  description: string;
  reference_date: string;
  is_resolved: boolean;
  created_at: string;
}

interface TeamStats {
  total_employees: number;
  present_today: number;
  late_today: number;
  absent_today: number;
  pending_justifications: number;
  unresolved_alerts: number;
}

const ALERT_TYPES = {
  delay: { label: 'Atraso', icon: Clock, color: 'text-yellow-600' },
  absence: { label: 'Falta', icon: XCircle, color: 'text-red-600' },
  incomplete: { label: 'Incompleto', icon: AlertTriangle, color: 'text-orange-600' },
  missing_justification: { label: 'Sem Justificativa', icon: FileText, color: 'text-purple-600' },
  recurrent_delay: { label: 'Atrasos Recorrentes', icon: TrendingUp, color: 'text-red-700' },
  overtime_exceeded: { label: 'HE Excedida', icon: Clock, color: 'text-blue-600' },
};

const STATUS_CONFIG = {
  present: { label: 'Presente', color: 'bg-green-100 text-green-800' },
  late: { label: 'Atrasado', color: 'bg-yellow-100 text-yellow-800' },
  absent: { label: 'Ausente', color: 'bg-red-100 text-red-800' },
  incomplete: { label: 'Incompleto', color: 'bg-orange-100 text-orange-800' },
};

export function ManagerDashboard() {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dailyOverview, setDailyOverview] = useState<DailyOverview[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<TeamStats>({
    total_employees: 0,
    present_today: 0,
    late_today: 0,
    absent_today: 0,
    pending_justifications: 0,
    unresolved_alerts: 0,
  });
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; name: string; time: string } | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    
    const [usersRes, clocksRes, alertsRes, justificationsRes] = await Promise.all([
      supabase.from('profiles').select('id, name, email').eq('is_active', true),
      supabase.from('time_clock').select('*').eq('clock_date', selectedDate),
      supabase.from('time_clock_alerts')
        .select('*')
        .eq('is_resolved', false)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('time_clock_justifications')
        .select('*')
        .eq('status', 'pending'),
    ]);

    if (usersRes.data) {
      setUsers(usersRes.data);
    }

    // Processar visão diária
    const overview: DailyOverview[] = [];
    const userClocks: Record<string, any[]> = {};
    
    clocksRes.data?.forEach((clock: any) => {
      if (!userClocks[clock.user_id]) {
        userClocks[clock.user_id] = [];
      }
      userClocks[clock.user_id].push(clock);
    });

    usersRes.data?.forEach((user) => {
      const clocks = userClocks[user.id] || [];
      const entry = clocks.find((c: any) => c.clock_type === 'entrada');
      const exit = clocks.find((c: any) => c.clock_type === 'saida');
      const breakStart = clocks.find((c: any) => c.clock_type === 'pausa_inicio');
      const breakEnd = clocks.find((c: any) => c.clock_type === 'pausa_fim');

      let status: DailyOverview['status'] = 'absent';
      let delayMinutes = 0;

      if (entry) {
        const entryTime = entry.clock_time.split('T')[1]?.slice(0, 5) || entry.clock_time.slice(0, 5);
        if (entryTime > '08:10') {
          status = 'late';
          const [h, m] = entryTime.split(':').map(Number);
          delayMinutes = (h - 8) * 60 + m - 10;
        } else {
          status = exit ? 'present' : 'incomplete';
        }
      }

      overview.push({
        user_id: user.id,
        user_name: user.name || user.email.split('@')[0],
        user_email: user.email,
        entry_time: entry?.clock_time || null,
        exit_time: exit?.clock_time || null,
        break_start: breakStart?.clock_time || null,
        break_end: breakEnd?.clock_time || null,
        status,
        delay_minutes: delayMinutes,
        photo_url: entry?.photo_url || null,
        city: entry?.city || null,
        state: entry?.state || null,
      });
    });

    setDailyOverview(overview);

    // Processar alertas
    const alertsWithUsers: Alert[] = (alertsRes.data || []).map((alert: any) => ({
      ...alert,
      user_name: usersRes.data?.find(u => u.id === alert.user_id)?.name || 'Desconhecido',
    }));
    setAlerts(alertsWithUsers);

    // Calcular estatísticas
    const presentCount = overview.filter(o => o.status === 'present').length;
    const lateCount = overview.filter(o => o.status === 'late').length;
    const absentCount = overview.filter(o => o.status === 'absent').length;

    setStats({
      total_employees: usersRes.data?.length || 0,
      present_today: presentCount,
      late_today: lateCount,
      absent_today: absentCount,
      pending_justifications: justificationsRes.data?.length || 0,
      unresolved_alerts: alertsRes.data?.length || 0,
    });

    setLoading(false);
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    try {
      if (timeString.includes('T')) {
        return format(parseISO(timeString), 'HH:mm');
      }
      return timeString.slice(0, 5);
    } catch {
      return timeString;
    }
  };

  const resolveAlert = async (alertId: string) => {
    await supabase
      .from('time_clock_alerts')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId);
    loadData();
  };

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Equipe</p>
                <p className="text-2xl font-bold">{stats.total_employees}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Presentes</p>
                <p className="text-2xl font-bold text-green-800">{stats.present_today}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-700">Atrasados</p>
                <p className="text-2xl font-bold text-yellow-800">{stats.late_today}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Ausentes</p>
                <p className="text-2xl font-bold text-red-800">{stats.absent_today}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Justificativas</p>
                <p className="text-2xl font-bold text-purple-800">{stats.pending_justifications}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-700">Alertas</p>
                <p className="text-2xl font-bold text-orange-800">{stats.unresolved_alerts}</p>
              </div>
              <Bell className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Diária</TabsTrigger>
          <TabsTrigger value="alerts">
            Alertas
            {stats.unresolved_alerts > 0 && (
              <Badge variant="destructive" className="ml-2">{stats.unresolved_alerts}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="justifications">
            Justificativas
            {stats.pending_justifications > 0 && (
              <Badge variant="secondary" className="ml-2">{stats.pending_justifications}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Batidas do Dia
                  </CardTitle>
                  <CardDescription>
                    Acompanhe os registros de ponto da equipe
                  </CardDescription>
                </div>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaborador</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Pausa</TableHead>
                        <TableHead>Retorno</TableHead>
                        <TableHead>Saída</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead>Foto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyOverview.map((record) => (
                        <TableRow key={record.user_id}>
                          <TableCell className="font-medium">
                            {record.user_name}
                          </TableCell>
                          <TableCell>
                            {formatTime(record.entry_time)}
                            {record.delay_minutes > 0 && (
                              <Badge variant="outline" className="ml-2 text-yellow-600">
                                +{record.delay_minutes}min
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatTime(record.break_start)}</TableCell>
                          <TableCell>{formatTime(record.break_end)}</TableCell>
                          <TableCell>{formatTime(record.exit_time)}</TableCell>
                          <TableCell>
                            <Badge className={STATUS_CONFIG[record.status].color}>
                              {STATUS_CONFIG[record.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.city ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {record.city}/{record.state}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {record.photo_url ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedPhoto({
                                  url: record.photo_url!,
                                  name: record.user_name,
                                  time: formatTime(record.entry_time),
                                })}
                              >
                                <Image className="h-4 w-4" />
                              </Button>
                            ) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Alertas Pendentes
              </CardTitle>
              <CardDescription>
                Alertas automáticos de atrasos, faltas e ocorrências
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-500" />
                  <p>Nenhum alerta pendente. Tudo em ordem!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert) => {
                    const alertConfig = ALERT_TYPES[alert.alert_type as keyof typeof ALERT_TYPES];
                    const AlertIcon = alertConfig?.icon || AlertTriangle;
                    
                    return (
                      <div
                        key={alert.id}
                        className={`
                          flex items-center justify-between p-4 rounded-lg border
                          ${alert.severity === 'critical' ? 'bg-red-50 border-red-200' : 
                            alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' : 
                            'bg-blue-50 border-blue-200'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          <AlertIcon className={`h-5 w-5 ${alertConfig?.color || 'text-gray-600'}`} />
                          <div>
                            <p className="font-medium">{alert.user_name}</p>
                            <p className="text-sm text-muted-foreground">{alert.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(alert.reference_date), 'dd/MM/yyyy')}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveAlert(alert.id)}
                        >
                          Resolver
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="justifications">
          <JustificationManager isManager={true} />
        </TabsContent>
      </Tabs>

      {/* Modal de Foto */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Foto do Registro</DialogTitle>
            <DialogDescription>
              {selectedPhoto?.name} - {selectedPhoto?.time}
            </DialogDescription>
          </DialogHeader>
          {selectedPhoto && (
            <img
              src={selectedPhoto.url}
              alt="Foto do ponto"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
