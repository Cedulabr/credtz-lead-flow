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

// Easyn brand colors
const EASYN_NAVY = [10, 31, 68] as const;   // #0A1F44
const EASYN_BLUE = [59, 130, 246] as const;  // #3B82F6
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
    // Navy header background
    doc.setFillColor(...EASYN_NAVY);
    doc.rect(0, 0, pageWidth, 38, 'F');
    // Accent line
    doc.setFillColor(...EASYN_BLUE);
    doc.rect(0, 38, pageWidth, 2, 'F');

    // Logo text "EASYN"
    doc.setTextColor(...WHITE);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('EASYN', 14, 18);

    // Subtitle
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

    // Legal text
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    doc.setFont('helvetica', 'italic');
    doc.text(
      'Declaro que as informações acima são verdadeiras e conferem com meu registro de ponto.',
      pageWidth / 2, yPos, { align: 'center' }
    );

    yPos += 15;

    // Collaborator signature
    doc.setDrawColor(0, 0, 0);
    doc.line(20, yPos, 90, yPos);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Assinatura do Colaborador', 55, yPos + 5, { align: 'center' });
    doc.text('Data: ___/___/______', 55, yPos + 11, { align: 'center' });

    // Manager signature
    doc.line(120, yPos, 190, yPos);
    doc.text('Assinatura do Gestor', 155, yPos + 5, { align: 'center' });
    doc.text('Data: ___/___/______', 155, yPos + 11, { align: 'center' });

    // Company stamp area
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
    doc.text(
      `Easyn — Sistema de Gestão de Ponto | Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
      pageWidth / 2, 290, { align: 'center' }
    );
  };

  const generateDailyPDF = async () => {
    setLoading(true);
    try {
      const { data: records } = await supabase
        .from('time_clock')
        .select('*')
        .eq('user_id', userId)
        .eq('clock_date', selectedDate)
        .order('clock_time', { ascending: true });

      const { data: justifications } = await supabase
        .from('time_clock_justifications')
        .select('*')
        .eq('user_id', userId)
        .eq('reference_date', selectedDate);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      drawHeader(doc, pageWidth);
      drawCompanyInfo(doc, pageWidth);

      // Title
      let yPos = 50;
      doc.setTextColor(...EASYN_NAVY);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('FOLHA DE PONTO DIÁRIA', pageWidth / 2, yPos, { align: 'center' });

      // Employee info
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

      // Records section
      yPos += 18;
      doc.setFillColor(240, 243, 248);
      doc.rect(14, yPos - 5, pageWidth - 28, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...EASYN_NAVY);
      doc.text('REGISTROS DO DIA', pageWidth / 2, yPos + 1, { align: 'center' });

      yPos += 14;
      const entry = records?.find(r => r.clock_type === 'entrada');
      const breakStart = records?.find(r => r.clock_type === 'pausa_inicio');
      const breakEnd = records?.find(r => r.clock_type === 'pausa_fim');
      const exit = records?.find(r => r.clock_type === 'saida');

      const rows = [
        { label: 'Entrada', record: entry },
        { label: 'Início Pausa', record: breakStart },
        { label: 'Fim Pausa', record: breakEnd },
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

      // Summary
      yPos += 8;
      doc.setFillColor(...EASYN_BLUE);
      doc.rect(14, yPos - 5, pageWidth - 28, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text('RESUMO', pageWidth / 2, yPos + 1, { align: 'center' });

      yPos += 14;
      let totalMinutes = 0;
      let breakMinutes = 0;
      if (entry && exit) {
        totalMinutes = Math.floor((parseISO(exit.clock_time).getTime() - parseISO(entry.clock_time).getTime()) / 60000);
        if (breakStart && breakEnd) {
          breakMinutes = Math.floor((parseISO(breakEnd.clock_time).getTime() - parseISO(breakStart.clock_time).getTime()) / 60000);
          totalMinutes -= breakMinutes;
        }
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

      // Justifications
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

      const [recordsRes, justRes, scheduleRes] = await Promise.all([
        supabase.from('time_clock').select('*').eq('user_id', userId)
          .gte('clock_date', startDate).lte('clock_date', endDate)
          .order('clock_date', { ascending: true }).order('clock_time', { ascending: true }),
        supabase.from('time_clock_justifications').select('*').eq('user_id', userId)
          .gte('reference_date', startDate).lte('reference_date', endDate),
        supabase.from('time_clock_schedules').select('*').eq('user_id', userId).eq('is_active', true).single(),
      ]);

      const records = recordsRes.data || [];
      const justifications = justRes.data || [];
      const schedule = scheduleRes.data;

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      drawHeader(doc, pageWidth);
      drawCompanyInfo(doc, pageWidth);

      // Title
      let yPos = 48;
      doc.setTextColor(...EASYN_NAVY);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ESPELHO DE PONTO MENSAL', pageWidth / 2, yPos, { align: 'center' });

      // Employee info
      yPos += 12;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...EASYN_NAVY);
      doc.text('Colaborador:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(userName || 'Não informado', 45, yPos);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...EASYN_NAVY);
      doc.text('Período:', 120, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(format(parseISO(startDate), "MMMM 'de' yyyy", { locale: ptBR }), 142, yPos);

      yPos += 7;
      if (schedule) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...EASYN_NAVY);
        doc.text('Jornada:', 14, yPos);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`${schedule.entry_time?.slice(0, 5)} às ${schedule.exit_time?.slice(0, 5)} | ${schedule.daily_hours}h/dia`, 38, yPos);
      }

      // Table header
      yPos += 12;
      doc.setFillColor(...EASYN_NAVY);
      doc.rect(14, yPos - 4, pageWidth - 28, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...WHITE);
      doc.text('Data', 16, yPos + 2);
      doc.text('Dia', 36, yPos + 2);
      doc.text('Entrada', 52, yPos + 2);
      doc.text('Pausa', 75, yPos + 2);
      doc.text('Retorno', 95, yPos + 2);
      doc.text('Saída', 118, yPos + 2);
      doc.text('Total', 138, yPos + 2);
      doc.text('Status', 158, yPos + 2);
      doc.text('Obs', 180, yPos + 2);

      yPos += 12;
      doc.setFont('helvetica', 'normal');

      const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });
      const workDays = schedule?.work_days || [1, 2, 3, 4, 5];
      const expectedDailyMinutes = (schedule?.daily_hours || 8) * 60;

      let totalWorkedMinutes = 0;
      let totalDelays = 0;
      let totalAbsences = 0;
      let totalOvertime = 0;

      days.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRecords = records.filter(r => r.clock_date === dateStr);
        const dayOfWeek = day.getDay();
        const isWorkDay = workDays.includes(dayOfWeek);

        if (yPos > 260) {
          drawFooter(doc);
          doc.addPage();
          yPos = 20;
        }

        const entry = dayRecords.find(r => r.clock_type === 'entrada');
        const breakStart = dayRecords.find(r => r.clock_type === 'pausa_inicio');
        const breakEnd = dayRecords.find(r => r.clock_type === 'pausa_fim');
        const exit = dayRecords.find(r => r.clock_type === 'saida');

        let workedMinutes = 0;
        let status = isWorkDay ? (entry ? (exit ? 'OK' : 'INC') : 'FALTA') : 'FDS';

        if (entry && exit) {
          workedMinutes = Math.floor((parseISO(exit.clock_time).getTime() - parseISO(entry.clock_time).getTime()) / 60000);
          if (breakStart && breakEnd) {
            workedMinutes -= Math.floor((parseISO(breakEnd.clock_time).getTime() - parseISO(breakStart.clock_time).getTime()) / 60000);
          }
          if (schedule) {
            const [h, m] = schedule.entry_time.split(':').map(Number);
            const scheduledMin = h * 60 + m + (schedule.tolerance_minutes || 0);
            const actualMin = parseISO(entry.clock_time).getHours() * 60 + parseISO(entry.clock_time).getMinutes();
            if (actualMin > scheduledMin) { status = 'ATR'; totalDelays++; }
          }
          totalWorkedMinutes += workedMinutes;
          if (workedMinutes > expectedDailyMinutes) totalOvertime += workedMinutes - expectedDailyMinutes;
        } else if (isWorkDay && !entry) {
          totalAbsences++;
        }

        const fmtTime = (r: any) => {
          if (!r) return '-';
          const t = r.clock_time;
          return t.includes('T') ? format(parseISO(t), 'HH:mm') : t.slice(0, 5);
        };

        // Alternate row bg
        if (!isWorkDay) {
          doc.setFillColor(245, 247, 250);
          doc.rect(14, yPos - 3, pageWidth - 28, 6, 'F');
        }

        doc.setFontSize(7);
        doc.setTextColor(0, 0, 0);
        doc.text(format(day, 'dd/MM'), 16, yPos);
        doc.text(format(day, 'EEE', { locale: ptBR }), 36, yPos);
        doc.text(fmtTime(entry), 52, yPos);
        doc.text(fmtTime(breakStart), 75, yPos);
        doc.text(fmtTime(breakEnd), 95, yPos);
        doc.text(fmtTime(exit), 118, yPos);
        doc.text(workedMinutes > 0 ? `${Math.floor(workedMinutes / 60)}h${(workedMinutes % 60).toString().padStart(2, '0')}` : '-', 138, yPos);

        // Status colors
        const statusColors: Record<string, [number, number, number]> = {
          'OK': [16, 185, 129],    // green
          'ATR': [245, 158, 11],   // amber
          'FALTA': [239, 68, 68],  // red
          'INC': [249, 115, 22],   // orange
          'FDS': [156, 163, 175],  // gray
        };
        doc.setTextColor(...(statusColors[status] || [0, 0, 0]));
        doc.text(status, 160, yPos);
        doc.setTextColor(0, 0, 0);

        const dayJust = justifications.find(j => j.reference_date === dateStr);
        if (dayJust) doc.text('✓', 185, yPos);

        yPos += 6;
      });

      // Summary bar with gradient effect (navy to blue)
      yPos += 8;
      doc.setFillColor(...EASYN_NAVY);
      doc.rect(14, yPos - 4, (pageWidth - 28) / 2, 22, 'F');
      doc.setFillColor(...EASYN_BLUE);
      doc.rect(14 + (pageWidth - 28) / 2, yPos - 4, (pageWidth - 28) / 2, 22, 'F');

      doc.setTextColor(...WHITE);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');

      const totalH = Math.floor(totalWorkedMinutes / 60);
      const totalM = totalWorkedMinutes % 60;
      const workDaysInMonth = days.filter(d => workDays.includes(d.getDay())).length;
      const expectedHours = workDaysInMonth * (schedule?.daily_hours || 8);
      const overtimeH = Math.floor(totalOvertime / 60);
      const overtimeM = totalOvertime % 60;

      doc.text(`Total Trabalhado: ${totalH}h ${totalM}min`, 18, yPos + 4);
      doc.text(`Carga Prevista: ${expectedHours}h`, 18, yPos + 12);
      doc.text(`Horas Extras: ${overtimeH}h ${overtimeM}min`, pageWidth / 2 + 4, yPos + 4);
      doc.text(`Atrasos: ${totalDelays} | Faltas: ${totalAbsences}`, pageWidth / 2 + 4, yPos + 12);

      const approvedJust = justifications.filter(j => j.status === 'approved').length;
      doc.setFontSize(7);
      doc.text(`Just. Aprovadas: ${approvedJust}`, pageWidth - 50, yPos + 12);

      // Signature area
      drawSignatureArea(doc, yPos + 32);
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
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Folha Diária
                    </div>
                  </SelectItem>
                  <SelectItem value="monthly">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Espelho Mensal
                    </div>
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
