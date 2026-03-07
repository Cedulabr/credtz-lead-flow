import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateTotalBreakMinutes, parseTimeToMinutes, formatMinutesToHM } from '@/lib/timeClockCalculations';

interface MonthBalance {
  month: string;
  monthLabel: string;
  expectedMinutes: number;
  workedMinutes: number;
  balanceMinutes: number;
}

export function HourBank() {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState<MonthBalance[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    } else if (user) {
      setSelectedUserId(user.id);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (selectedUserId) {
      loadBalances();
    }
  }, [selectedUserId, selectedYear]);

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, name, email').eq('is_active', true).order('name');
    if (data) {
      setUsers(data.map(u => ({ id: u.id, name: u.name || u.email?.split('@')[0] || 'Sem nome' })));
      if (data.length > 0 && !selectedUserId) {
        setSelectedUserId(user?.id || data[0].id);
      }
    }
  };

  const loadBalances = async () => {
    setLoading(true);
    const year = parseInt(selectedYear);
    const monthBalances: MonthBalance[] = [];

    // Load schedule
    const { data: scheduleData } = await supabase
      .from('time_clock_schedules')
      .select('*')
      .eq('user_id', selectedUserId)
      .eq('is_active', true)
      .single();

    const schedule = scheduleData;
    const workDays = schedule?.work_days || [1, 2, 3, 4, 5];
    const dailyHours = schedule?.daily_hours || 8;

    // Load all records for the year
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    const { data: records } = await supabase
      .from('time_clock')
      .select('*')
      .eq('user_id', selectedUserId)
      .gte('clock_date', startDate)
      .lte('clock_date', endDate)
      .order('clock_date', { ascending: true })
      .order('clock_time', { ascending: true });

    const allRecords = records || [];

    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = endOfMonth(monthStart);
      
      // Don't show future months
      if (monthStart > new Date()) break;

      const monthStr = format(monthStart, 'yyyy-MM');
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd > new Date() ? new Date() : monthEnd });
      
      const workDayCount = days.filter(d => workDays.includes(d.getDay())).length;
      const expectedMinutes = workDayCount * dailyHours * 60;

      let workedMinutes = 0;

      days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRecords = allRecords.filter(r => r.clock_date === dateStr);
        const entry = dayRecords.find(r => r.clock_type === 'entrada');
        const exit = dayRecords.find(r => r.clock_type === 'saida');

        if (entry && exit) {
          const entryMin = parseTimeToMinutes(entry.clock_time);
          const exitMin = parseTimeToMinutes(exit.clock_time);
          const breakMin = calculateTotalBreakMinutes(dayRecords);
          workedMinutes += Math.max(0, exitMin - entryMin - breakMin);
        }
      });

      monthBalances.push({
        month: monthStr,
        monthLabel: format(monthStart, 'MMMM yyyy', { locale: ptBR }),
        expectedMinutes,
        workedMinutes,
        balanceMinutes: workedMinutes - expectedMinutes,
      });
    }

    setBalances(monthBalances);
    setLoading(false);
  };

  const totalBalance = balances.reduce((acc, b) => acc + b.balanceMinutes, 0);
  const years = Array.from({ length: 3 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <div className="space-y-6">
      {/* Accumulated balance card */}
      <Card className={totalBalance >= 0 ? 'border-green-200' : 'border-red-200'}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Saldo Acumulado</p>
              <p className={`text-3xl font-bold ${totalBalance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {totalBalance >= 0 ? '+' : '-'}{formatMinutesToHM(Math.abs(totalBalance))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totalBalance >= 0 ? 'Horas a compensar' : 'Horas devidas'}
              </p>
            </div>
            {totalBalance >= 0 ? (
              <TrendingUp className="h-10 w-10 text-green-500" />
            ) : (
              <TrendingDown className="h-10 w-10 text-red-500" />
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Banco de Horas
              </CardTitle>
              <CardDescription>Saldo mensal de horas trabalhadas vs esperadas</CardDescription>
            </div>
            <div className="flex gap-2">
              {isAdmin && users.length > 0 && (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(y => (
                    <SelectItem key={y} value={y}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : balances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum dado encontrado para o período.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead>Horas Esperadas</TableHead>
                    <TableHead>Horas Trabalhadas</TableHead>
                    <TableHead>Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((balance) => (
                    <TableRow key={balance.month}>
                      <TableCell className="font-medium capitalize">{balance.monthLabel}</TableCell>
                      <TableCell>{formatMinutesToHM(balance.expectedMinutes)}</TableCell>
                      <TableCell>{formatMinutesToHM(balance.workedMinutes)}</TableCell>
                      <TableCell>
                        <Badge className={balance.balanceMinutes >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {balance.balanceMinutes >= 0 ? '+' : '-'}{formatMinutesToHM(Math.abs(balance.balanceMinutes))}
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
    </div>
  );
}
