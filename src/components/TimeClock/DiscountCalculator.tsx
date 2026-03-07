import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Calculator, Loader2, TrendingDown, DollarSign, Clock, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useGestorCompany } from '@/hooks/useGestorCompany';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, eachDayOfInterval, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateTotalBreakMinutes, parseTimeToMinutes, formatMinutesToHM } from '@/lib/timeClockCalculations';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface DiscountRow {
  userId: string;
  userName: string;
  salary: number;
  expectedMinutes: number;
  workedMinutes: number;
  negativeMinutes: number;
  absences: number;
  dayOffs: number;
  discountNegativeHours: number;
  discountAbsences: number;
  totalDiscount: number;
  netEstimated: number;
}

export function DiscountCalculator() {
  const { companyId, isGestor, isAdmin, loading: gestorLoading } = useGestorCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [rows, setRows] = useState<DiscountRow[]>([]);

  useEffect(() => {
    if (gestorLoading) return;
    if (isGestor && companyId) {
      setCompanies([{ id: companyId, name: 'Minha Empresa' }]);
      setSelectedCompanyId(companyId);
    } else if (isAdmin) {
      (async () => {
        const { data } = await supabase.from('companies').select('id, name').order('name');
        if (data && data.length > 0) {
          setCompanies(data);
          setSelectedCompanyId(data[0].id);
        }
      })();
    }
  }, [gestorLoading, companyId, isGestor, isAdmin]);

  useEffect(() => {
    if (selectedCompanyId && selectedMonth) {
      calculate();
    }
  }, [selectedCompanyId, selectedMonth]);

  const calculate = async () => {
    setLoading(true);

    // 1. Get company users
    const { data: ucData } = await supabase
      .from('user_companies')
      .select('user_id')
      .eq('company_id', selectedCompanyId)
      .eq('is_active', true);

    const userIds = ucData?.map(u => u.user_id) || [];
    if (userIds.length === 0) { setRows([]); setLoading(false); return; }

    // 2. Parallel queries
    const startDate = `${selectedMonth}-01`;
    const endDate = format(endOfMonth(parseISO(startDate)), 'yyyy-MM-dd');

    const [profilesRes, salariesRes, schedulesRes, recordsRes, dayOffsRes, justRes] = await Promise.all([
      supabase.from('profiles').select('id, name, email').in('id', userIds).eq('is_active', true),
      supabase.from('employee_salaries').select('*').in('user_id', userIds).eq('is_active', true),
      supabase.from('time_clock_schedules').select('*').in('user_id', userIds).eq('is_active', true),
      supabase.from('time_clock').select('*').in('user_id', userIds).gte('clock_date', startDate).lte('clock_date', endDate).order('clock_time', { ascending: true }),
      supabase.from('time_clock_day_offs').select('*').in('user_id', userIds).gte('off_date', startDate).lte('off_date', endDate),
      supabase.from('time_clock_justifications').select('*').in('user_id', userIds).gte('reference_date', startDate).lte('reference_date', endDate).eq('status', 'approved'),
    ]);

    const profiles = profilesRes.data || [];
    const salaryMap: Record<string, number> = {};
    salariesRes.data?.forEach((s: any) => { salaryMap[s.user_id] = Number(s.base_salary) || 0; });

    const scheduleMap: Record<string, any> = {};
    schedulesRes.data?.forEach((s: any) => { scheduleMap[s.user_id] = s; });

    const recordsByUser: Record<string, any[]> = {};
    recordsRes.data?.forEach((r: any) => {
      if (!recordsByUser[r.user_id]) recordsByUser[r.user_id] = [];
      recordsByUser[r.user_id].push(r);
    });

    const dayOffsByUser: Record<string, Set<string>> = {};
    dayOffsRes.data?.forEach((d: any) => {
      if (!dayOffsByUser[d.user_id]) dayOffsByUser[d.user_id] = new Set();
      dayOffsByUser[d.user_id].add(d.off_date);
    });

    const justByUser: Record<string, Set<string>> = {};
    justRes.data?.forEach((j: any) => {
      if (!justByUser[j.user_id]) justByUser[j.user_id] = new Set();
      justByUser[j.user_id].add(j.reference_date);
    });

    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    const now = new Date();

    const result: DiscountRow[] = profiles.map(profile => {
      const uid = profile.id;
      const salary = salaryMap[uid] || 0;
      const schedule = scheduleMap[uid];
      const workDays = schedule?.work_days || [1, 2, 3, 4, 5];
      const dailyHours = schedule?.daily_hours || 8;
      const userRecords = recordsByUser[uid] || [];
      const userDayOffs = dayOffsByUser[uid] || new Set();
      const userJustifications = justByUser[uid] || new Set();

      let expectedMinutes = 0;
      let workedMinutes = 0;
      let absences = 0;
      let dayOffCount = 0;

      days.forEach(day => {
        if (day > now) return;
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayOfWeek = day.getDay();
        const isWorkDay = workDays.includes(dayOfWeek);

        if (!isWorkDay) return;

        // Check if it's a day off
        if (userDayOffs.has(dateStr)) {
          dayOffCount++;
          return; // Don't count as expected
        }

        expectedMinutes += dailyHours * 60;

        const dayRecords = userRecords.filter(r => r.clock_date === dateStr);
        const entry = dayRecords.find(r => r.clock_type === 'entrada');
        const exit = dayRecords.find(r => r.clock_type === 'saida');

        if (entry && exit) {
          const entryMin = parseTimeToMinutes(entry.clock_time);
          const exitMin = parseTimeToMinutes(exit.clock_time);
          const breakMin = calculateTotalBreakMinutes(dayRecords);
          workedMinutes += Math.max(0, exitMin - entryMin - breakMin);
        } else if (!entry) {
          // No entry - check justification
          if (!userJustifications.has(dateStr)) {
            absences++;
          }
        }
      });

      const negativeMinutes = Math.max(0, expectedMinutes - workedMinutes);
      const hourRate = salary > 0 ? salary / 176 : 0;
      const discountNegativeHours = (negativeMinutes / 60) * hourRate;
      const dailyRate = salary > 0 ? salary / 22 : 0;
      const discountAbsences = absences * dailyRate;
      const totalDiscount = discountNegativeHours + discountAbsences;
      const netEstimated = Math.max(0, salary - totalDiscount);

      return {
        userId: uid,
        userName: profile.name || profile.email?.split('@')[0] || 'Sem nome',
        salary,
        expectedMinutes,
        workedMinutes,
        negativeMinutes,
        absences,
        dayOffs: dayOffCount,
        discountNegativeHours,
        discountAbsences,
        totalDiscount,
        netEstimated,
      };
    });

    setRows(result.sort((a, b) => a.userName.localeCompare(b.userName)));
    setLoading(false);
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totals = rows.reduce(
    (acc, r) => ({
      absences: acc.absences + r.absences,
      negativeMin: acc.negativeMin + r.negativeMinutes,
      totalDiscount: acc.totalDiscount + r.totalDiscount,
    }),
    { absences: 0, negativeMin: 0, totalDiscount: 0 }
  );

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório de Descontos', pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${format(parseISO(`${selectedMonth}-01`), "MMMM 'de' yyyy", { locale: ptBR })}`, pageWidth / 2, 23, { align: 'center' });

    let yPos = 35;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('Colaborador', 14, yPos);
    doc.text('Salário', 60, yPos);
    doc.text('H. Esperadas', 85, yPos);
    doc.text('H. Trabalhadas', 110, yPos);
    doc.text('H. Negativas', 140, yPos);
    doc.text('Faltas', 165, yPos);
    doc.text('Folgas', 180, yPos);
    doc.text('Desc. Horas', 195, yPos);
    doc.text('Desc. Faltas', 220, yPos);
    doc.text('Total Desc.', 245, yPos);
    doc.text('Líquido Est.', 268, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    rows.forEach(row => {
      if (yPos > 190) { doc.addPage('landscape'); yPos = 15; }
      doc.text(row.userName.substring(0, 25), 14, yPos);
      doc.text(formatCurrency(row.salary), 60, yPos);
      doc.text(formatMinutesToHM(row.expectedMinutes), 85, yPos);
      doc.text(formatMinutesToHM(row.workedMinutes), 110, yPos);
      doc.text(formatMinutesToHM(row.negativeMinutes), 140, yPos);
      doc.text(String(row.absences), 165, yPos);
      doc.text(String(row.dayOffs), 180, yPos);
      doc.text(formatCurrency(row.discountNegativeHours), 195, yPos);
      doc.text(formatCurrency(row.discountAbsences), 220, yPos);
      doc.text(formatCurrency(row.totalDiscount), 245, yPos);
      doc.text(formatCurrency(row.netEstimated), 268, yPos);
      yPos += 5;
    });

    doc.save(`descontos-${selectedMonth}.pdf`);
    toast({ title: 'PDF exportado!' });
  };

  const exportExcel = () => {
    const wsData = rows.map(row => ({
      'Colaborador': row.userName,
      'Salário': row.salary,
      'H. Esperadas': formatMinutesToHM(row.expectedMinutes),
      'H. Trabalhadas': formatMinutesToHM(row.workedMinutes),
      'H. Negativas': formatMinutesToHM(row.negativeMinutes),
      'Faltas': row.absences,
      'Folgas': row.dayOffs,
      'Desc. Horas Negativas': row.discountNegativeHours,
      'Desc. Faltas': row.discountAbsences,
      'Total Descontos': row.totalDiscount,
      'Líquido Estimado': row.netEstimated,
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Descontos');
    XLSX.writeFile(wb, `descontos-${selectedMonth}.xlsx`);
    toast({ title: 'Excel exportado!' });
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Horas Negativas (total)</p>
                <p className="text-2xl font-bold text-red-700">{formatMinutesToHM(totals.negativeMin)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Faltas Injustificadas</p>
                <p className="text-2xl font-bold text-orange-700">{totals.absences}</p>
              </div>
              <XCircle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Descontos</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(totals.totalDiscount)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Calculadora de Descontos
              </CardTitle>
              <CardDescription>
                Horas negativas × (salário / 176) + faltas × (salário / 22)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportPDF} disabled={rows.length === 0}>
                <Download className="h-4 w-4 mr-1" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportExcel} disabled={rows.length === 0}>
                <Download className="h-4 w-4 mr-1" /> Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {isAdmin && companies.length > 1 && (
              <div className="space-y-1">
                <Label className="text-xs">Empresa</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Mês</Label>
              <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-[180px]" />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum colaborador encontrado para esta empresa.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead className="text-right">Salário</TableHead>
                    <TableHead className="text-right">H. Esperadas</TableHead>
                    <TableHead className="text-right">H. Trabalhadas</TableHead>
                    <TableHead className="text-right">H. Negativas</TableHead>
                    <TableHead className="text-center">Faltas</TableHead>
                    <TableHead className="text-center">Folgas</TableHead>
                    <TableHead className="text-right">Desc. Horas</TableHead>
                    <TableHead className="text-right">Desc. Faltas</TableHead>
                    <TableHead className="text-right">Total Desc.</TableHead>
                    <TableHead className="text-right">Líquido Est.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell className="font-medium">{row.userName}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.salary)}</TableCell>
                      <TableCell className="text-right">{formatMinutesToHM(row.expectedMinutes)}</TableCell>
                      <TableCell className="text-right">{formatMinutesToHM(row.workedMinutes)}</TableCell>
                      <TableCell className="text-right">
                        {row.negativeMinutes > 0 ? (
                          <span className="text-red-600 font-medium">{formatMinutesToHM(row.negativeMinutes)}</span>
                        ) : (
                          <span className="text-green-600">0h 0min</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.absences > 0 ? (
                          <Badge variant="destructive">{row.absences}</Badge>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-blue-100 text-blue-800">{row.dayOffs}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(row.discountNegativeHours)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(row.discountAbsences)}</TableCell>
                      <TableCell className="text-right font-bold text-red-700">{formatCurrency(row.totalDiscount)}</TableCell>
                      <TableCell className="text-right font-bold text-green-700">{formatCurrency(row.netEstimated)}</TableCell>
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
