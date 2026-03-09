import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, TrendingUp, TrendingDown, Loader2, RefreshCw, Timer, AlertTriangle, ArrowDownUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGestorCompany } from '@/hooks/useGestorCompany';
import { format, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateTotalBreakMinutes, parseTimeToMinutes, formatMinutesToHM, calculateEarlyExitMinutes } from '@/lib/timeClockCalculations';
import { useToast } from '@/hooks/use-toast';
import type { MonthBalance } from './types';
import { HourBankEntries } from './HourBankEntries';
import { HourBankCompensation } from './HourBankCompensation';
import { HourBankSettingsPanel } from './HourBankSettings';
import { HourBankReport } from './HourBankReport';
import { HourBankCompanyOverview } from './HourBankCompanyOverview';
import { HourBankEmployeeAlert } from './HourBankEmployeeAlert';

export function HourBank() {
  const { user, isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [balances, setBalances] = useState<MonthBalance[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const isGestor = isAdmin || (profile as any)?.company_role === 'gestor';

  useEffect(() => {
    if (isGestor) {
      loadUsers();
    } else if (user) {
      setSelectedUserId(user.id);
    }
  }, [user, isGestor]);

  useEffect(() => {
    if (selectedUserId) loadBalances();
  }, [selectedUserId, selectedYear]);

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, name, email').eq('is_active', true).order('name');
    if (data) {
      const mapped = data.map(u => ({ id: u.id, name: u.name || u.email?.split('@')[0] || 'Sem nome' }));
      setUsers(mapped);
      if (!selectedUserId && user) setSelectedUserId(user.id);
    }
  };

  const loadBalances = useCallback(async () => {
    setLoading(true);
    const year = parseInt(selectedYear);

    const { data: scheduleData } = await supabase
      .from('time_clock_schedules').select('*').eq('user_id', selectedUserId).eq('is_active', true).single();

    const schedule = scheduleData;
    const workDays: number[] = (schedule as any)?.work_days || [1, 2, 3, 4, 5];
    const dailyHours: number = (schedule as any)?.daily_hours || 8;
    const toleranceMin: number = (schedule as any)?.tolerance_minutes || 10;
    const exitTime: string = (schedule as any)?.exit_time || '18:00';
    const entryTime: string = (schedule as any)?.entry_time || '08:00';

    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const [recordsRes, dayOffsRes, entriesRes] = await Promise.all([
      supabase.from('time_clock').select('*').eq('user_id', selectedUserId).gte('clock_date', startDate).lte('clock_date', endDate).order('clock_date').order('clock_time'),
      supabase.from('time_clock_day_offs').select('off_date').eq('user_id', selectedUserId).gte('off_date', startDate).lte('off_date', endDate),
      supabase.from('hour_bank_entries').select('*').eq('user_id', selectedUserId).gte('reference_month', `${year}-01`).lte('reference_month', `${year}-12`),
    ]);

    const allRecords = recordsRes.data || [];
    const dayOffDates = new Set((dayOffsRes.data || []).map((d: any) => d.off_date));
    const allEntries = entriesRes.data || [];

    const monthBalances: MonthBalance[] = [];

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = endOfMonth(monthStart);
      if (monthStart > new Date()) break;

      const monthStr = format(monthStart, 'yyyy-MM');
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd > new Date() ? new Date() : monthEnd });

      let workedMinutes = 0;
      let overtimeMinutes = 0;
      let delayMinutes = 0;
      let earlyExitMinutes = 0;
      let absenceCount = 0;

      const workDayCount = days.filter(d => {
        if (!workDays.includes(d.getDay())) return false;
        return !dayOffDates.has(format(d, 'yyyy-MM-dd'));
      }).length;
      const expectedMinutes = workDayCount * dailyHours * 60;

      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isWorkDay = workDays.includes(day.getDay()) && !dayOffDates.has(dateStr);
        const dayRecords = allRecords.filter((r: any) => r.clock_date === dateStr);
        const entry = dayRecords.find((r: any) => r.clock_type === 'entrada');
        const exit = dayRecords.find((r: any) => r.clock_type === 'saida');

        if (!isWorkDay) return;

        if (!entry) {
          absenceCount++;
          return;
        }

        if (entry && exit) {
          const entryMin = parseTimeToMinutes(entry.clock_time);
          const exitMin = parseTimeToMinutes(exit.clock_time);
          const breakMin = calculateTotalBreakMinutes(dayRecords);
          const dayWorked = Math.max(0, exitMin - entryMin - breakMin);
          workedMinutes += dayWorked;

          // Delay
          const scheduledEntryMin = parseTimeToMinutes(entryTime);
          const dayDelay = Math.max(0, entryMin - scheduledEntryMin - toleranceMin);
          delayMinutes += dayDelay;

          // Early exit
          const dayEarlyExit = calculateEarlyExitMinutes(exit.clock_time, exitTime, toleranceMin);
          earlyExitMinutes += dayEarlyExit;

          // Overtime
          const dailyExpected = dailyHours * 60;
          const dayOvertime = Math.max(0, dayWorked - dailyExpected);
          overtimeMinutes += dayOvertime;
        }
      });

      // Manual entries for this month
      const monthEntries = allEntries.filter((e: any) => e.reference_month === monthStr);
      const manualAdjustments = monthEntries
        .filter((e: any) => ['hora_extra', 'atraso', 'saida_antecipada', 'falta', 'ajuste_manual'].includes(e.entry_type))
        .reduce((sum: number, e: any) => sum + (e.minutes || 0), 0);
      const compensations = monthEntries
        .filter((e: any) => ['compensacao_folga', 'compensacao_pagamento', 'desconto_folha'].includes(e.entry_type))
        .reduce((sum: number, e: any) => sum + (e.minutes || 0), 0);

      const balanceMinutes = workedMinutes - expectedMinutes + manualAdjustments + compensations;

      monthBalances.push({
        month: monthStr,
        monthLabel: format(monthStart, 'MMMM yyyy', { locale: ptBR }),
        expectedMinutes,
        workedMinutes,
        balanceMinutes,
        overtimeMinutes,
        delayMinutes,
        earlyExitMinutes,
        absenceCount,
        manualAdjustmentsMinutes: manualAdjustments,
        compensationsMinutes: compensations,
        status: 'open',
      });
    }

    setBalances(monthBalances);
    setLoading(false);
  }, [selectedUserId, selectedYear]);

  const recalculateAndPersist = async () => {
    setRecalculating(true);
    await loadBalances();

    // Persist each month to time_clock_hour_bank
    for (const b of balances) {
      await supabase.from('time_clock_hour_bank').upsert({
        user_id: selectedUserId,
        reference_month: b.month,
        expected_minutes: b.expectedMinutes,
        worked_minutes: b.workedMinutes,
        balance_minutes: b.balanceMinutes,
        overtime_minutes: b.overtimeMinutes,
        delay_minutes: b.delayMinutes,
        early_exit_minutes: b.earlyExitMinutes,
        absence_count: b.absenceCount,
        manual_adjustments_minutes: b.manualAdjustmentsMinutes,
        compensations_minutes: b.compensationsMinutes,
      }, { onConflict: 'user_id,reference_month' });
    }

    toast({ title: 'Banco de horas recalculado e salvo!' });
    setRecalculating(false);
  };

  const totalBalance = balances.reduce((acc, b) => acc + b.balanceMinutes, 0);
  const totalOvertime = balances.reduce((acc, b) => acc + b.overtimeMinutes, 0);
  const totalDelay = balances.reduce((acc, b) => acc + b.delayMinutes, 0);
  const totalCompensations = balances.reduce((acc, b) => acc + Math.abs(b.compensationsMinutes), 0);
  const years = Array.from({ length: 3 }, (_, i) => (new Date().getFullYear() - i).toString());

  const selectedUserName = users.find(u => u.id === selectedUserId)?.name || 'Colaborador';

  const userSelector = (
    <div className="flex gap-2 flex-wrap">
      {isGestor && users.length > 0 && (
        <Select value={selectedUserId} onValueChange={setSelectedUserId}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
        </Select>
      )}
      <Select value={selectedYear} onValueChange={setSelectedYear}>
        <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
        <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Employee Alert */}
      {!isGestor && <HourBankEmployeeAlert />}

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className={totalBalance >= 0 ? 'border-green-200' : 'border-red-200'}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Saldo Acumulado</p>
                <p className={`text-xl font-bold ${totalBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {totalBalance >= 0 ? '+' : '-'}{formatMinutesToHM(Math.abs(totalBalance))}
                </p>
              </div>
              {totalBalance >= 0 ? <TrendingUp className="h-6 w-6 text-green-500" /> : <TrendingDown className="h-6 w-6 text-red-500" />}
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Horas Extras</p>
                <p className="text-xl font-bold text-green-700">+{formatMinutesToHM(totalOvertime)}</p>
              </div>
              <Timer className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Atrasos</p>
                <p className="text-xl font-bold text-red-700">-{formatMinutesToHM(totalDelay)}</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Compensações</p>
                <p className="text-xl font-bold text-purple-700">{formatMinutesToHM(totalCompensations)}</p>
              </div>
              <ArrowDownUp className="h-6 w-6 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Sub-tabs */}
      <Tabs defaultValue="resumo">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className={`grid w-full ${isGestor ? 'grid-cols-6' : 'grid-cols-2'}`}>
            <TabsTrigger value="resumo" className="text-xs">Resumo</TabsTrigger>
            <TabsTrigger value="historico" className="text-xs">Histórico</TabsTrigger>
            {isGestor && <TabsTrigger value="gestao" className="text-xs">Gestão</TabsTrigger>}
            {isGestor && <TabsTrigger value="lancamentos" className="text-xs">Lançamentos</TabsTrigger>}
            {isGestor && <TabsTrigger value="compensacoes" className="text-xs">Compensações</TabsTrigger>}
            {isGestor && <TabsTrigger value="config" className="text-xs">Regras</TabsTrigger>}
          </TabsList>
          {userSelector}
        </div>

        {/* RESUMO */}
        <TabsContent value="resumo">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-5 w-5" /> Banco de Horas Mensal</CardTitle>
                  <CardDescription>Saldo mensal detalhado</CardDescription>
                </div>
                <div className="flex gap-2">
                  <HourBankReport balances={balances} userName={selectedUserName} year={selectedYear} />
                  {isGestor && (
                    <Button variant="outline" size="sm" onClick={recalculateAndPersist} disabled={recalculating}>
                      {recalculating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                      Recalcular
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : balances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Clock className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>Nenhum dado encontrado.</p></div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mês</TableHead>
                        <TableHead>Esperadas</TableHead>
                        <TableHead>Trabalhadas</TableHead>
                        <TableHead>Extras</TableHead>
                        <TableHead>Atrasos</TableHead>
                        <TableHead>Saída Ant.</TableHead>
                        <TableHead>Faltas</TableHead>
                        <TableHead>Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balances.map(b => (
                        <TableRow key={b.month}>
                          <TableCell className="font-medium capitalize">{b.monthLabel}</TableCell>
                          <TableCell>{formatMinutesToHM(b.expectedMinutes)}</TableCell>
                          <TableCell>{formatMinutesToHM(b.workedMinutes)}</TableCell>
                          <TableCell className="text-green-700">{b.overtimeMinutes > 0 ? `+${formatMinutesToHM(b.overtimeMinutes)}` : '-'}</TableCell>
                          <TableCell className="text-red-700">{b.delayMinutes > 0 ? `-${formatMinutesToHM(b.delayMinutes)}` : '-'}</TableCell>
                          <TableCell className="text-orange-700">{b.earlyExitMinutes > 0 ? `-${formatMinutesToHM(b.earlyExitMinutes)}` : '-'}</TableCell>
                          <TableCell>{b.absenceCount > 0 ? b.absenceCount : '-'}</TableCell>
                          <TableCell>
                            <Badge className={b.balanceMinutes >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {b.balanceMinutes >= 0 ? '+' : '-'}{formatMinutesToHM(Math.abs(b.balanceMinutes))}
                            </Badge>
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

        {/* HISTÓRICO */}
        <TabsContent value="historico">
          <HourBankEntries users={users} selectedUserId={selectedUserId} onEntryAdded={loadBalances} />
        </TabsContent>

        {/* GESTÃO (admin/gestor only) */}
        {isGestor && (
          <TabsContent value="gestao">
            <HourBankCompanyOverview />
          </TabsContent>
        )}

        {/* LANÇAMENTOS (admin only) */}
        {isGestor && (
          <TabsContent value="lancamentos">
            <HourBankEntries users={users} selectedUserId={selectedUserId} onEntryAdded={loadBalances} />
          </TabsContent>
        )}

        {/* COMPENSAÇÕES (admin only) */}
        {isGestor && (
          <TabsContent value="compensacoes">
            <HourBankCompensation users={users} selectedUserId={selectedUserId} currentBalance={totalBalance} onCompensationAdded={loadBalances} />
          </TabsContent>
        )}

        {/* CONFIG (admin only) */}
        {isGestor && (
          <TabsContent value="config">
            <HourBankSettingsPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
