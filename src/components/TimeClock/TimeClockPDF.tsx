import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileText, Loader2, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TimeClockPDFProps {
  userId?: string;
  userName?: string;
  companyName?: string;
  companyCNPJ?: string;
}

interface DayRecord {
  date: string;
  dayOfWeek: string;
  entry: string;
  breakStart: string;
  breakEnd: string;
  exit: string;
  totalHours: string;
  status: string;
  delay: number;
  justification?: string;
}

export function TimeClockPDF({ userId, userName, companyName = 'Empresa', companyCNPJ }: TimeClockPDFProps) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const { toast } = useToast();

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
      
      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('FOLHA DE PONTO DIÁRIA', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(companyName || 'Empresa', pageWidth / 2, 28, { align: 'center' });
      if (companyCNPJ) {
        doc.text(`CNPJ: ${companyCNPJ}`, pageWidth / 2, 35, { align: 'center' });
      }

      // Info do colaborador
      let yPos = 55;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Colaborador:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(userName || 'Não informado', 50, yPos);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Data:', 120, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(format(parseISO(selectedDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }), 135, yPos);

      // Registros
      yPos += 20;
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos - 6, pageWidth - 28, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('REGISTROS DO DIA', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 15;
      
      const entry = records?.find(r => r.clock_type === 'entrada');
      const breakStart = records?.find(r => r.clock_type === 'pausa_inicio');
      const breakEnd = records?.find(r => r.clock_type === 'pausa_fim');
      const exit = records?.find(r => r.clock_type === 'saida');

      const recordRows = [
        { label: 'Entrada', time: entry?.clock_time, location: entry?.city ? `${entry.city}/${entry.state}` : null },
        { label: 'Início Pausa', time: breakStart?.clock_time, location: null },
        { label: 'Fim Pausa', time: breakEnd?.clock_time, location: null },
        { label: 'Saída', time: exit?.clock_time, location: exit?.city ? `${exit.city}/${exit.state}` : null },
      ];

      recordRows.forEach((row, index) => {
        doc.setFont('helvetica', 'bold');
        doc.text(row.label + ':', 20, yPos);
        doc.setFont('helvetica', 'normal');
        
        if (row.time) {
          const timeStr = row.time.includes('T') 
            ? format(parseISO(row.time), 'HH:mm:ss') 
            : row.time.slice(0, 8);
          doc.text(timeStr, 60, yPos);
          
          if (row.location) {
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text(`📍 ${row.location}`, 90, yPos);
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(11);
          }
        } else {
          doc.setTextColor(150, 150, 150);
          doc.text('Não registrado', 60, yPos);
          doc.setTextColor(0, 0, 0);
        }
        
        yPos += 10;
      });

      // Cálculo de horas
      yPos += 10;
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos - 6, pageWidth - 28, 12, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('RESUMO', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 15;
      
      let totalMinutes = 0;
      let breakMinutes = 0;
      
      if (entry && exit) {
        const entryTime = parseISO(entry.clock_time);
        const exitTime = parseISO(exit.clock_time);
        totalMinutes = Math.floor((exitTime.getTime() - entryTime.getTime()) / 60000);
        
        if (breakStart && breakEnd) {
          const breakStartTime = parseISO(breakStart.clock_time);
          const breakEndTime = parseISO(breakEnd.clock_time);
          breakMinutes = Math.floor((breakEndTime.getTime() - breakStartTime.getTime()) / 60000);
          totalMinutes -= breakMinutes;
        }
      }

      const totalHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      doc.setFont('helvetica', 'bold');
      doc.text('Total Trabalhado:', 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${totalHours}h ${remainingMinutes}min`, 70, yPos);

      doc.setFont('helvetica', 'bold');
      doc.text('Intervalo:', 110, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${Math.floor(breakMinutes / 60)}h ${breakMinutes % 60}min`, 140, yPos);

      // Justificativas
      if (justifications && justifications.length > 0) {
        yPos += 20;
        doc.setFillColor(255, 243, 205);
        doc.rect(14, yPos - 6, pageWidth - 28, 12, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text('JUSTIFICATIVAS', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 15;
        justifications.forEach((just: any) => {
          doc.setFont('helvetica', 'bold');
          doc.text(`• ${just.justification_type}:`, 20, yPos);
          doc.setFont('helvetica', 'normal');
          doc.text(just.description.substring(0, 60), 60, yPos);
          doc.text(`[${just.status}]`, 170, yPos);
          yPos += 8;
        });
      }

      // Assinatura
      yPos = 240;
      doc.setDrawColor(0, 0, 0);
      doc.line(30, yPos, 90, yPos);
      doc.line(120, yPos, 180, yPos);
      
      doc.setFontSize(9);
      doc.text('Assinatura do Colaborador', 60, yPos + 6, { align: 'center' });
      doc.text('Assinatura do Gestor', 150, yPos + 6, { align: 'center' });

      // Rodapé
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
        pageWidth / 2, 
        285, 
        { align: 'center' }
      );

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

      const { data: records } = await supabase
        .from('time_clock')
        .select('*')
        .eq('user_id', userId)
        .gte('clock_date', startDate)
        .lte('clock_date', endDate)
        .order('clock_date', { ascending: true })
        .order('clock_time', { ascending: true });

      const { data: justifications } = await supabase
        .from('time_clock_justifications')
        .select('*')
        .eq('user_id', userId)
        .gte('reference_date', startDate)
        .lte('reference_date', endDate);

      const { data: schedule } = await supabase
        .from('time_clock_schedules')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFillColor(59, 130, 246);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('ESPELHO DE PONTO MENSAL', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(companyName || 'Empresa', pageWidth / 2, 28, { align: 'center' });
      if (companyCNPJ) {
        doc.text(`CNPJ: ${companyCNPJ}`, pageWidth / 2, 35, { align: 'center' });
      }

      // Info
      let yPos = 50;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Colaborador:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(userName || 'Não informado', 45, yPos);
      
      doc.setFont('helvetica', 'bold');
      doc.text('Período:', 120, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(format(parseISO(startDate), "MMMM 'de' yyyy", { locale: ptBR }), 145, yPos);

      yPos += 8;
      if (schedule) {
        doc.setFont('helvetica', 'bold');
        doc.text('Jornada:', 14, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(`${schedule.entry_time?.slice(0, 5)} às ${schedule.exit_time?.slice(0, 5)} | ${schedule.daily_hours}h/dia`, 40, yPos);
      }

      // Tabela
      yPos += 15;
      
      // Header da tabela
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos - 4, pageWidth - 28, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
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

      // Agrupar registros por dia
      const days = eachDayOfInterval({
        start: parseISO(startDate),
        end: parseISO(endDate),
      });

      let totalWorkedMinutes = 0;
      let totalDelays = 0;
      let totalAbsences = 0;
      let totalOvertime = 0;
      const expectedDailyMinutes = (schedule?.daily_hours || 8) * 60;
      const workDays = schedule?.work_days || [1, 2, 3, 4, 5];

      days.forEach((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayRecords = records?.filter(r => r.clock_date === dateStr) || [];
        const dayOfWeek = day.getDay();
        const isWorkDay = workDays.includes(dayOfWeek);
        
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        const entry = dayRecords.find(r => r.clock_type === 'entrada');
        const breakStart = dayRecords.find(r => r.clock_type === 'pausa_inicio');
        const breakEnd = dayRecords.find(r => r.clock_type === 'pausa_fim');
        const exit = dayRecords.find(r => r.clock_type === 'saida');

        let workedMinutes = 0;
        let status = isWorkDay ? (entry ? (exit ? 'OK' : 'INC') : 'FALTA') : 'FDS';
        let delay = 0;

        if (entry && exit) {
          const entryTime = parseISO(entry.clock_time);
          const exitTime = parseISO(exit.clock_time);
          workedMinutes = Math.floor((exitTime.getTime() - entryTime.getTime()) / 60000);
          
          if (breakStart && breakEnd) {
            const breakMinutes = Math.floor((parseISO(breakEnd.clock_time).getTime() - parseISO(breakStart.clock_time).getTime()) / 60000);
            workedMinutes -= breakMinutes;
          }

          // Verificar atraso
          if (schedule) {
            const [scheduleHour, scheduleMin] = schedule.entry_time.split(':').map(Number);
            const scheduledMinutes = scheduleHour * 60 + scheduleMin + (schedule.tolerance_minutes || 0);
            const actualMinutes = entryTime.getHours() * 60 + entryTime.getMinutes();
            
            if (actualMinutes > scheduledMinutes) {
              delay = actualMinutes - scheduledMinutes;
              status = 'ATR';
              totalDelays++;
            }
          }

          totalWorkedMinutes += workedMinutes;

          if (workedMinutes > expectedDailyMinutes) {
            totalOvertime += workedMinutes - expectedDailyMinutes;
          }
        } else if (isWorkDay && !entry) {
          totalAbsences++;
        }

        const formatTimeField = (record: any) => {
          if (!record) return '-';
          const time = record.clock_time;
          return time.includes('T') ? format(parseISO(time), 'HH:mm') : time.slice(0, 5);
        };

        const hours = Math.floor(workedMinutes / 60);
        const mins = workedMinutes % 60;

        // Cor de fundo para fins de semana
        if (!isWorkDay) {
          doc.setFillColor(248, 248, 248);
          doc.rect(14, yPos - 3, pageWidth - 28, 6, 'F');
        }

        doc.setFontSize(7);
        doc.text(format(day, 'dd/MM'), 16, yPos);
        doc.text(format(day, 'EEE', { locale: ptBR }), 36, yPos);
        doc.text(formatTimeField(entry), 52, yPos);
        doc.text(formatTimeField(breakStart), 75, yPos);
        doc.text(formatTimeField(breakEnd), 95, yPos);
        doc.text(formatTimeField(exit), 118, yPos);
        doc.text(workedMinutes > 0 ? `${hours}h${mins.toString().padStart(2, '0')}` : '-', 138, yPos);
        
        // Status com cor
        if (status === 'OK') {
          doc.setTextColor(34, 139, 34);
        } else if (status === 'ATR') {
          doc.setTextColor(255, 165, 0);
        } else if (status === 'FALTA') {
          doc.setTextColor(220, 20, 60);
        } else if (status === 'INC') {
          doc.setTextColor(255, 140, 0);
        } else {
          doc.setTextColor(150, 150, 150);
        }
        doc.text(status, 160, yPos);
        doc.setTextColor(0, 0, 0);
        
        // Justificativa
        const dayJust = justifications?.find(j => j.reference_date === dateStr);
        if (dayJust) {
          doc.text('✓', 185, yPos);
        }

        yPos += 6;
      });

      // Resumo final
      yPos += 10;
      doc.setFillColor(59, 130, 246);
      doc.rect(14, yPos - 4, pageWidth - 28, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      const totalHours = Math.floor(totalWorkedMinutes / 60);
      const totalMins = totalWorkedMinutes % 60;
      const expectedHours = workDays.length * days.filter(d => workDays.includes(d.getDay())).length * (schedule?.daily_hours || 8);
      const overtimeHours = Math.floor(totalOvertime / 60);
      const overtimeMins = totalOvertime % 60;

      doc.text(`Total Trabalhado: ${totalHours}h ${totalMins}min`, 20, yPos + 4);
      doc.text(`Carga Prevista: ${expectedHours}h`, 80, yPos + 4);
      doc.text(`Horas Extras: ${overtimeHours}h ${overtimeMins}min`, 140, yPos + 4);
      
      doc.text(`Atrasos: ${totalDelays}`, 20, yPos + 14);
      doc.text(`Faltas: ${totalAbsences}`, 80, yPos + 14);
      doc.text(`Just. Aprovadas: ${justifications?.filter(j => j.status === 'approved').length || 0}`, 140, yPos + 14);

      // Assinaturas
      yPos += 40;
      doc.setTextColor(0, 0, 0);
      doc.setDrawColor(0, 0, 0);
      doc.line(30, yPos, 90, yPos);
      doc.line(120, yPos, 180, yPos);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Assinatura do Colaborador', 60, yPos + 5, { align: 'center' });
      doc.text('Assinatura do Gestor', 150, yPos + 5, { align: 'center' });

      // Rodapé
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")} | Este documento é válido para fins de controle interno`,
        pageWidth / 2, 
        285, 
        { align: 'center' }
      );

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
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Mês</Label>
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={reportType === 'daily' ? generateDailyPDF : generateMonthlyPDF}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
