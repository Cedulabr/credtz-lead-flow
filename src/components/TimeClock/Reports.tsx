import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, Loader2, Clock, AlertTriangle, Calendar, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { calculateTotalBreakMinutes, parseTimeToMinutes, calculateDayMetrics, formatMinutesToHM, formatMinutesToHMCompact, type DaySchedule } from '@/lib/timeClockCalculations';

interface ReportRow {
  userId: string;
  userName: string;
  date: string;
  value: number;
  detail: string;
}

export function Reports() {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [reportType, setReportType] = useState('delays');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [reportData, setReportData] = useState<ReportRow[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    generateReport();
  }, [selectedMonth, reportType, selectedUserId]);

  const loadUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, name, email').eq('is_active', true).order('name');
    if (data) {
      setUsers(data.map(u => ({ id: u.id, name: u.name || u.email?.split('@')[0] || 'Sem nome' })));
    }
  };

  const generateReport = async () => {
    setLoading(true);
    const startDate = `${selectedMonth}-01`;
    const endDate = format(endOfMonth(parseISO(startDate)), 'yyyy-MM-dd');

    // Load records
    let query = supabase.from('time_clock').select('*')
      .gte('clock_date', startDate).lte('clock_date', endDate)
      .order('clock_date', { ascending: true }).order('clock_time', { ascending: true });

    if (selectedUserId !== 'all') {
      query = query.eq('user_id', selectedUserId);
    }

    const [recordsRes, schedulesRes] = await Promise.all([
      query,
      supabase.from('time_clock_schedules').select('*').eq('is_active', true),
    ]);

    const records = recordsRes.data || [];
    const scheduleMap: Record<string, DaySchedule> = {};
    schedulesRes.data?.forEach((s: any) => {
      scheduleMap[s.user_id] = {
        entry_time: s.entry_time || '08:00',
        exit_time: s.exit_time || '18:00',
        lunch_start: s.lunch_start,
        lunch_end: s.lunch_end,
        daily_hours: s.daily_hours || 8,
        tolerance_minutes: s.tolerance_minutes || 10,
        work_days: s.work_days || [1, 2, 3, 4, 5],
      };
    });

    // Group by user+date
    const groups: Record<string, any[]> = {};
    records.forEach(r => {
      const key = `${r.user_id}__${r.clock_date}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    const userNameMap: Record<string, string> = {};
    users.forEach(u => { userNameMap[u.id] = u.name; });

    const rows: ReportRow[] = [];

    Object.entries(groups).forEach(([key, dayRecords]) => {
      const [uid, date] = key.split('__');
      const dayOfWeek = new Date(date + 'T12:00:00').getDay();
      const schedule = scheduleMap[uid] || null;
      const metrics = calculateDayMetrics(dayRecords, schedule, dayOfWeek);
      const name = userNameMap[uid] || 'Desconhecido';

      if (reportType === 'delays' && metrics.delayMinutes > 0) {
        rows.push({ userId: uid, userName: name, date, value: metrics.delayMinutes, detail: `${metrics.delayMinutes}min de atraso` });
      } else if (reportType === 'breaks') {
        if (metrics.breakMinutes > 0) {
          rows.push({ userId: uid, userName: name, date, value: metrics.breakMinutes, detail: formatMinutesToHM(metrics.breakMinutes) });
        }
      } else if (reportType === 'overtime' && metrics.overtimeMinutes > 0) {
        rows.push({ userId: uid, userName: name, date, value: metrics.overtimeMinutes, detail: formatMinutesToHM(metrics.overtimeMinutes) });
      } else if (reportType === 'presence') {
        rows.push({ userId: uid, userName: name, date, value: metrics.workedMinutes, detail: metrics.status });
      }
    });

    // For presence report, also add absences
    if (reportType === 'presence') {
      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      const targetUsers = selectedUserId !== 'all' ? [selectedUserId] : users.map(u => u.id);

      targetUsers.forEach(uid => {
        const schedule = scheduleMap[uid] || null;
        const workDays = schedule?.work_days || [1, 2, 3, 4, 5];

        days.forEach(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayOfWeek = day.getDay();
          if (!workDays.includes(dayOfWeek)) return;
          if (day > new Date()) return;

          const hasRecord = rows.some(r => r.userId === uid && r.date === dateStr);
          if (!hasRecord) {
            rows.push({
              userId: uid,
              userName: userNameMap[uid] || 'Desconhecido',
              date: dateStr,
              value: 0,
              detail: 'absent',
            });
          }
        });
      });
    }

    setReportData(rows.sort((a, b) => a.date.localeCompare(b.date) || a.userName.localeCompare(b.userName)));
    setLoading(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const titles: Record<string, string> = {
      delays: 'Relatório de Atrasos',
      breaks: 'Relatório de Pausas',
      overtime: 'Relatório de Horas Extras',
      presence: 'Relatório de Presença Mensal',
    };

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(titles[reportType], 105, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${format(parseISO(`${selectedMonth}-01`), "MMMM 'de' yyyy", { locale: ptBR })}`, 105, 23, { align: 'center' });

    let yPos = 35;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Colaborador', 14, yPos);
    doc.text('Data', 70, yPos);
    doc.text('Detalhe', 100, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    reportData.forEach(row => {
      if (yPos > 275) { doc.addPage(); yPos = 15; }
      doc.text(row.userName.substring(0, 30), 14, yPos);
      doc.text(format(parseISO(row.date), 'dd/MM/yyyy'), 70, yPos);
      doc.text(row.detail, 100, yPos);
      yPos += 5;
    });

    // Total
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    const totalValue = reportData.reduce((acc, r) => acc + r.value, 0);
    doc.text(`Total: ${formatMinutesToHM(totalValue)}`, 14, yPos);

    doc.save(`relatorio-${reportType}-${selectedMonth}.pdf`);
    toast({ title: 'PDF exportado com sucesso!' });
  };

  const exportExcel = () => {
    const wsData = reportData.map(row => ({
      'Colaborador': row.userName,
      'Data': format(parseISO(row.date), 'dd/MM/yyyy'),
      'Valor (min)': row.value,
      'Detalhe': row.detail,
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `relatorio-${reportType}-${selectedMonth}.xlsx`);
    toast({ title: 'Excel exportado com sucesso!' });
  };

  const reportLabels: Record<string, { label: string; icon: any }> = {
    delays: { label: 'Atrasos', icon: Clock },
    breaks: { label: 'Pausas', icon: AlertTriangle },
    overtime: { label: 'Horas Extras', icon: Clock },
    presence: { label: 'Presença', icon: Calendar },
  };

  const statusBadge = (detail: string) => {
    const colors: Record<string, string> = {
      present: 'bg-green-100 text-green-800',
      late: 'bg-yellow-100 text-yellow-800',
      absent: 'bg-red-100 text-red-800',
      incomplete: 'bg-orange-100 text-orange-800',
      on_break: 'bg-blue-100 text-blue-800',
      weekend: 'bg-muted text-muted-foreground',
    };
    const labels: Record<string, string> = {
      present: 'Presente',
      late: 'Atrasado',
      absent: 'Falta',
      incomplete: 'Incompleto',
      on_break: 'Em Pausa',
      weekend: 'FDS',
    };
    if (colors[detail]) {
      return <Badge className={colors[detail]}>{labels[detail]}</Badge>;
    }
    return <span>{detail}</span>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios
            </CardTitle>
            <CardDescription>Relatórios avançados de ponto</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF} disabled={reportData.length === 0}>
              <Download className="h-4 w-4 mr-1" /> PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel} disabled={reportData.length === 0}>
              <Download className="h-4 w-4 mr-1" /> Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-1">
            <Label className="text-xs">Tipo</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(reportLabels).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mês</Label>
            <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-[180px]" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Colaborador</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reportData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum dado encontrado para os filtros selecionados.</p>
          </div>
        ) : (
          <>
            <div className="flex gap-4 text-sm">
              <Badge variant="outline">{reportData.length} registros</Badge>
              <Badge variant="outline">
                Total: {formatMinutesToHM(reportData.reduce((acc, r) => acc + r.value, 0))}
              </Badge>
            </div>
            <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Detalhe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.userName}</TableCell>
                      <TableCell>{format(parseISO(row.date), 'dd/MM/yyyy (EEE)', { locale: ptBR })}</TableCell>
                      <TableCell>{reportType === 'presence' ? statusBadge(row.detail) : row.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
