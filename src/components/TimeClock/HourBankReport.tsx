import { Button } from '@/components/ui/button';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { formatMinutesToHM } from '@/lib/timeClockCalculations';
import type { MonthBalance } from './types';

interface Props {
  balances: MonthBalance[];
  userName: string;
  year: string;
}

export function HourBankReport({ balances, userName, year }: Props) {
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(`Relatório Banco de Horas - ${userName}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Ano: ${year}`, 14, 28);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 34);

    const headers = ['Mês', 'Esperadas', 'Trabalhadas', 'Extras', 'Atrasos', 'Saída Ant.', 'Faltas', 'Ajustes', 'Comp.', 'Saldo'];
    const startY = 44;
    const colWidth = 27;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    headers.forEach((h, i) => doc.text(h, 14 + i * colWidth, startY));

    doc.setFont('helvetica', 'normal');
    balances.forEach((b, row) => {
      const y = startY + 8 + row * 7;
      const vals = [
        b.monthLabel,
        formatMinutesToHM(b.expectedMinutes),
        formatMinutesToHM(b.workedMinutes),
        formatMinutesToHM(b.overtimeMinutes),
        formatMinutesToHM(b.delayMinutes),
        formatMinutesToHM(b.earlyExitMinutes),
        b.absenceCount.toString(),
        formatMinutesToHM(Math.abs(b.manualAdjustmentsMinutes)),
        formatMinutesToHM(Math.abs(b.compensationsMinutes)),
        `${b.balanceMinutes >= 0 ? '+' : '-'}${formatMinutesToHM(Math.abs(b.balanceMinutes))}`,
      ];
      vals.forEach((v, i) => doc.text(v, 14 + i * colWidth, y));
    });

    // Total row
    const totalY = startY + 8 + balances.length * 7 + 4;
    doc.setFont('helvetica', 'bold');
    const totalBalance = balances.reduce((a, b) => a + b.balanceMinutes, 0);
    doc.text('TOTAL', 14, totalY);
    doc.text(`${totalBalance >= 0 ? '+' : '-'}${formatMinutesToHM(Math.abs(totalBalance))}`, 14 + 9 * colWidth, totalY);

    doc.save(`banco-horas-${userName}-${year}.pdf`);
  };

  const exportExcel = () => {
    const data = balances.map(b => ({
      'Mês': b.monthLabel,
      'Horas Esperadas': formatMinutesToHM(b.expectedMinutes),
      'Horas Trabalhadas': formatMinutesToHM(b.workedMinutes),
      'Horas Extras': formatMinutesToHM(b.overtimeMinutes),
      'Atrasos': formatMinutesToHM(b.delayMinutes),
      'Saída Antecipada': formatMinutesToHM(b.earlyExitMinutes),
      'Faltas': b.absenceCount,
      'Ajustes Manuais': formatMinutesToHM(Math.abs(b.manualAdjustmentsMinutes)),
      'Compensações': formatMinutesToHM(Math.abs(b.compensationsMinutes)),
      'Saldo': `${b.balanceMinutes >= 0 ? '+' : '-'}${formatMinutesToHM(Math.abs(b.balanceMinutes))}`,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Banco de Horas');
    XLSX.writeFile(wb, `banco-horas-${userName}-${year}.xlsx`);
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={exportPDF}>
        <FileDown className="h-4 w-4 mr-1" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={exportExcel}>
        <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
      </Button>
    </div>
  );
}
