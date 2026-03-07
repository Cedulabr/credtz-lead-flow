import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import { useTimeClock } from '@/hooks/useTimeClock';
import { clockTypeLabels, statusLabels, statusColors, type TimeClock, type TimeClockType, type TimeClockStatus } from './types';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TimeClockPDF } from './TimeClockPDF';
import { useWhitelabel } from '@/hooks/useWhitelabel';
import { supabase } from '@/integrations/supabase/client';
import { calculateTotalBreakMinutes, parseTimeToMinutes, calculateDayMetrics, formatMinutesToHM, type DaySchedule } from '@/lib/timeClockCalculations';

interface MyHistoryProps {
  userId: string;
  userName: string;
  isAdmin?: boolean;
}

interface DailyGroup {
  date: string;
  records: TimeClock[];
  totalMinutes: number;
  breakMinutes: number;
  delayMinutes: number;
  status: TimeClockStatus;
  userName?: string;
}

export function MyHistory({ userId, userName, isAdmin = false }: MyHistoryProps) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [history, setHistory] = useState<TimeClock[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState<{ name: string; cnpj: string | null }>({ name: '', cnpj: null });
  const [schedules, setSchedules] = useState<Record<string, DaySchedule>>({});

  // Admin filters
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [companyUsers, setCompanyUsers] = useState<{ id: string; name: string; email: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');

  const activeUserId = isAdmin && selectedUserId !== 'all' ? selectedUserId : userId;
  const activeUserName = isAdmin && selectedUserId !== 'all'
    ? companyUsers.find(u => u.id === selectedUserId)?.name || userName
    : userName;

  const { getUserHistory } = useTimeClock(activeUserId);
  const { companyName: whitelabelName } = useWhitelabel();

  // Load companies for admin
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      if (data) setCompanies(data);
    })();
  }, [isAdmin]);

  // Load users for selected company
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      let query = supabase
        .from('user_companies')
        .select('user_id, profiles:user_id(id, name, email)')
        .eq('is_active', true);

      if (selectedCompanyId !== 'all') {
        query = query.eq('company_id', selectedCompanyId);
      }

      const { data } = await query;
      if (data) {
        const mapped = data
          .map((d: any) => d.profiles)
          .filter(Boolean)
          .map((p: any) => ({ id: p.id, name: p.name || p.email?.split('@')[0] || 'Sem nome', email: p.email }));
        const unique = Array.from(new Map(mapped.map((u: any) => [u.id, u])).values());
        setCompanyUsers(unique as any);
      }
    })();
  }, [isAdmin, selectedCompanyId]);

  useEffect(() => {
    setSelectedUserId('all');
  }, [selectedCompanyId]);

  useEffect(() => {
    loadHistory();
  }, [startDate, endDate, activeUserId, selectedUserId, isAdmin]);

  useEffect(() => {
    loadCompanyData();
    loadSchedules();
  }, [activeUserId]);

  const loadSchedules = async () => {
    // Load schedules for relevant users
    const userIds = isAdmin && selectedUserId === 'all'
      ? companyUsers.map(u => u.id)
      : [activeUserId];

    if (userIds.length === 0) return;

    const { data } = await supabase
      .from('time_clock_schedules')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (data) {
      const map: Record<string, DaySchedule> = {};
      data.forEach((s: any) => {
        map[s.user_id] = {
          entry_time: s.entry_time || '08:00',
          exit_time: s.exit_time || '18:00',
          lunch_start: s.lunch_start,
          lunch_end: s.lunch_end,
          daily_hours: s.daily_hours || 8,
          tolerance_minutes: s.tolerance_minutes || 10,
          work_days: s.work_days || [1, 2, 3, 4, 5],
        };
      });
      setSchedules(map);
    }
  };

  const loadCompanyData = async () => {
    try {
      const targetUserId = isAdmin && selectedUserId !== 'all' ? selectedUserId : userId;
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .single();

      if (userCompany?.company_id) {
        const { data: company } = await supabase
          .from('companies')
          .select('name, cnpj')
          .eq('id', userCompany.company_id)
          .single();

        if (company) {
          setCompanyData({ name: company.name, cnpj: company.cnpj });
        }
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  const loadHistory = async () => {
    setLoading(true);

    if (isAdmin && selectedUserId === 'all') {
      const targetUserIds = companyUsers.map(u => u.id);

      if (targetUserIds.length === 0) {
        setHistory([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('time_clock')
        .select('*')
        .in('user_id', targetUserIds)
        .gte('clock_date', startDate)
        .lte('clock_date', endDate)
        .order('clock_date', { ascending: false })
        .order('clock_time', { ascending: true });

      setHistory(data || []);
    } else {
      const data = await getUserHistory(startDate, endDate);
      setHistory(data);
    }
    setLoading(false);
  };

  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    companyUsers.forEach(u => { map[u.id] = u.name; });
    return map;
  }, [companyUsers]);

  const showAllUsers = isAdmin && selectedUserId === 'all';

  const groupByDate = (): DailyGroup[] => {
    const groupKey = (record: TimeClock) =>
      showAllUsers ? `${record.clock_date}__${record.user_id}` : record.clock_date;

    const groups: Record<string, TimeClock[]> = {};
    history.forEach((record) => {
      const key = groupKey(record);
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
    });

    return Object.entries(groups).map(([key, records]) => {
      const date = records[0].clock_date;
      const recordUserId = records[0].user_id;
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      const userSchedule = schedules[recordUserId] || null;

      const metrics = calculateDayMetrics(records, userSchedule, dayOfWeek);

      let status: TimeClockStatus = 'pendente';
      const entrada = records.find(r => r.clock_type === 'entrada');
      const saida = records.find(r => r.clock_type === 'saida');
      if (entrada && saida) {
        status = records.some(r => r.status === 'ajustado') ? 'ajustado' : 'completo';
      } else if (entrada) {
        status = 'incompleto';
      }

      return {
        date,
        records,
        totalMinutes: metrics.workedMinutes,
        breakMinutes: metrics.breakMinutes,
        delayMinutes: metrics.delayMinutes,
        status,
        userName: showAllUsers ? (userNameMap[recordUserId] || 'Desconhecido') : undefined,
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  };

  const groups = groupByDate();
  const showPdf = !showAllUsers;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {isAdmin ? 'Histórico de Ponto' : 'Meu Histórico'}
            </CardTitle>
            <CardDescription>
              {isAdmin ? 'Visualize registros de ponto dos colaboradores' : 'Visualize seus registros de ponto'}
            </CardDescription>
          </div>
          {showPdf && (
            <TimeClockPDF
              userId={activeUserId}
              userName={activeUserName}
              companyName={companyData.name || whitelabelName}
              companyCNPJ={companyData.cnpj || undefined}
            />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 min-w-[180px]">
              <label className="text-sm text-muted-foreground mb-1 block">Empresa</label>
              <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as empresas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-sm text-muted-foreground mb-1 block">Colaborador</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os colaboradores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {companyUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">De:</span>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Até:</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-auto" />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : groups.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum registro encontrado no período.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  {showAllUsers && <TableHead>Colaborador</TableHead>}
                  <TableHead>Entrada</TableHead>
                  <TableHead>Pausa</TableHead>
                  <TableHead>Retorno</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Pausas</TableHead>
                  <TableHead>Atraso</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group, idx) => {
                  const entrada = group.records.find((r) => r.clock_type === 'entrada');
                  const pausas = group.records.filter((r) => r.clock_type === 'pausa_inicio');
                  const retornos = group.records.filter((r) => r.clock_type === 'pausa_fim');
                  const saida = group.records.find((r) => r.clock_type === 'saida');

                  return (
                    <TableRow key={`${group.date}-${idx}`}>
                      <TableCell className="font-medium">
                        {format(parseISO(group.date), 'dd/MM/yyyy')}
                      </TableCell>
                      {showAllUsers && (
                        <TableCell className="font-medium">{group.userName}</TableCell>
                      )}
                      <TableCell>
                        {entrada ? (
                          <div className="flex items-center gap-1">
                            {format(parseISO(entrada.clock_time), 'HH:mm')}
                            {entrada.city && <MapPin className="h-3 w-3 text-muted-foreground" />}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {pausas.length > 0 ? format(parseISO(pausas[0].clock_time), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {retornos.length > 0 ? format(parseISO(retornos[retornos.length - 1].clock_time), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {saida ? format(parseISO(saida.clock_time), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {group.breakMinutes > 0 ? formatMinutesToHM(group.breakMinutes) : '-'}
                      </TableCell>
                      <TableCell>
                        {group.delayMinutes > 0 ? (
                          <Badge variant="outline" className="text-yellow-600">
                            {group.delayMinutes}min
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{formatMinutesToHM(group.totalMinutes)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[group.status]}>
                          {statusLabels[group.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
