import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Calculator, Loader2, TrendingDown, DollarSign, Clock, XCircle, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useGestorCompany } from '@/hooks/useGestorCompany';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, eachDayOfInterval, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatMinutesToHM } from '@/lib/timeClockCalculations';
import { evaluateDay, summarizePeriod, type DaySchedule, type DiscountMode, type DayOffType } from '@/lib/timeClockEngine';
import { computeRates } from '@/lib/payrollCalculations';
import { getBrazilianHolidays } from './brazilianHolidays';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface DiscountRow {
  userId: string;
  userName: string;
  salary: number;
  dailyHours: number | null;
  monthlyHours: number;
  valorHora: number;
  scheduleConfigured: boolean;
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

    const [profilesRes, salariesRes, schedulesRes, recordsRes, dayOffsRes, justRes, hbSettingsRes] = await Promise.all([
      supabase.from('profiles').select('id, name, email').in('id', userIds).eq('is_active', true),
      (supabase as any).rpc('get_salaries_at', { p_user_ids: userIds, p_company_id: selectedCompanyId, p_date: endDate }),
      supabase.from('time_clock_schedules').select('*').in('user_id', userIds).eq('is_active', true),
      supabase.from('time_clock').select('*').in('user_id', userIds).gte('clock_date', startDate).lte('clock_date', endDate).order('clock_time', { ascending: true }),
      supabase.from('time_clock_day_offs').select('*').in('user_id', userIds).gte('off_date', startDate).lte('off_date', endDate),
      supabase.from('time_clock_justifications').select('*').in('user_id', userIds).gte('reference_date', startDate).lte('reference_date', endDate).eq('status', 'approved'),
      (supabase as any).from('hour_bank_settings').select('discount_mode').limit(1).maybeSingle(),
    ]);

    const discountMode: 'financeiro' | 'banco' | 'misto' = (hbSettingsRes?.data?.discount_mode as any) || 'financeiro';
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

    // Map de folgas por usuário/data (objeto bruto, com tipo e parcial)
    const dayOffByUser: Record<string, Record<string, any>> = {};
    dayOffsRes.data?.forEach((d: any) => {
      if (!dayOffByUser[d.user_id]) dayOffByUser[d.user_id] = {};
      dayOffByUser[d.user_id][d.off_date] = d;
    });

    const justByUser: Record<string, Set<string>> = {};
    justRes.data?.forEach((j: any) => {
      if (!justByUser[j.user_id]) justByUser[j.user_id] = new Set();
      justByUser[j.user_id].add(j.reference_date);
    });

    const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
    const now = new Date();

    // Feriados (DB + nacionais calculados)
    const periodYear = parseISO(startDate).getFullYear();
    const holidaySet = new Set(
      getBrazilianHolidays(periodYear)
        .map(h => h.date)
        .filter(d => d >= startDate && d <= endDate)
    );

    const result: DiscountRow[] = profiles.map(profile => {
      const uid = profile.id;
      const salary = salaryMap[uid] || 0;
      const schedule = scheduleMap[uid];
      const scheduleConfigured = !!schedule && Number(schedule.daily_hours) > 0;
      const workDays = schedule?.work_days || [1, 2, 3, 4, 5];
      // Sem fallback silencioso de 8h: usamos a jornada cadastrada ou marcamos como não-configurado.
      const dailyHours = scheduleConfigured ? Number(schedule.daily_hours) : null;
      const userRecords = recordsByUser[uid] || [];
      const userOffs = dayOffByUser[uid] || {};
      const userJusts = justByUser[uid] || new Set<string>();

      const sched: DaySchedule | null = scheduleConfigured ? {
        entry_time: schedule.entry_time,
        exit_time: schedule.exit_time,
        daily_hours: dailyHours as number,
        tolerance_minutes: schedule.tolerance_minutes ?? 10,
        work_days: workDays,
      } : null;

      const dayResults = days
        .filter(day => day <= now)
        .map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const off = userOffs[dateStr];
          let dayOff: { type: DayOffType; isPartial?: boolean; partialMinutes?: number } | null = null;
          if (off && off.off_type !== 'feriado') {
            let partialMinutes = 0;
            if (off.is_partial_day && off.start_time && off.end_time) {
              const [sh, sm] = String(off.start_time).split(':').map(Number);
              const [eh, em] = String(off.end_time).split(':').map(Number);
              partialMinutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
            }
            dayOff = { type: off.off_type, isPartial: !!off.is_partial_day, partialMinutes };
          }
          const isHoliday = holidaySet.has(dateStr) || off?.off_type === 'feriado';
          const dayRecords = userRecords
            .filter((r: any) => r.clock_date === dateStr)
            .map((r: any) => ({ clock_type: r.clock_type, clock_time: r.clock_time }));
          return evaluateDay(dayRecords as any, sched, day.getDay(), {
            isHoliday,
            dayOff,
            justified: userJusts.has(dateStr),
          }, discountMode as DiscountMode);
        });

      const summary = summarizePeriod(dayResults);
      const businessDays = dayResults.filter(d => d.expectedMinutes > 0).length || 22;
      const rates = computeRates(salary, dailyHours, businessDays);

      // Apenas faltas reais consomem dia integral; pendências/ajustes parciais
      // são contabilizados como horas negativas reais.
      const negativeMinutes = Math.max(
        0,
        summary.expected - summary.worked - summary.absences * (dailyHours ?? 0) * 60,
      );

      let discountNegativeHours = 0;
      let discountAbsences = 0;
      if (rates.configured) {
        if (discountMode === 'financeiro') {
          discountNegativeHours = (negativeMinutes / 60) * rates.valorHora;
          discountAbsences = summary.absences * rates.valorDia;
        } else if (discountMode === 'misto') {
          discountAbsences = summary.absences * rates.valorDia;
        }
      }
      const totalDiscount = discountNegativeHours + discountAbsences;
      const netEstimated = Math.max(0, salary - totalDiscount);

      return {
        userId: uid,
        userName: profile.name || profile.email?.split('@')[0] || 'Sem nome',
        salary,
        dailyHours,
        monthlyHours: rates.monthlyHours,
        valorHora: rates.valorHora,
        scheduleConfigured: rates.configured,
        expectedMinutes: summary.expected,
        workedMinutes: summary.worked,
        negativeMinutes,
        absences: summary.absences,
        dayOffs: summary.dayOffs,
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
                Faltas × valor-dia + horas negativas × valor-hora · Valor-hora = Salário ÷ (Jornada × Dias úteis)
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
            <>
              {rows.some(r => !r.scheduleConfigured) && (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3 flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-amber-800 dark:text-amber-300">Atenção:</strong>{' '}
                    <span className="text-amber-800 dark:text-amber-200">
                      {rows.filter(r => !r.scheduleConfigured).length} colaborador(es) sem jornada cadastrada.
                      O desconto de horas negativas <u>não foi calculado</u> para essas linhas.
                      Cadastre a jornada em <em>Configurações &gt; Jornadas</em> antes de fechar a folha.
                    </span>
                  </div>
                </div>
              )}
              <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead className="text-right">Salário</TableHead>
                      <TableHead className="text-center">Jornada</TableHead>
                      <TableHead className="text-right">Valor/h</TableHead>
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
                      <TableRow key={row.userId} className={!row.scheduleConfigured ? 'bg-amber-50/60 dark:bg-amber-900/10' : ''}>
                        <TableCell className="font-medium">{row.userName}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.salary)}</TableCell>
                        <TableCell className="text-center">
                          {row.scheduleConfigured ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="cursor-help">{row.dailyHours}h/dia</Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Carga mensal: <strong>{row.monthlyHours}h</strong> ({row.dailyHours}h × {Math.round(row.monthlyHours / (row.dailyHours || 1))} dias úteis)
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
                              <AlertTriangle className="h-3 w-3 mr-1" /> Não configurada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.scheduleConfigured ? formatCurrency(row.valorHora) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
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
                        <TableCell className="text-right text-red-600">
                          {row.scheduleConfigured ? formatCurrency(row.discountNegativeHours) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {row.scheduleConfigured ? formatCurrency(row.discountAbsences) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-700">
                          {row.scheduleConfigured ? formatCurrency(row.totalDiscount) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-700">
                          {row.scheduleConfigured ? formatCurrency(row.netEstimated) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
