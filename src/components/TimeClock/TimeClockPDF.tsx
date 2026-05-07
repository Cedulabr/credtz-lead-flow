import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileText, Loader2, Calendar, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { format, parseISO, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  evaluateDay,
  summarizePeriod,
  formatHM,
  dayStatusLabels,
  dayStatusColor,
  type DayResult,
  type DaySchedule,
} from '@/lib/timeClockEngine';

const NAVY: [number, number, number] = [10, 31, 68];
const BLUE: [number, number, number] = [59, 130, 246];
const WHITE: [number, number, number] = [255, 255, 255];

interface TimeClockPDFProps {
  userId?: string;
  userName?: string;
  companyName?: string;
  companyCNPJ?: string;
}

/** Normaliza para NFC e remove caracteres de controle invisíveis que quebram encoding em jsPDF. */
const safe = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  return String(v).normalize('NFC').replace(/[\u0000-\u001F\u007F]/g, '');
};

const dayNamesShort: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
};

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function TimeClockPDF({ userId, userName, companyName = 'Empresa', companyCNPJ }: TimeClockPDFProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('monthly');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { toast } = useToast();

  const drawHeader = (doc: jsPDF) => {
    const pw = doc.internal.pageSize.getWidth();
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pw, 28, 'F');
    doc.setFillColor(...BLUE);
    doc.rect(0, 28, pw, 1.5, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(safe('EASYN'), 14, 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(safe('Sistema Profissional de Controle de Ponto'), 14, 21);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(safe(companyName), pw - 14, 14, { align: 'right' });
    if (companyCNPJ) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(safe(`CNPJ: ${companyCNPJ}`), pw - 14, 21, { align: 'right' });
    }
  };

  const drawFooter = (doc: jsPDF, hash: string) => {
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const total = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setFillColor(...NAVY);
      doc.rect(0, ph - 12, pw, 12, 'F');
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(
        safe(`Easyn — Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} | Hash: ${hash.slice(0, 16)}…`),
        14, ph - 5
      );
      doc.text(safe(`Página ${i} de ${total}`), pw - 14, ph - 5, { align: 'right' });
    }
  };

  const drawSignatureArea = (doc: jsPDF, yPos: number) => {
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'italic');
    doc.text(
      safe('Declaro que as informações acima são verdadeiras e conferem com meu registro de ponto.'),
      pw / 2, yPos, { align: 'center' }
    );
    yPos += 14;
    doc.setDrawColor(0, 0, 0);
    doc.line(20, yPos, 100, yPos);
    doc.line(pw - 100, yPos, pw - 20, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(safe('Assinatura do Colaborador'), 60, yPos + 5, { align: 'center' });
    doc.text(safe('Assinatura do Gestor / RH'), pw - 60, yPos + 5, { align: 'center' });
    doc.text(safe('Data: ___/___/______'), 60, yPos + 11, { align: 'center' });
    doc.text(safe('Data: ___/___/______'), pw - 60, yPos + 11, { align: 'center' });
  };

  // ==================== MENSAL ====================
  const generateMonthlyPDF = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedMonth}-01`;
      const endDate = format(endOfMonth(parseISO(startDate)), 'yyyy-MM-dd');

      const [recordsRes, justRes, scheduleRes, profileRes, salaryRes, dayOffsRes, holidaysRes] = await Promise.all([
        supabase.from('time_clock').select('*').eq('user_id', userId)
          .gte('clock_date', startDate).lte('clock_date', endDate)
          .order('clock_date').order('clock_time'),
        supabase.from('time_clock_justifications').select('*').eq('user_id', userId)
          .gte('reference_date', startDate).lte('reference_date', endDate),
        supabase.from('time_clock_schedules').select('*').eq('user_id', userId).eq('is_active', true).maybeSingle(),
        supabase.from('profiles').select('name, email, cpf, role').eq('id', userId).maybeSingle(),
        supabase.from('employee_salaries').select('*').eq('user_id', userId).eq('is_active', true).maybeSingle(),
        supabase.from('time_clock_day_offs').select('off_date, off_type').eq('user_id', userId)
          .gte('off_date', startDate).lte('off_date', endDate),
        (supabase as any).from("brazilian_holidays").select('holiday_date').gte('holiday_date', startDate).lte('holiday_date', endDate),
      ]);

      const records = recordsRes.data || [];
      const justifications = justRes.data || [];
      const schedule = scheduleRes.data as any;
      const profile = profileRes.data as any;
      const salary = salaryRes.data as any;
      const dayOffMap: Record<string, string> = {};
      (dayOffsRes.data || []).forEach((d: any) => { dayOffMap[d.off_date] = d.off_type; });
      const holidaySet = new Set((holidaysRes.data || []).map((h: any) => h.holiday_date));

      const sched: DaySchedule | null = schedule
        ? {
            entry_time: schedule.entry_time,
            exit_time: schedule.exit_time,
            daily_hours: Number(schedule.daily_hours),
            tolerance_minutes: schedule.tolerance_minutes ?? 10,
            work_days: schedule.work_days ?? [1, 2, 3, 4, 5],
          }
        : null;

      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      const dayResults: { date: Date; result: DayResult; obs: string }[] = days.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRecords = records
          .filter((r: any) => r.clock_date === dateStr)
          .map((r: any) => ({ clock_type: r.clock_type, clock_time: r.clock_time }));
        const isHoliday = holidaySet.has(dateStr);
        const result = evaluateDay(dayRecords, sched, day.getDay(), isHoliday);
        const off = dayOffMap[dateStr];
        const just = justifications.find((j: any) => j.reference_date === dateStr);
        let obs = '';
        if (off) obs = off.toUpperCase();
        else if (just) obs = `${(just as any).status === 'approved' ? '✓' : (just as any).status === 'rejected' ? '✗' : '⏳'} ${(just as any).justification_type}`;
        else if (result.inconsistencies.length > 0) obs = result.inconsistencies.map(i => i.message).join(' • ');
        return { date: day, result, obs };
      });

      const summary = summarizePeriod(dayResults.map(d => d.result));

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw = doc.internal.pageSize.getWidth();
      drawHeader(doc);

      // Título e info
      let yPos = 36;
      doc.setTextColor(...NAVY);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(safe('ESPELHO DE PONTO MENSAL'), pw / 2, yPos, { align: 'center' });

      yPos += 7;
      doc.setFontSize(8.5);
      const periodoLabel = format(parseISO(startDate), "MMMM 'de' yyyy", { locale: ptBR });
      const cargoText = salary?.cargo || (profile?.role === 'admin' ? 'Administrador' : 'Colaborador');
      const cpfFormatted = profile?.cpf ? profile.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '-';
      const jornadaTxt = schedule
        ? `${String(schedule.entry_time).slice(0, 5)} às ${String(schedule.exit_time).slice(0, 5)} — ${schedule.daily_hours}h/dia`
        : 'Não definida';

      const infoLines = [
        [`Colaborador: ${userName || profile?.name || '-'}`, `Cargo: ${cargoText}`, `Período: ${periodoLabel.charAt(0).toUpperCase() + periodoLabel.slice(1)}`],
        [`CPF: ${cpfFormatted}`, `Jornada: ${jornadaTxt}`, `Empresa: ${companyName}`],
      ];
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      infoLines.forEach((line) => {
        doc.text(safe(line[0]), 14, yPos);
        doc.text(safe(line[1]), pw / 2 - 30, yPos);
        doc.text(safe(line[2]), pw - 14, yPos, { align: 'right' });
        yPos += 5;
      });

      yPos += 2;

      // Tabela
      const head = [['Data', 'Dia', 'Entrada', 'Saída', 'Intervalo', 'Trab.', 'Atraso', 'Extra', 'Banco', 'Status', 'Observações']];
      const body = dayResults.map(({ date, result, obs }) => {
        const entries = records.filter((r: any) => r.clock_date === format(date, 'yyyy-MM-dd'));
        const entry = entries.find((r: any) => r.clock_type === 'entrada');
        const exit = entries.find((r: any) => r.clock_type === 'saida');
        const fmtTime = (r: any) => {
          if (!r) return '-';
          const t = r.clock_time;
          return t.includes('T') ? format(parseISO(t), 'HH:mm') : String(t).slice(0, 5);
        };
        return [
          format(date, 'dd/MM/yyyy'),
          dayNamesShort[date.getDay()],
          fmtTime(entry),
          fmtTime(exit),
          result.breakMinutes > 0 ? formatHM(result.breakMinutes) : '-',
          result.workedMinutes > 0 ? formatHM(result.workedMinutes) : '-',
          result.delayMinutes > 0 ? formatHM(result.delayMinutes) : '-',
          result.overtimeMinutes > 0 ? formatHM(result.overtimeMinutes) : '-',
          result.bankBalanceMinutes !== 0 ? formatHM(result.bankBalanceMinutes) : '-',
          dayStatusLabels[result.status],
          safe(obs).slice(0, 60),
        ];
      });

      autoTable(doc, {
        head,
        body,
        startY: yPos,
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.5, textColor: [30, 30, 30] },
        headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8, halign: 'center' },
        columnStyles: {
          0: { halign: 'center', cellWidth: 22 },
          1: { halign: 'center', cellWidth: 14 },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'center', cellWidth: 20 },
          5: { halign: 'center', cellWidth: 18 },
          6: { halign: 'center', cellWidth: 18 },
          7: { halign: 'center', cellWidth: 18 },
          8: { halign: 'center', cellWidth: 18 },
          9: { halign: 'center', cellWidth: 30, fontStyle: 'bold' },
          10: { halign: 'left' },
        },
        didParseCell: (data) => {
          if (data.section !== 'body') return;
          const r = dayResults[data.row.index];
          if (!r) return;
          const color = dayStatusColor[r.result.status].pdfRgb;
          if (data.column.index === 9) {
            data.cell.styles.fillColor = color;
            data.cell.styles.textColor = [30, 30, 30];
          }
          if (r.result.status === 'pendente_ajuste') {
            data.cell.styles.fillColor = color;
            data.cell.styles.textColor = [127, 29, 29];
          }
        },
        margin: { left: 8, right: 8, bottom: 18 },
      });

      let afterY = (doc as any).lastAutoTable.finalY + 6;

      // Totais
      if (afterY > doc.internal.pageSize.getHeight() - 70) {
        doc.addPage('landscape');
        afterY = 36;
        drawHeader(doc);
      }

      const expectedH = formatHM(summary.expected);
      const workedH = formatHM(summary.worked);
      const overtimeH = formatHM(summary.overtime);
      const bankH = formatHM(summary.bank);
      const delayH = formatHM(summary.delay);
      const earlyH = formatHM(summary.earlyExit);

      doc.setFillColor(...NAVY);
      doc.rect(8, afterY, pw - 16, 22, 'F');
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(safe('TOTALIZADORES DO PERÍODO'), 12, afterY + 5);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const cells = [
        [`Trabalhado: ${workedH}`, `Previsto: ${expectedH}`, `Extras: ${overtimeH}`, `Banco: ${bankH}`],
        [`Atrasos: ${delayH}`, `Saídas Antec.: ${earlyH}`, `Faltas: ${summary.absences}`, `Pendentes: ${summary.pending}`],
      ];
      cells.forEach((line, li) => {
        line.forEach((cell, ci) => {
          doc.text(safe(cell), 12 + ci * ((pw - 24) / 4), afterY + 12 + li * 6);
        });
      });

      afterY += 28;

      // Desconto estimado
      if (salary?.base_salary) {
        const base = Number(salary.base_salary);
        const perMin = base / 220 / 60;
        const desconto = (summary.delay + summary.earlyExit) * perMin;
        const liquido = base - desconto;
        doc.setTextColor(...NAVY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text(safe(`Salário base: R$ ${base.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`), 12, afterY);
        doc.text(safe(`Desconto estimado: R$ ${desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`), pw / 2 - 30, afterY);
        doc.text(safe(`Líquido estimado: R$ ${liquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`), pw - 14, afterY, { align: 'right' });
        afterY += 8;
      }

      // QR + assinatura
      const docHash = await sha256(JSON.stringify({ userId, period: selectedMonth, days: dayResults.length, summary, ts: Date.now() }));
      try {
        const qr = await QRCode.toDataURL(`https://easyn.app/validar-ponto/${docHash.slice(0, 32)}`, { width: 120, margin: 0 });
        doc.addImage(qr, 'PNG', pw - 32, afterY, 22, 22);
        doc.setFontSize(6);
        doc.setTextColor(80, 80, 80);
        doc.text(safe('Validação'), pw - 21, afterY + 26, { align: 'center' });
      } catch {/* ignore */}

      drawSignatureArea(doc, afterY + 6);
      drawFooter(doc, docHash);
      doc.save(`espelho-ponto-${selectedMonth}.pdf`);
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
    setShowModal(false);
  };

  // ==================== DIÁRIO ====================
  const generateDailyPDF = async () => {
    setLoading(true);
    try {
      const [recordsRes, justRes, scheduleRes, profileRes, holidayRes] = await Promise.all([
        supabase.from('time_clock').select('*').eq('user_id', userId).eq('clock_date', selectedDate).order('clock_time'),
        supabase.from('time_clock_justifications').select('*').eq('user_id', userId).eq('reference_date', selectedDate),
        supabase.from('time_clock_schedules').select('*').eq('user_id', userId).eq('is_active', true).maybeSingle(),
        supabase.from('profiles').select('name, cpf, role').eq('id', userId).maybeSingle(),
        (supabase as any).from("brazilian_holidays").select('holiday_date').eq('holiday_date', selectedDate).maybeSingle(),
      ]);

      const records = (recordsRes.data || []).map((r: any) => ({ clock_type: r.clock_type, clock_time: r.clock_time }));
      const schedule = scheduleRes.data as any;
      const profile = profileRes.data as any;
      const sched: DaySchedule | null = schedule ? {
        entry_time: schedule.entry_time, exit_time: schedule.exit_time,
        daily_hours: Number(schedule.daily_hours),
        tolerance_minutes: schedule.tolerance_minutes ?? 10,
        work_days: schedule.work_days ?? [1, 2, 3, 4, 5],
      } : null;
      const day = parseISO(selectedDate);
      const result = evaluateDay(records, sched, day.getDay(), !!holidayRes.data);

      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      drawHeader(doc);

      let yPos = 38;
      doc.setTextColor(...NAVY);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(safe('FOLHA DE PONTO DIÁRIA'), pw / 2, yPos, { align: 'center' });

      yPos += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(safe(`Colaborador: ${userName || profile?.name || '-'}`), 14, yPos);
      doc.text(safe(`Data: ${format(day, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`), pw - 14, yPos, { align: 'right' });

      yPos += 8;
      const recRes = (recordsRes.data || []);
      const fmtTime = (t: string) => t.includes('T') ? format(parseISO(t), 'HH:mm:ss') : String(t).slice(0, 8);
      autoTable(doc, {
        startY: yPos,
        head: [['Tipo', 'Horário', 'Localização']],
        body: [
          ['Entrada', recRes.find((r: any) => r.clock_type === 'entrada') ? fmtTime(recRes.find((r: any) => r.clock_type === 'entrada').clock_time) : '-', recRes.find((r: any) => r.clock_type === 'entrada')?.city ? `${recRes.find((r: any) => r.clock_type === 'entrada').city}/${recRes.find((r: any) => r.clock_type === 'entrada').state || ''}` : '-'],
          ['Início Pausa', recRes.find((r: any) => r.clock_type === 'pausa_inicio') ? fmtTime(recRes.find((r: any) => r.clock_type === 'pausa_inicio').clock_time) : '-', '-'],
          ['Fim Pausa', recRes.find((r: any) => r.clock_type === 'pausa_fim') ? fmtTime(recRes.find((r: any) => r.clock_type === 'pausa_fim').clock_time) : '-', '-'],
          ['Saída', recRes.find((r: any) => r.clock_type === 'saida') ? fmtTime(recRes.find((r: any) => r.clock_type === 'saida').clock_time) : '-', recRes.find((r: any) => r.clock_type === 'saida')?.city ? `${recRes.find((r: any) => r.clock_type === 'saida').city}/${recRes.find((r: any) => r.clock_type === 'saida').state || ''}` : '-'],
        ].map(row => row.map(safe)),
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 9 },
        headStyles: { fillColor: NAVY, textColor: WHITE },
      });

      let yp = (doc as any).lastAutoTable.finalY + 8;
      doc.setFillColor(...dayStatusColor[result.status].pdfRgb);
      doc.rect(14, yp - 5, pw - 28, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...NAVY);
      doc.setFontSize(10);
      doc.text(safe(`Status do Dia: ${dayStatusLabels[result.status]}`), pw / 2, yp + 1, { align: 'center' });
      yp += 15;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(40, 40, 40);
      const items = [
        [`Trabalhado: ${formatHM(result.workedMinutes)}`, `Previsto: ${formatHM(result.expectedMinutes)}`],
        [`Intervalo: ${formatHM(result.breakMinutes)}`, `Atraso: ${formatHM(result.delayMinutes)}`],
        [`Extras: ${formatHM(result.overtimeMinutes)}`, `Banco: ${formatHM(result.bankBalanceMinutes)}`],
      ];
      items.forEach((line) => {
        doc.text(safe(line[0]), 18, yp);
        doc.text(safe(line[1]), pw / 2 + 5, yp);
        yp += 6;
      });

      if (result.inconsistencies.length > 0) {
        yp += 4;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 30, 30);
        doc.text(safe('Inconsistências detectadas:'), 14, yp);
        yp += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        result.inconsistencies.forEach(i => {
          doc.text(safe(`• ${i.message}`), 18, yp);
          yp += 5;
        });
      }

      const hash = await sha256(JSON.stringify({ userId, date: selectedDate, result, ts: Date.now() }));
      drawSignatureArea(doc, Math.max(yp + 10, doc.internal.pageSize.getHeight() - 60));
      drawFooter(doc, hash);
      doc.save(`folha-ponto-${selectedDate}.pdf`);
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
    setShowModal(false);
  };

  // ==================== EXCEL ====================
  const generateExcel = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedMonth}-01`;
      const endDate = format(endOfMonth(parseISO(startDate)), 'yyyy-MM-dd');
      const [recordsRes, scheduleRes, holidaysRes, dayOffsRes, justRes] = await Promise.all([
        supabase.from('time_clock').select('*').eq('user_id', userId).gte('clock_date', startDate).lte('clock_date', endDate).order('clock_date').order('clock_time'),
        supabase.from('time_clock_schedules').select('*').eq('user_id', userId).eq('is_active', true).maybeSingle(),
        (supabase as any).from("brazilian_holidays").select('holiday_date').gte('holiday_date', startDate).lte('holiday_date', endDate),
        supabase.from('time_clock_day_offs').select('off_date, off_type').eq('user_id', userId).gte('off_date', startDate).lte('off_date', endDate),
        supabase.from('time_clock_justifications').select('*').eq('user_id', userId).gte('reference_date', startDate).lte('reference_date', endDate),
      ]);
      const records = recordsRes.data || [];
      const schedule = scheduleRes.data as any;
      const holidaySet = new Set((holidaysRes.data || []).map((h: any) => h.holiday_date));
      const dayOffMap: Record<string, string> = {};
      (dayOffsRes.data || []).forEach((d: any) => { dayOffMap[d.off_date] = d.off_type; });
      const justifications = justRes.data || [];

      const sched: DaySchedule | null = schedule ? {
        entry_time: schedule.entry_time, exit_time: schedule.exit_time,
        daily_hours: Number(schedule.daily_hours),
        tolerance_minutes: schedule.tolerance_minutes ?? 10,
        work_days: schedule.work_days ?? [1, 2, 3, 4, 5],
      } : null;

      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      const rows: any[] = days.map(day => {
        const ds = format(day, 'yyyy-MM-dd');
        const dayRecords = records.filter((r: any) => r.clock_date === ds).map((r: any) => ({ clock_type: r.clock_type, clock_time: r.clock_time }));
        const result = evaluateDay(dayRecords, sched, day.getDay(), holidaySet.has(ds));
        const fmtTime = (type: string) => {
          const r = records.find((x: any) => x.clock_date === ds && x.clock_type === type);
          if (!r) return '';
          const t = r.clock_time;
          return t.includes('T') ? format(parseISO(t), 'HH:mm') : String(t).slice(0, 5);
        };
        const just = justifications.find((j: any) => j.reference_date === ds);
        const off = dayOffMap[ds];
        return {
          'Data': format(day, 'dd/MM/yyyy'),
          'Dia': dayNamesShort[day.getDay()],
          'Entrada': fmtTime('entrada'),
          'Pausa Início': fmtTime('pausa_inicio'),
          'Pausa Fim': fmtTime('pausa_fim'),
          'Saída': fmtTime('saida'),
          'Intervalo': formatHM(result.breakMinutes),
          'Trabalhado': formatHM(result.workedMinutes),
          'Previsto': formatHM(result.expectedMinutes),
          'Atraso': formatHM(result.delayMinutes),
          'Saída Antec.': formatHM(result.earlyExitMinutes),
          'Extra': formatHM(result.overtimeMinutes),
          'Banco': formatHM(result.bankBalanceMinutes),
          'Status': dayStatusLabels[result.status],
          'Folga/Tipo': off ? off.toUpperCase() : '',
          'Justificativa': just ? `[${(just as any).status}] ${(just as any).justification_type}` : '',
          'Inconsistências': result.inconsistencies.map(i => i.message).join(' | '),
        };
      });

      const summary = summarizePeriod(days.map(day => {
        const ds = format(day, 'yyyy-MM-dd');
        const dayRecords = records.filter((r: any) => r.clock_date === ds).map((r: any) => ({ clock_type: r.clock_type, clock_time: r.clock_time }));
        return evaluateDay(dayRecords, sched, day.getDay(), holidaySet.has(ds));
      }));

      const totals = [
        { Métrica: 'Total Trabalhado', Valor: formatHM(summary.worked) },
        { Métrica: 'Total Previsto', Valor: formatHM(summary.expected) },
        { Métrica: 'Horas Extras', Valor: formatHM(summary.overtime) },
        { Métrica: 'Banco de Horas', Valor: formatHM(summary.bank) },
        { Métrica: 'Atrasos', Valor: formatHM(summary.delay) },
        { Métrica: 'Saídas Antecipadas', Valor: formatHM(summary.earlyExit) },
        { Métrica: 'Faltas', Valor: summary.absences },
        { Métrica: 'Dias Pendentes', Valor: summary.pending },
        { Métrica: 'Justificados', Valor: summary.justified },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Espelho de Ponto');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(totals), 'Totais');
      XLSX.writeFile(wb, `espelho-ponto-${selectedMonth}.xlsx`);
      toast({ title: 'Excel gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar Excel', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
    setShowModal(false);
  };

  const handleGenerate = () => {
    if (exportFormat === 'xlsx') return generateExcel();
    return reportType === 'daily' ? generateDailyPDF() : generateMonthlyPDF();
  };

  return (
    <>
      <Button onClick={() => setShowModal(true)} variant="outline">
        <Download className="h-4 w-4 mr-2" />
        Exportar Espelho
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Exportar Espelho de Ponto
            </DialogTitle>
            <DialogDescription>
              Escolha o formato e o período do relatório
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Formato</Label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'pdf' | 'xlsx')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf"><div className="flex items-center gap-2"><FileText className="h-4 w-4" />PDF Profissional</div></SelectItem>
                  <SelectItem value="xlsx"><div className="flex items-center gap-2"><FileSpreadsheet className="h-4 w-4" />Planilha Excel</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            {exportFormat === 'pdf' && (
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as 'daily' | 'monthly')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily"><div className="flex items-center gap-2"><Calendar className="h-4 w-4" />Folha Diária</div></SelectItem>
                    <SelectItem value="monthly"><div className="flex items-center gap-2"><FileText className="h-4 w-4" />Espelho Mensal</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {exportFormat === 'pdf' && reportType === 'daily' ? (
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Mês</Label>
                <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
