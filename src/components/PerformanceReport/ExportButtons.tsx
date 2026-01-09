import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserPerformance, ReportSummary } from "./types";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ExportButtonsProps {
  data: UserPerformance[];
  summary: ReportSummary;
  startDate: Date;
  endDate: Date;
}

export function ExportButtons({ data, summary, startDate, endDate }: ExportButtonsProps) {
  const formatDateRange = () => {
    return `${format(startDate, "dd-MM-yyyy", { locale: ptBR })}_${format(
      endDate,
      "dd-MM-yyyy",
      { locale: ptBR }
    )}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const exportToExcel = () => {
    try {
      // Summary sheet
      const summaryData = [
        { Métrica: "Colaboradores Ativos", Valor: summary.totalActiveUsers },
        { Métrica: "Leads Premium", Valor: summary.premiumLeadsWorked },
        { Métrica: "Leads Ativados", Valor: summary.activatedLeadsWorked },
        { Métrica: "Propostas Criadas", Valor: summary.totalProposalsCreated },
        { Métrica: "Propostas Pagas", Valor: summary.proposalsPaid },
        { Métrica: "Propostas Canceladas", Valor: summary.proposalsCancelled },
        { Métrica: "Valor Total Vendido", Valor: formatCurrency(summary.totalSoldValue) },
        { Métrica: "Total de Comissões", Valor: formatCurrency(summary.totalCommissions) },
      ];

      // Performance sheet
      const performanceData = data.map((user) => ({
        Colaborador: user.userName,
        "Leads Premium": user.premiumLeads,
        "Leads Ativados": user.activatedLeads,
        "Propostas Criadas": user.proposalsCreated,
        "Propostas Pagas": user.proposalsPaid,
        "Propostas Canceladas": user.proposalsCancelled,
        "Taxa de Conversão (%)": user.conversionRate.toFixed(1),
        "Valor Total Vendido": formatCurrency(user.totalSold),
        "Comissão Gerada": formatCurrency(user.commissionGenerated),
        "Última Atividade": user.lastActivity
          ? format(new Date(user.lastActivity), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : "-",
      }));

      const wb = XLSX.utils.book_new();
      
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Resumo");

      const wsPerformance = XLSX.utils.json_to_sheet(performanceData);
      XLSX.utils.book_append_sheet(wb, wsPerformance, "Desempenho");

      XLSX.writeFile(wb, `relatorio_desempenho_${formatDateRange()}.xlsx`);
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  const exportToCSV = () => {
    try {
      const headers = [
        "Colaborador",
        "Leads Premium",
        "Leads Ativados",
        "Propostas Criadas",
        "Propostas Pagas",
        "Propostas Canceladas",
        "Taxa de Conversão (%)",
        "Valor Total Vendido",
        "Comissão Gerada",
        "Última Atividade",
      ].join(",");

      const rows = data.map((user) =>
        [
          `"${user.userName}"`,
          user.premiumLeads,
          user.activatedLeads,
          user.proposalsCreated,
          user.proposalsPaid,
          user.proposalsCancelled,
          user.conversionRate.toFixed(1),
          user.totalSold.toFixed(2),
          user.commissionGenerated.toFixed(2),
          user.lastActivity
            ? `"${format(new Date(user.lastActivity), "dd/MM/yyyy HH:mm", { locale: ptBR })}"`
            : '"-"',
        ].join(",")
      );

      const csv = [headers, ...rows].join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `relatorio_desempenho_${formatDateRange()}.csv`;
      link.click();
      toast.success("CSV exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast.error("Erro ao exportar CSV");
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Title
      doc.setFontSize(18);
      doc.text("Relatório de Desempenho", pageWidth / 2, 20, { align: "center" });

      // Date range
      doc.setFontSize(10);
      doc.text(
        `Período: ${format(startDate, "dd/MM/yyyy", { locale: ptBR })} - ${format(
          endDate,
          "dd/MM/yyyy",
          { locale: ptBR }
        )}`,
        pageWidth / 2,
        28,
        { align: "center" }
      );

      // Summary section
      doc.setFontSize(14);
      doc.text("Resumo Geral", 14, 40);

      doc.setFontSize(10);
      const summaryY = 48;
      doc.text(`Colaboradores Ativos: ${summary.totalActiveUsers}`, 14, summaryY);
      doc.text(`Leads Premium: ${summary.premiumLeadsWorked}`, 14, summaryY + 6);
      doc.text(`Leads Ativados: ${summary.activatedLeadsWorked}`, 14, summaryY + 12);
      doc.text(`Propostas Criadas: ${summary.totalProposalsCreated}`, 100, summaryY);
      doc.text(`Propostas Pagas: ${summary.proposalsPaid}`, 100, summaryY + 6);
      doc.text(`Propostas Canceladas: ${summary.proposalsCancelled}`, 100, summaryY + 12);
      doc.text(`Valor Total Vendido: ${formatCurrency(summary.totalSoldValue)}`, 14, summaryY + 18);
      doc.text(`Comissões Geradas: ${formatCurrency(summary.totalCommissions)}`, 100, summaryY + 18);

      // Performance table
      doc.setFontSize(14);
      doc.text("Desempenho por Colaborador", 14, 80);

      doc.setFontSize(8);
      let tableY = 88;
      
      // Table headers
      const headers = ["Nome", "Premium", "Ativados", "Criadas", "Pagas", "Conv.%", "Valor", "Comissão"];
      const colWidths = [40, 18, 18, 18, 15, 15, 30, 30];
      let xPos = 14;
      
      doc.setFont("helvetica", "bold");
      headers.forEach((header, i) => {
        doc.text(header, xPos, tableY);
        xPos += colWidths[i];
      });

      // Table rows
      doc.setFont("helvetica", "normal");
      data.forEach((user) => {
        tableY += 7;
        if (tableY > 270) {
          doc.addPage();
          tableY = 20;
        }

        xPos = 14;
        const rowData = [
          user.userName.substring(0, 18),
          user.premiumLeads.toString(),
          user.activatedLeads.toString(),
          user.proposalsCreated.toString(),
          user.proposalsPaid.toString(),
          `${user.conversionRate.toFixed(1)}%`,
          formatCurrency(user.totalSold),
          formatCurrency(user.commissionGenerated),
        ];

        rowData.forEach((cell, i) => {
          doc.text(cell, xPos, tableY);
          xPos += colWidths[i];
        });
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })} - Página ${i} de ${pageCount}`,
          pageWidth / 2,
          285,
          { align: "center" }
        );
      }

      doc.save(`relatorio_desempenho_${formatDateRange()}.pdf`);
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting to PDF:", error);
      toast.error("Erro ao exportar PDF");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileText className="h-4 w-4 mr-2" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
