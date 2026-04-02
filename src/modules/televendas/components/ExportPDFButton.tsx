import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import { Televenda, TelevendasFilters } from "../types";
import { formatCurrency, formatDate } from "../utils";
import type { TelevendasStats } from "../hooks/useTelevendasStats";

interface ExportPDFButtonProps {
  filteredTelevendas: Televenda[];
  filteredStats: TelevendasStats;
  filters: TelevendasFilters;
  isGestorOrAdmin: boolean;
}

export function ExportPDFButton({ filteredTelevendas, filteredStats, filters, isGestorOrAdmin }: ExportPDFButtonProps) {
  const [exporting, setExporting] = useState(false);

  if (!isGestorOrAdmin) return null;

  const handleExport = () => {
    setExporting(true);
    try {
      const doc = new jsPDF("portrait", "mm", "a4");
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      let y = margin;

      const addFooter = (pageNum: number, totalPages: number) => {
        doc.setFontSize(8);
        doc.setTextColor(130, 130, 130);
        doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, pageH - 8);
        doc.text(`Página ${pageNum} de ${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
      };

      const checkPage = (needed: number) => {
        if (y + needed > pageH - 18) {
          doc.addPage();
          y = margin;
        }
      };

      // Header
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, 0, pageW, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório Gestão de Televendas", margin, 18);
      y = 36;

      // Active filters
      const activeFilters: string[] = [];
      if (filters.userId && filters.userId !== "all") activeFilters.push(`Colaborador: ${filters.userId}`);
      if (filters.product && filters.product !== "all") activeFilters.push(`Produto: ${filters.product}`);
      if (filters.month && filters.month !== "all") activeFilters.push(`Mês: ${filters.month}`);
      if (filters.status && filters.status !== "all") activeFilters.push(`Status: ${filters.status}`);
      if (filters.search) activeFilters.push(`Busca: ${filters.search}`);

      if (activeFilters.length > 0) {
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.setFont("helvetica", "normal");
        doc.text(`Filtros: ${activeFilters.join(" | ")}`, margin, y);
        y += 8;
      }

      // KPI Cards
      const kpis = [
        { label: "Total", value: String(filteredStats.totalPropostas), color: [59, 130, 246] },
        { label: "Pagas", value: String(filteredStats.paidCount), color: [34, 197, 94] },
        { label: "Ativas", value: String(filteredStats.totalPropostasAtivas), color: [234, 179, 8] },
        { label: "Valor Pago", value: formatCurrency(filteredStats.totalBrutoPago), color: [16, 185, 129] },
        { label: "Críticos", value: String(filteredStats.criticos), color: [220, 38, 38] },
        { label: "Alertas", value: String(filteredStats.alertas), color: [245, 158, 11] },
      ];

      const cardW = (pageW - margin * 2 - 10) / 3;
      const cardH = 18;

      kpis.forEach((kpi, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = margin + col * (cardW + 5);
        const cy = y + row * (cardH + 4);

        checkPage(cardH + 4);

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, cy, cardW, cardH, 2, 2, "F");
        doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.rect(x, cy, 3, cardH, "F");

        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(kpi.value, x + 8, cy + 8);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.label, x + 8, cy + 14);
      });

      y += Math.ceil(kpis.length / 3) * (cardH + 4) + 8;

      // Table header
      checkPage(12);
      const cols = [
        { label: "Nome", w: 38 },
        { label: "CPF", w: 26 },
        { label: "Telefone", w: 28 },
        { label: "Produto", w: 24 },
        { label: "Banco", w: 22 },
        { label: "Status", w: 22 },
        { label: "Valor", w: 22 },
      ];
      const tableW = cols.reduce((s, c) => s + c.w, 0);

      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, tableW, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");

      let cx = margin;
      cols.forEach((col) => {
        doc.text(col.label, cx + 2, y + 5.5);
        cx += col.w;
      });
      y += 8;

      // Table rows
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);

      filteredTelevendas.forEach((tv, idx) => {
        checkPage(7);

        if (idx % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y, tableW, 7, "F");
        }

        doc.setTextColor(30, 41, 59);
        cx = margin;

        const rowData = [
          (tv.nome || "").substring(0, 22),
          tv.cpf || "",
          tv.telefone || "",
          (tv.tipo_operacao || "").substring(0, 14),
          (tv.banco || "").substring(0, 12),
          (tv.status || "").substring(0, 12),
          formatCurrency(tv.troco),
        ];

        rowData.forEach((val, ci) => {
          doc.text(val, cx + 2, y + 5);
          cx += cols[ci].w;
        });

        y += 7;
      });

      // Add page numbers
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
      }

      const dateStr = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
      doc.save(`televendas_relatorio_${dateStr}.pdf`);
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={exporting}
      className="h-10 rounded-xl gap-1 text-xs"
    >
      <FileDown className="h-4 w-4" />
      <span className="hidden sm:inline">{exporting ? "Exportando..." : "Exportar PDF"}</span>
    </Button>
  );
}
