import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileText, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { format, parseISO, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateTotalBreakMinutes, parseTimeToMinutes, formatMinutesToHMCompact } from '@/lib/timeClockCalculations';

const EASYN_NAVY = [10, 31, 68] as const;
const EASYN_BLUE = [59, 130, 246] as const;
const WHITE = [255, 255, 255] as const;

interface TimeClockPDFProps {
  userId?: string;
  userName?: string;
  companyName?: string;
  companyCNPJ?: string;
}

export function TimeClockPDF({ userId, userName, companyName = 'Empresa', companyCNPJ }: TimeClockPDFProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { toast } = useToast();

  const drawHeader = (doc: jsPDF, pageWidth: number) => {
    doc.setFillColor(...EASYN_NAVY);
    doc.rect(0, 0, pageWidth, 38, 'F');
    doc.setFillColor(...EASYN_BLUE);
    doc.rect(0, 38, pageWidth, 2, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('EASYN', 14, 18);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestão de Ponto', 14, 26);
  };

  const drawCompanyInfo = (doc: jsPDF, pageWidth: number) => {
    doc.setTextColor(...WHITE);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(companyName || 'Empresa', pageWidth - 14, 18, { align: 'right' });
    if (companyCNPJ) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`CNPJ: ${companyCNPJ}`, pageWidth - 14, 26, { align: 'right' });
    }
  };

  const drawSignatureArea = (doc: jsPDF, yPos: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'italic');
    doc.text('Declaro que as informações acima são verdadeiras e conferem com meu registro de ponto.', pageWidth / 2, yPos, { align: 'center' });
    yPos += 15;
    doc.setDrawColor(0, 0, 0);
    doc.line(20, yPos, 90, yPos);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Assinatura do Colaborador', 55, yPos + 5, { align: 'center' });
    doc.text('Data: ___/___/______', 55, yPos + 11, { align: 'center' });
    doc.line(120, yPos, 190, yPos);
    doc.text('Assinatura do Gestor', 155, yPos + 5, { align: 'center' });
    doc.text('Data: ___/___/______', 155, yPos + 11, { align: 'center' });
    yPos += 22;
    doc.setDrawColor(180, 180, 180);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(pageWidth / 2 - 25, yPos, 50, 20);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Carimbo da Empresa', pageWidth / 2, yPos + 12, { align: 'center' });
    doc.setLineDashPattern([], 0);
  };

  const drawFooter = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(...EASYN_NAVY);
    doc.rect(0, 282, pageWidth, 15, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text(`Easyn — Sistema de Gestão de Ponto | Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageWidth / 2, 290, { align: 'center' });
  };

  const generateDailyPDF = async () => {
    setLoading(true);
    try {
      const { data: records } = await supabase
        .from('time_clock').select('*').eq('user_id', userId)
        .eq('clock_date', selectedDate).order('clock_time', { ascending: true });

      const { data: justifications } = await supabase
        .from('time_clock_justifications').select('*').eq('user_id', userId)
        .eq('reference_date', selectedDate);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      drawHeader(doc, pageWidth);
      drawCompanyInfo(doc, pageWidth);

      let yPos = 50;
      doc.setTextColor(...EASYN_NAVY);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('FOLHA DE PONTO DIÁRIA', pageWidth / 2, yPos, { align: 'center' });

      yPos += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Colaborador:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(userName || 'Não informado', 48, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text('Data:', 120, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(format(parseISO(selectedDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }), 133, yPos);

      yPos += 18;
      doc.setFillColor(240, 243, 248);
      doc.rect(14, yPos - 5, pageWidth - 28, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...EASYN_NAVY);
      doc.text('REGISTROS DO DIA', pageWidth / 2, yPos + 1, { align: 'center' });

      yPos += 14;
      const entry = records?.find(r => r.clock_type === 'entrada');
      const breakStarts = records?.filter(r => r.clock_type === 'pausa_inicio') || [];
      const breakEnds = records?.filter(r => r.clock_type === 'pausa_fim') || [];
      const exit = records?.find(r => r.clock_type === 'saida');

      const rows = [
        { label: 'Entrada', record: entry },
        { label: 'Início Pausa', record: breakStarts[0] },
        { label: 'Fim Pausa', record: breakEnds[0] },
        { label: 'Saída', record: exit },
      ];

      doc.setFontSize(10);
      rows.forEach((row) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...EASYN_NAVY);
        doc.text(row.label + ':', 20, yPos);
        doc.setFont('helvetica', 'normal');
        if (row.record) {
          const time = row.record.clock_time;
          const timeStr = time.includes('T') ? format(parseISO(time), 'HH:mm:ss') : time.slice(0, 8);
          doc.setTextColor(0, 0, 0);
          doc.text(timeStr, 60, yPos);
          if (row.record.city) {
            doc.setFontSize(8);
            doc.setTextColor(100, 100, 100);
            doc.text(`${row.record.city}/${row.record.state}`, 90, yPos);
            doc.setFontSize(10);
          }
        } else {
          doc.setTextColor(150, 150, 150);
          doc.text('Não registrado', 60, yPos);
        }
        yPos += 10;
      });

      yPos += 8;
      doc.setFillColor(...EASYN_BLUE);
      doc.rect(14, yPos - 5, pageWidth - 28, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text('RESUMO', pageWidth / 2, yPos + 1, { align: 'center' });

      yPos += 14;
      let totalMinutes = 0;
      const breakMinutes = calculateTotalBreakMinutes(records || []);
      if (entry && exit) {
        totalMinutes = Math.floor((parseISO(exit.clock_time).getTime() - parseISO(entry.clock_time).getTime()) / 60000);
        totalMinutes -= breakMinutes;
      }

      doc.setTextColor(...EASYN_NAVY);
      doc.setFont('helvetica', 'bold');
      doc.text('Total Trabalhado:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`, 65, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text('Intervalo:', 110, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${Math.floor(breakMinutes / 60)}h ${breakMinutes % 60}min`, 140, yPos);

      if (justifications && justifications.length > 0) {
        yPos += 16;
        doc.setFillColor(255, 243, 205);
        doc.rect(14, yPos - 5, pageWidth - 28, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...EASYN_NAVY);
        doc.text('JUSTIFICATIVAS', pageWidth / 2, yPos + 1, { align: 'center' });
        yPos += 12;
        justifications.forEach((just: any) => {
          doc.setFont('helvetica', 'bold');
          doc.text(`• ${just.justification_type}:`, 20, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(just.description?.substring(0, 60) || '', 60, yPos);
          doc.text(`[${just.status}]`, 170, yPos);
          yPos += 8;
        });
      }

      drawSignatureArea(doc, yPos + 20);
      drawFooter(doc);
      doc.save(`ponto-diario-${selectedDate}.pdf`);
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
    setShowModal(false);
  };

  const generateMonthlyPDF = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedMonth}-01`;
      const endDate = format(endOfMonth(parseISO(startDate)), 'yyyy-MM-dd');

      const [recordsRes, justRes, scheduleRes, profileRes, salaryRes, dayOffsRes] = await Promise.all([
        supabase.from('time_clock').select('*').eq('user_id', userId)
          .gte('clock_date', startDate).lte('clock_date', endDate)
          .order('clock_date', { ascending: true }).order('clock_time', { ascending: true }),
        supabase.from('time_clock_justifications').select('*').eq('user_id', userId)
          .gte('reference_date', startDate).lte('reference_date', endDate),
        supabase.from('time_clock_schedules').select('*').eq('user_id', userId).eq('is_active', true).single(),
        supabase.from('profiles').select('name, email, cpf, role').eq('id', userId).single(),
        supabase.from('employee_salaries').select('*').eq('user_id', userId).eq('is_active', true).single(),
        supabase.from('time_clock_day_offs').select('off_date, off_type').eq('user_id', userId)
          .gte('off_date', startDate).lte('off_date', endDate),
      ]);

      const records = recordsRes.data || [];
      const justifications = justRes.data || [];
      const schedule = scheduleRes.data;
      const profile = profileRes.data;
      const salary = salaryRes.data;
      const dayOffMap: Record<string, string> = {};
      (dayOffsRes.data || []).forEach((d: any) => { dayOffMap[d.off_date] = d.off_type; });

      const doc = new jsPDF({ orientation: 'landscape' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // ==================== HEADER ====================
      drawHeader(doc, pageWidth);
      drawCompanyInfo(doc, pageWidth);

      // Title
      let yPos = 48;
      doc.setTextColor(...EASYN_NAVY);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ESPELHO DE PONTO MENSAL', pageWidth / 2, yPos, { align: 'center' });

      // Employee info line 1
      yPos += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...EASYN_NAVY);
      doc.text('Colaborador:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(userName || profile?.name || 'Não informado', 45, yPos);

      const cargoText = salary?.cargo || (profile?.role === 'admin' ? 'Administrador' : 'Colaborador');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...EASYN_NAVY);
      doc.text('Cargo:', 120, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(cargoText, 135, yPos);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...EASYN_NAVY);
      doc.text('Período:', 200, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const periodoText = format(parseISO(startDate), "MMMM 'de' yyyy", { locale: ptBR });
      doc.text(periodoText.charAt(0).toUpperCase() + periodoText.slice(1), 220, yPos);

      // Employee info line 2
      yPos += 7;
      if (profile?.cpf) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...EASYN_NAVY);
        doc.text('CPF:', 14, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const cpf = profile.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        doc.text(cpf, 28, yPos);
      }
      if (schedule) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...EASYN_NAVY);
        doc.text('Jornada:', 120, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`${schedule.entry_time?.slice(0, 5)} às ${schedule.exit_time?.slice(0, 5)} | ${schedule.daily_hours}h/dia`, 142, yPos);
      }

      // ==================== TABLE HEADER ====================
      yPos += 10;
      const HEADER_RED: [number, number, number] = [180, 30, 30];
      doc.setFillColor(...HEADER_RED);
      doc.rect(14, yPos - 4, pageWidth - 28, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...WHITE);

      // Column positions for landscape
      const cols = {
        data: 16,
        dia: 35,
        entrada: 62,
        saida: 82,
        pausaIni: 100,
        pausaFim: 118,
        totalIntervalo: 136,
        atraso: 156,
        licMed: 175,
        ferias: 193,
        justificativa: 210,
        totalHoras: 233,
        obs: 255,
      };

      doc.text('Data', cols.data, yPos + 2);
      doc.text('Dia da Semana', cols.dia, yPos + 2);
      doc.text('Entrada', cols.entrada, yPos + 2);
      doc.text('Saída', cols.saida, yPos + 2);
      doc.text('Pausa Início', cols.pausaIni, yPos + 2);
      doc.text('Pausa Fim', cols.pausaFim, yPos + 2);
      doc.text('Tot. Intervalo', cols.totalIntervalo, yPos + 2);
      doc.text('Atraso', cols.atraso, yPos + 2);
      doc.text('Lic. Méd.', cols.licMed, yPos + 2);
      doc.text('Férias', cols.ferias, yPos + 2);
      doc.text('Justif.', cols.justificativa, yPos + 2);
      doc.text('Total Horas', cols.totalHoras, yPos + 2);
      doc.text('Obs', cols.obs, yPos + 2);

      yPos += 11;

      // ==================== TABLE ROWS ====================
      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      const workDays = schedule?.work_days || [1, 2, 3, 4, 5];
      const expectedDailyMinutes = (schedule?.daily_hours || 8) * 60;

      let totalWorkedMinutes = 0;
      let totalDelayMinutes = 0;
      let totalBreakMinutesAll = 0;
      let totalDelays = 0;
      let totalAbsences = 0;
      let totalOvertime = 0;
      let justifiedDelays = 0;
      let unjustifiedDelays = 0;

      const dayNames: Record<number, string> = {
        0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira',
        3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado',
      };

      const fmtTime = (r: any) => {
        if (!r) return '-';
        const t = r.clock_time;
        return t.includes('T') ? format(parseISO(t), 'HH:mm') : t.slice(0, 5);
      };

      const fmtMinToHM = (min: number): string => {
        if (min <= 0) return '-';
        const h = Math.floor(min / 60);
        const m = min % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      days.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRecords = records.filter(r => r.clock_date === dateStr);
        const dayOfWeek = day.getDay();
        const isWorkDay = workDays.includes(dayOfWeek);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        // Page break
        if (yPos > pageHeight - 35) {
          drawFooter(doc);
          doc.addPage('landscape');
          yPos = 20;
          // Redraw table header on new page
          doc.setFillColor(...HEADER_RED);
          doc.rect(14, yPos - 4, pageWidth - 28, 10, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(...WHITE);
          doc.text('Data', cols.data, yPos + 2);
          doc.text('Dia da Semana', cols.dia, yPos + 2);
          doc.text('Entrada', cols.entrada, yPos + 2);
          doc.text('Saída', cols.saida, yPos + 2);
          doc.text('Pausa Início', cols.pausaIni, yPos + 2);
          doc.text('Pausa Fim', cols.pausaFim, yPos + 2);
          doc.text('Tot. Intervalo', cols.totalIntervalo, yPos + 2);
          doc.text('Atraso', cols.atraso, yPos + 2);
          doc.text('Lic. Méd.', cols.licMed, yPos + 2);
          doc.text('Férias', cols.ferias, yPos + 2);
          doc.text('Justif.', cols.justificativa, yPos + 2);
          doc.text('Total Horas', cols.totalHoras, yPos + 2);
          doc.text('Obs', cols.obs, yPos + 2);
          yPos += 11;
        }

        const entry = dayRecords.find(r => r.clock_type === 'entrada');
        const breakStarts = dayRecords.filter(r => r.clock_type === 'pausa_inicio');
        const breakEnds = dayRecords.filter(r => r.clock_type === 'pausa_fim');
        const exit = dayRecords.find(r => r.clock_type === 'saida');
        const breakMinutes = calculateTotalBreakMinutes(dayRecords);
        totalBreakMinutesAll += breakMinutes;

        let workedMinutes = 0;
        let delayMinutes = 0;
        let status = '';
        let obsText = '';

        if (!isWorkDay) {
          status = isWeekend ? '' : '';
          // Weekend row background
          doc.setFillColor(240, 240, 240);
          doc.rect(14, yPos - 3.5, pageWidth - 28, 6, 'F');
        }

        // Check day-off
        const dayOffType = dayOffMap[dateStr];
        const DAY_OFF_LABELS: Record<string, string> = {
          folga: 'FOLGA', feriado: 'FERIADO', licenca: 'LICENÇA', ferias: 'FÉRIAS', abono: 'ABONO',
        };

        if (dayOffType) {
          // Day-off row background
          doc.setFillColor(220, 240, 255);
          doc.rect(14, yPos - 3.5, pageWidth - 28, 6, 'F');
          obsText = DAY_OFF_LABELS[dayOffType] || 'FOLGA';
        } else if (entry && exit) {
          workedMinutes = Math.floor((parseISO(exit.clock_time).getTime() - parseISO(entry.clock_time).getTime()) / 60000);
          workedMinutes -= breakMinutes;
          if (workedMinutes < 0) workedMinutes = 0;
          if (schedule && isWorkDay) {
            const scheduledMin = parseTimeToMinutes(schedule.entry_time) + (schedule.tolerance_minutes || 0);
            const actualMin = parseTimeToMinutes(entry.clock_time);
            if (actualMin > scheduledMin) {
              delayMinutes = actualMin - parseTimeToMinutes(schedule.entry_time);
              totalDelays++;
              totalDelayMinutes += delayMinutes;
            }
          }
          totalWorkedMinutes += workedMinutes;
          if (isWorkDay && workedMinutes > expectedDailyMinutes) {
            totalOvertime += workedMinutes - expectedDailyMinutes;
          }
        } else if (isWorkDay && !entry && !dayOffType) {
          totalAbsences++;
          obsText = 'FALTA';
        } else if (isWorkDay && entry && !exit) {
          obsText = 'INCOMPLETO';
        }

        // Justification for this day
        const dayJust = justifications.find(j => j.reference_date === dateStr);
        let justLabel = '';
        let isLicMed = false;
        if (dayJust) {
          const jType = (dayJust as any).justification_type || '';
          if (jType.toLowerCase().includes('médic') || jType.toLowerCase().includes('atestado') || jType.toLowerCase().includes('medic')) {
            isLicMed = true;
          }
          if (dayJust.status === 'approved') {
            justLabel = '✓ Apr';
            if (delayMinutes > 0) justifiedDelays++;
          } else if (dayJust.status === 'rejected') {
            justLabel = '✗ Rej';
            if (delayMinutes > 0) unjustifiedDelays++;
          } else {
            justLabel = '⏳ Pend';
            if (delayMinutes > 0) unjustifiedDelays++;
          }
        } else {
          if (delayMinutes > 0) unjustifiedDelays++;
        }

        // Draw row
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');

        // Date
        doc.setTextColor(0, 0, 0);
        doc.text(format(day, 'dd/MM/yyyy'), cols.data, yPos);

        // Day of week
        if (isWeekend) {
          doc.setTextColor(150, 150, 150);
        } else {
          doc.setTextColor(0, 0, 0);
        }
        doc.text(dayNames[dayOfWeek] || '', cols.dia, yPos);

        // Time columns
        doc.setTextColor(0, 0, 0);
        doc.text(fmtTime(entry), cols.entrada, yPos);
        doc.text(fmtTime(exit), cols.saida, yPos);
        doc.text(fmtTime(breakStarts[0]), cols.pausaIni, yPos);
        doc.text(fmtTime(breakEnds[breakEnds.length - 1]), cols.pausaFim, yPos);
        doc.text(breakMinutes > 0 ? fmtMinToHM(breakMinutes) : '-', cols.totalIntervalo, yPos);

        // Delay column
        if (delayMinutes > 0) {
          doc.setTextColor(220, 80, 20);
          doc.text(`${delayMinutes}min`, cols.atraso, yPos);
        } else {
          doc.setTextColor(0, 0, 0);
          doc.text('-', cols.atraso, yPos);
        }

        // Lic. Med column
        doc.setTextColor(0, 0, 0);
        doc.text(isLicMed ? 'Sim' : '-', cols.licMed, yPos);

        // Férias column
        doc.text('-', cols.ferias, yPos);

        // Justification column
        if (justLabel) {
          if (justLabel.includes('Apr')) doc.setTextColor(16, 185, 129);
          else if (justLabel.includes('Rej')) doc.setTextColor(239, 68, 68);
          else doc.setTextColor(245, 158, 11);
          doc.text(justLabel, cols.justificativa, yPos);
        } else {
          doc.setTextColor(0, 0, 0);
          doc.text('-', cols.justificativa, yPos);
        }

        // Total Horas column
        doc.setTextColor(0, 0, 0);
        doc.text(workedMinutes > 0 ? fmtMinToHM(workedMinutes) : '-', cols.totalHoras, yPos);

        // Obs column
        const dayOffLabels = ['FOLGA', 'FERIADO', 'LICENÇA', 'FÉRIAS', 'ABONO'];
        if (dayOffLabels.includes(obsText)) {
          doc.setTextColor(59, 130, 246);
          doc.setFont('helvetica', 'bold');
          doc.text(obsText, cols.obs, yPos);
          doc.setFont('helvetica', 'normal');
        } else if (obsText === 'FALTA') {
          doc.setTextColor(239, 68, 68);
          doc.setFont('helvetica', 'bold');
          doc.text('FALTA', cols.obs, yPos);
          doc.setFont('helvetica', 'normal');
        } else if (obsText === 'INCOMPLETO') {
          doc.setTextColor(249, 115, 22);
          doc.text('INC', cols.obs, yPos);
        } else if (isWeekend && !entry) {
          doc.setTextColor(150, 150, 150);
          doc.text('FDS', cols.obs, yPos);
        } else {
          doc.setTextColor(0, 0, 0);
          doc.text('-', cols.obs, yPos);
        }

        // Separator line
        doc.setDrawColor(220, 220, 220);
        doc.line(14, yPos + 2, pageWidth - 14, yPos + 2);

        yPos += 6;
      });

      // ==================== SUMMARY ====================
      yPos += 6;
      const summaryHeight = salary ? 38 : 24;

      if (yPos + summaryHeight + 55 > pageHeight - 15) {
        drawFooter(doc);
        doc.addPage('landscape');
        yPos = 20;
      }

      doc.setFillColor(...EASYN_NAVY);
      doc.rect(14, yPos - 4, pageWidth - 28, summaryHeight, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');

      const totalH = Math.floor(totalWorkedMinutes / 60);
      const totalM = totalWorkedMinutes % 60;
      const workDaysInMonth = days.filter(d => workDays.includes(d.getDay())).length;
      const expectedHours = workDaysInMonth * (schedule?.daily_hours || 8);
      const overtimeH = Math.floor(totalOvertime / 60);
      const overtimeM = totalOvertime % 60;
      const balanceMinutes = totalWorkedMinutes - (expectedHours * 60);
      const balanceH = Math.floor(Math.abs(balanceMinutes) / 60);
      const balanceM = Math.abs(balanceMinutes) % 60;
      const delayH = Math.floor(totalDelayMinutes / 60);
      const delayM = totalDelayMinutes % 60;

      // Row 1
      doc.text(`Total Trabalhado: ${String(totalH).padStart(2,'0')}:${String(totalM).padStart(2,'0')}`, 18, yPos + 4);
      doc.text(`Carga Prevista: ${expectedHours}h`, 90, yPos + 4);
      doc.text(`Horas Extras: ${String(overtimeH).padStart(2,'0')}:${String(overtimeM).padStart(2,'0')}`, 155, yPos + 4);
      doc.text(`Banco de Horas: ${balanceMinutes >= 0 ? '+' : '-'}${String(balanceH).padStart(2,'0')}:${String(balanceM).padStart(2,'0')}`, 220, yPos + 4);

      // Row 2
      doc.text(`Atrasos: ${totalDelays} ocorrências | Total: ${String(delayH).padStart(2,'0')}:${String(delayM).padStart(2,'0')}`, 18, yPos + 12);
      doc.text(`Atr. Justificados: ${justifiedDelays}`, 115, yPos + 12);
      doc.text(`Atr. Não Justificados: ${unjustifiedDelays}`, 175, yPos + 12);
      doc.text(`Faltas: ${totalAbsences}`, 245, yPos + 12);

      // Row 3 - Total Pausas
      doc.text(`Total Pausas: ${fmtMinToHM(totalBreakMinutesAll) === '-' ? '00:00' : fmtMinToHM(totalBreakMinutesAll)}`, 18, yPos + 20);

      // Salary row (if available)
      if (salary) {
        const baseSalary = Number(salary.base_salary);
        const discountPerMinute = baseSalary / 176 / 60;
        // Only discount unjustified delay minutes
        const unjustifiedDelayMinutes = unjustifiedDelays > 0 ? totalDelayMinutes : 0;
        const totalDiscount = unjustifiedDelayMinutes * discountPerMinute;
        const netPay = baseSalary - totalDiscount;

        doc.setFillColor(...EASYN_BLUE);
        doc.rect(14, yPos + summaryHeight - 14, pageWidth - 28, 0.5, 'F');

        doc.text(`Salário Base: R$ ${baseSalary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, yPos + summaryHeight - 6);
        doc.text(`Desconto Atrasos: R$ ${totalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 115, yPos + summaryHeight - 6);
        doc.setFontSize(9);
        doc.text(`Valor Líquido Estimado: R$ ${netPay.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 210, yPos + summaryHeight - 6);
        doc.setFontSize(7.5);
      }

      // ==================== SIGNATURE ====================
      drawSignatureArea(doc, yPos + summaryHeight + 8);
      drawFooter(doc);

      doc.save(`espelho-ponto-${selectedMonth}.pdf`);
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (error: any) {
      toast({ title: 'Erro ao gerar PDF', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
    setShowModal(false);
  };

  return (
    <>
      <Button onClick={() => setShowModal(true)} variant="outline">
        <Download className="h-4 w-4 mr-2" />
        Gerar PDF
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gerar Relatório PDF
            </DialogTitle>
            <DialogDescription>
              Escolha o tipo de relatório que deseja gerar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Relatório</Label>
              <Select value={reportType} onValueChange={(v) => setReportType(v as 'daily' | 'monthly')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">
                    <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />Folha Diária</div>
                  </SelectItem>
                  <SelectItem value="monthly">
                    <div className="flex items-center gap-2"><FileText className="h-4 w-4" />Espelho Mensal</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {reportType === 'daily' ? (
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
            <Button onClick={reportType === 'daily' ? generateDailyPDF : generateMonthlyPDF} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
