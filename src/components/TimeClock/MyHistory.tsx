import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Download, Clock, MapPin, Loader2 } from 'lucide-react';
import { useTimeClock } from '@/hooks/useTimeClock';
import { clockTypeLabels, statusLabels, statusColors, type TimeClock, type TimeClockType, type TimeClockStatus } from './types';
import { format, startOfMonth, endOfMonth, differenceInMinutes, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';

interface MyHistoryProps {
  userId: string;
  userName: string;
}

interface DailyGroup {
  date: string;
  records: TimeClock[];
  totalMinutes: number;
  status: TimeClockStatus;
}

export function MyHistory({ userId, userName }: MyHistoryProps) {
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [history, setHistory] = useState<TimeClock[]>([]);
  const [loading, setLoading] = useState(false);

  const { getUserHistory } = useTimeClock(userId);

  useEffect(() => {
    loadHistory();
  }, [startDate, endDate]);

  const loadHistory = async () => {
    setLoading(true);
    const data = await getUserHistory(startDate, endDate);
    setHistory(data);
    setLoading(false);
  };

  const groupByDate = (): DailyGroup[] => {
    const groups: Record<string, TimeClock[]> = {};
    history.forEach((record) => {
      const date = record.clock_date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(record);
    });

    return Object.entries(groups).map(([date, records]) => {
      const entrada = records.find((r) => r.clock_type === 'entrada');
      const saida = records.find((r) => r.clock_type === 'saida');
      const pausaInicio = records.find((r) => r.clock_type === 'pausa_inicio');
      const pausaFim = records.find((r) => r.clock_type === 'pausa_fim');

      let totalMinutes = 0;
      if (entrada && saida) {
        totalMinutes = differenceInMinutes(parseISO(saida.clock_time), parseISO(entrada.clock_time));
        if (pausaInicio && pausaFim) {
          totalMinutes -= differenceInMinutes(parseISO(pausaFim.clock_time), parseISO(pausaInicio.clock_time));
        }
      }

      let status: TimeClockStatus = 'pendente';
      if (entrada && saida) {
        status = records.some((r) => r.status === 'ajustado') ? 'ajustado' : 'completo';
      } else if (entrada) {
        status = 'incompleto';
      }

      return { date, records, totalMinutes, status };
    }).sort((a, b) => b.date.localeCompare(a.date));
  };

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const groups = groupByDate();

    doc.setFontSize(18);
    doc.text('Folha de Ponto', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(userName, 105, 25, { align: 'center' });
    doc.text(`Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`, 105, 32, { align: 'center' });

    let yPos = 45;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Data', 14, yPos);
    doc.text('Entrada', 45, yPos);
    doc.text('Pausa', 75, yPos);
    doc.text('Retorno', 105, yPos);
    doc.text('Saída', 135, yPos);
    doc.text('Total', 165, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    let totalHours = 0;

    groups.forEach((group) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      const entrada = group.records.find((r) => r.clock_type === 'entrada');
      const pausa = group.records.find((r) => r.clock_type === 'pausa_inicio');
      const retorno = group.records.find((r) => r.clock_type === 'pausa_fim');
      const saida = group.records.find((r) => r.clock_type === 'saida');

      doc.text(format(parseISO(group.date), 'dd/MM/yyyy'), 14, yPos);
      doc.text(entrada ? format(parseISO(entrada.clock_time), 'HH:mm') : '-', 45, yPos);
      doc.text(pausa ? format(parseISO(pausa.clock_time), 'HH:mm') : '-', 75, yPos);
      doc.text(retorno ? format(parseISO(retorno.clock_time), 'HH:mm') : '-', 105, yPos);
      doc.text(saida ? format(parseISO(saida.clock_time), 'HH:mm') : '-', 135, yPos);
      doc.text(formatMinutes(group.totalMinutes), 165, yPos);

      totalHours += group.totalMinutes;
      yPos += 6;
    });

    yPos += 10;
    doc.setFont('helvetica', 'bold');
    doc.text(`Total do Período: ${formatMinutes(totalHours)}`, 14, yPos);

    doc.save(`folha-ponto-${format(new Date(), 'yyyy-MM')}.pdf`);
  };

  const groups = groupByDate();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Meu Histórico
            </CardTitle>
            <CardDescription>Visualize seus registros de ponto</CardDescription>
          </div>
          <Button onClick={exportToPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">De:</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Até:</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-auto"
            />
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
                  <TableHead>Entrada</TableHead>
                  <TableHead>Pausa</TableHead>
                  <TableHead>Retorno</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => {
                  const entrada = group.records.find((r) => r.clock_type === 'entrada');
                  const pausa = group.records.find((r) => r.clock_type === 'pausa_inicio');
                  const retorno = group.records.find((r) => r.clock_type === 'pausa_fim');
                  const saida = group.records.find((r) => r.clock_type === 'saida');

                  return (
                    <TableRow key={group.date}>
                      <TableCell className="font-medium">
                        {format(parseISO(group.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        {entrada ? (
                          <div className="flex items-center gap-1">
                            {format(parseISO(entrada.clock_time), 'HH:mm')}
                            {entrada.city && (
                              <MapPin className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {pausa ? format(parseISO(pausa.clock_time), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {retorno ? format(parseISO(retorno.clock_time), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        {saida ? format(parseISO(saida.clock_time), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>{formatMinutes(group.totalMinutes)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[group.status]}>
                          {statusLabels[group.status]}
                        </Badge>
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
