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
import { evaluateDay, summarizePeriod, type DaySchedule as EngineDaySchedule, type DiscountMode, type DayOffType } from '@/lib/timeClockEngine';
import { buildPayrollExplanation, type NegativeDayDetail } from '@/lib/payrollExplain';
import { PayrollBreakdownCard } from './PayrollBreakdownCard';
import { getBrazilianHolidays } from './brazilianHolidays';
import { eachDayOfInterval } from 'date-fns';

interface MyHistoryProps {
  userId: string;
  userName: string;
  isAdmin?: boolean;
}

interface DayOff {
  user_id: string;
  off_date: string;
  off_type: string;
  is_partial_day: boolean | null;
}

interface Justification {
  user_id: string;
  reference_date: string;
  justification_type: string;
  status: string;
}

interface DailyGroup {
  date: string;
  records: TimeClock[];
  totalMinutes: number;
  breakMinutes: number;
  delayMinutes: number;
  status: TimeClockStatus;
  userName?: string;
  overrideLabel?: string;
  overrideTone?: string;
}

export function MyHistory({ userId, userName, isAdmin = false }: MyHistoryProps) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [history, setHistory] = useState<TimeClock[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyData, setCompanyData] = useState<{ name: string; cnpj: string | null }>({ name: '', cnpj: null });
  const [schedules, setSchedules] = useState<Record<string, DaySchedule>>({});
  const [daysOff, setDaysOff] = useState<DayOff[]>([]);
  const [justifications, setJustifications] = useState<Justification[]>([]);
  const [baseSalary, setBaseSalary] = useState<number>(0);
  const [discountMode, setDiscountMode] = useState<DiscountMode>('financeiro');

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
      // Step 1: get user_ids from user_companies
      let query = supabase
        .from('user_companies')
        .select('user_id')
        .eq('is_active', true);

      if (selectedCompanyId !== 'all') {
        query = query.eq('company_id', selectedCompanyId);
      }

      const { data: relData } = await query;
      if (!relData || relData.length === 0) {
        setCompanyUsers([]);
        return;
      }

      const userIds = [...new Set(relData.map((r: any) => r.user_id))];

      // Step 2: get profiles separately
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      if (profiles) {
        const mapped = profiles.map((p: any) => ({
          id: p.id,
          name: p.name || p.email?.split('@')[0] || 'Sem nome',
          email: p.email,
        }));
        setCompanyUsers(mapped);
      }
    })();
  }, [isAdmin, selectedCompanyId]);

  useEffect(() => {
    setSelectedUserId('all');
  }, [selectedCompanyId]);

  useEffect(() => {
    loadHistory();
  }, [startDate, endDate, activeUserId, selectedUserId, isAdmin]);

  // Atualiza o histórico quando um ajuste é lançado em outra tela
  useEffect(() => {
    const handler = () => loadHistory();
    window.addEventListener('time-clock:refresh', handler);
    return () => window.removeEventListener('time-clock:refresh', handler);
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

    const targetUserIds = isAdmin && selectedUserId === 'all'
      ? companyUsers.map(u => u.id)
      : [activeUserId].filter(Boolean) as string[];

    if (targetUserIds.length === 0) {
      setHistory([]);
      setDaysOff([]);
      setJustifications([]);
      setLoading(false);
      return;
    }

    const [historyRes, daysOffRes, justRes] = await Promise.all([
      isAdmin && selectedUserId === 'all'
        ? supabase
            .from('time_clock')
            .select('*')
            .in('user_id', targetUserIds)
            .gte('clock_date', startDate)
            .lte('clock_date', endDate)
            .order('clock_date', { ascending: false })
            .order('clock_time', { ascending: true })
            .then(r => ({ data: r.data || [] }))
        : getUserHistory(startDate, endDate).then(d => ({ data: d })),
      supabase
        .from('time_clock_day_offs')
        .select('user_id, off_date, off_type, is_partial_day')
        .in('user_id', targetUserIds)
        .gte('off_date', startDate)
        .lte('off_date', endDate),
      supabase
        .from('time_clock_justifications')
        .select('user_id, reference_date, justification_type, status')
        .in('user_id', targetUserIds)
        .gte('reference_date', startDate)
        .lte('reference_date', endDate)
        .eq('status', 'approved'),
    ]);

    setHistory((historyRes as any).data || []);
    setDaysOff((daysOffRes.data as DayOff[]) || []);
    setJustifications((justRes.data as Justification[]) || []);
    setLoading(false);
  };

  const userNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    companyUsers.forEach(u => { map[u.id] = u.name; });
    return map;
  }, [companyUsers]);

  const showAllUsers = isAdmin && selectedUserId === 'all';

  const offTypeLabels: Record<string, string> = {
    folga: 'Folga', ferias: 'Férias', atestado: 'Atestado',
    licenca: 'Licença', feriado: 'Feriado', outro: 'Folga',
  };
  const justTypeLabels: Record<string, string> = {
    medical: 'Atestado', personal: 'Pessoal', vacation: 'Férias',
    sick_leave: 'Licença Médica', other: 'Justificado',
  };

  const groupByDate = (): DailyGroup[] => {
    const groupKey = (userId: string, date: string) =>
      showAllUsers ? `${date}__${userId}` : date;

    const groups: Record<string, { date: string; userId: string; records: TimeClock[] }> = {};

    history.forEach((record) => {
      const key = groupKey(record.user_id, record.clock_date);
      if (!groups[key]) groups[key] = { date: record.clock_date, userId: record.user_id, records: [] };
      groups[key].records.push(record);
    });

    // Inject virtual groups for day-offs / justifications when no clock records exist
    const ensureVirtual = (userId: string, date: string) => {
      const key = groupKey(userId, date);
      if (!groups[key]) groups[key] = { date, userId, records: [] };
    };
    daysOff.forEach(d => ensureVirtual(d.user_id, d.off_date));
    justifications.forEach(j => ensureVirtual(j.user_id, j.reference_date));

    const dayOffMap = new Map<string, DayOff>();
    daysOff.forEach(d => dayOffMap.set(`${d.user_id}__${d.off_date}`, d));
    const justMap = new Map<string, Justification>();
    justifications.forEach(j => justMap.set(`${j.user_id}__${j.reference_date}`, j));

    return Object.values(groups).map(({ date, userId, records }) => {
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      const userSchedule = schedules[userId] || null;
      const metrics = records.length > 0
        ? calculateDayMetrics(records, userSchedule, dayOfWeek)
        : { workedMinutes: 0, breakMinutes: 0, delayMinutes: 0 };

      let status: TimeClockStatus = 'pendente';
      const entrada = records.find(r => r.clock_type === 'entrada');
      const saida = records.find(r => r.clock_type === 'saida');
      if (entrada && saida) {
        status = records.some(r => r.status === 'ajustado') ? 'ajustado' : 'completo';
      } else if (entrada) {
        status = 'incompleto';
      }

      // Override por folga / justificativa
      const off = dayOffMap.get(`${userId}__${date}`);
      const just = justMap.get(`${userId}__${date}`);
      let overrideLabel: string | undefined;
      let overrideTone: string | undefined;
      if (off && !off.is_partial_day) {
        overrideLabel = offTypeLabels[off.off_type] || 'Folga';
        overrideTone = 'bg-purple-100 text-purple-800';
        status = 'completo';
      } else if (just && records.length === 0) {
        overrideLabel = justTypeLabels[just.justification_type] || 'Justificado';
        overrideTone = 'bg-blue-100 text-blue-800';
        status = 'completo';
      } else if (off && off.is_partial_day) {
        overrideLabel = `${offTypeLabels[off.off_type] || 'Folga'} parcial`;
        overrideTone = 'bg-purple-50 text-purple-700';
      }

      return {
        date,
        records,
        totalMinutes: metrics.workedMinutes,
        breakMinutes: metrics.breakMinutes,
        delayMinutes: metrics.delayMinutes,
        status,
        userName: showAllUsers ? (userNameMap[userId] || 'Desconhecido') : undefined,
        overrideLabel,
        overrideTone,
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
                        {group.overrideLabel ? (
                          <Badge className={group.overrideTone || 'bg-purple-100 text-purple-800'}>
                            {group.overrideLabel}
                          </Badge>
                        ) : (
                          <Badge className={statusColors[group.status]}>
                            {statusLabels[group.status]}
                          </Badge>
                        )}
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
