import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileDown, FileSpreadsheet, FileText } from "lucide-react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { Televenda, TelevendasFilters, STATUS_CONFIG } from "../types";
import { formatCurrency, formatDate } from "../utils";
import type { TelevendasStats } from "../hooks/useTelevendasStats";
import { toast } from "sonner";

interface ExportTelevendasButtonProps {
  filteredTelevendas: Televenda[];
  filteredStats: TelevendasStats;
  filters: TelevendasFilters;
  isGestorOrAdmin: boolean;
}

type ColumnKey =
  | "nome"
  | "cpf"
  | "telefone"
  | "tipo_operacao"
  | "banco"
  | "status"
  | "parcela"
  | "troco"
  | "saldo_devedor"
  | "data_venda"
  | "data_pagamento"
  | "observacao"
  | "user";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  width: number; // mm para PDF A4 paisagem
  getValue: (tv: Televenda) => string;
}

const STATUS_LABEL = (s: string) => STATUS_CONFIG[s]?.label || s || "-";

const ALL_COLUMNS: ColumnDef[] = [
  { key: "nome", label: "Nome", width: 38, getValue: (tv) => tv.nome || "-" },
  { key: "cpf", label: "CPF", width: 26, getValue: (tv) => tv.cpf || "-" },
  { key: "telefone", label: "Telefone", width: 28, getValue: (tv) => tv.telefone || "-" },
  { key: "tipo_operacao", label: "Produto", width: 26, getValue: (tv) => tv.tipo_operacao || "-" },
  { key: "banco", label: "Banco", width: 24, getValue: (tv) => tv.banco || "-" },
  { key: "status", label: "Status", width: 26, getValue: (tv) => STATUS_LABEL(tv.status) },
  { key: "parcela", label: "Valor Parcela", width: 24, getValue: (tv) => formatCurrency(tv.parcela) },
  { key: "troco", label: "Troco", width: 22, getValue: (tv) => formatCurrency(tv.troco) },
  { key: "saldo_devedor", label: "Saldo Devedor", width: 26, getValue: (tv) => formatCurrency(tv.saldo_devedor) },
  { key: "data_venda", label: "Data Venda", width: 22, getValue: (tv) => formatDate(tv.data_venda) },
  { key: "data_pagamento", label: "Data Pagamento", width: 24, getValue: (tv) => formatDate(tv.data_pagamento || "") },
  { key: "observacao", label: "Observação", width: 40, getValue: (tv) => tv.observacao || "-" },
  { key: "user", label: "Operador", width: 30, getValue: (tv) => tv.user?.name || "-" },
];

const DEFAULT_COLS: ColumnKey[] = ["nome", "cpf", "telefone", "tipo_operacao", "banco", "status", "parcela"];
const STORAGE_KEY = "televendas_export_cols_v1";
const FORMAT_KEY = "televendas_export_format_v1";

export function ExportTelevendasButton({
  filteredTelevendas,
  filteredStats,
  filters,
  isGestorOrAdmin,
}: ExportTelevendasButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [selected, setSelected] = useState<ColumnKey[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ColumnKey[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {}
    return DEFAULT_COLS;
  });

  const [format, setFormat] = useState<"pdf" | "xlsx">(() => {
    return (localStorage.getItem(FORMAT_KEY) as "pdf" | "xlsx") || "pdf";
  });

  if (!isGestorOrAdmin) return null;

  const toggleCol = (key: ColumnKey) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelected(ALL_COLUMNS.map((c) => c.key));
  const clearAll = () => setSelected([]);
  const resetDefault = () => setSelected(DEFAULT_COLS);

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
      localStorage.setItem(FORMAT_KEY, format);
    } catch {}
  };

  const cols = ALL_COLUMNS.filter((c) => selected.includes(c.key));

  const exportXlsx = () => {
    const rows = filteredTelevendas.map((tv) => {
      const obj: Record<string, string | number> = {};
      cols.forEach((c) => {
        // valores numéricos puros para colunas monetárias
        if (c.key === "parcela") obj[c.label] = Number(tv.parcela || 0);
        else if (c.key === "troco") obj[c.label] = Number(tv.troco || 0);
        else if (c.key === "saldo_devedor") obj[c.label] = Number(tv.saldo_devedor || 0);
        else obj[c.label] = c.getValue(tv);
      });
      return obj;
    });

    const wb = XLSX.utils.book_new();

    // Resumo
    const resumo = [
      { Métrica: "Total de Propostas", Valor: filteredStats.totalPropostas },
      { Métrica: "Propostas Pagas", Valor: filteredStats.paidCount },
      { Métrica: "Propostas Ativas", Valor: filteredStats.totalPropostasAtivas },
      { Métrica: "Críticos", Valor: filteredStats.criticos },
      { Métrica: "Alertas", Valor: filteredStats.alertas },
      { Métrica: "Valor Total Pago", Valor: filteredStats.totalBrutoPago },
    ];
    const wsResumo = XLSX.utils.json_to_sheet(resumo);
    XLSX.utils.book_append_sheet(wb, wsResumo, "Resumo");

    const ws = XLSX.utils.json_to_sheet(rows);
    // Auto-width simples
    const colWidths = cols.map((c) => ({
      wch: Math.max(c.label.length + 2, 14),
    }));
    (ws as any)["!cols"] = colWidths;
    XLSX.utils.book_append_sheet(wb, ws, "Televendas");

    const dateStr = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    XLSX.writeFile(wb, `televendas_${dateStr}.xlsx`);
  };

  const exportPdf = () => {
    // Decide orientação por largura total das colunas
    const totalW = cols.reduce((s, c) => s + c.width, 0);
    const orientation: "portrait" | "landscape" = totalW > 180 ? "landscape" : "portrait";
    const doc = new jsPDF(orientation, "mm", "a4");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const usableW = pageW - margin * 2;
    let y = margin;

    // Re-escala larguras se necessário
    const scale = totalW > usableW ? usableW / totalW : 1;
    const scaledCols = cols.map((c) => ({ ...c, w: c.width * scale }));
    const tableW = scaledCols.reduce((s, c) => s + c.w, 0);

    const checkPage = (needed: number) => {
      if (y + needed > pageH - 14) {
        doc.addPage();
        y = margin;
        drawHeader();
        drawTableHeader();
      }
    };

    const drawHeader = () => {
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageW, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Relatório Gestão de Televendas", margin, 14);
      y = 28;
    };

    const drawTableHeader = () => {
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, tableW, 7, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      let cx = margin;
      scaledCols.forEach((col) => {
        doc.text(col.label, cx + 1.5, y + 5);
        cx += col.w;
      });
      y += 7;
    };

    drawHeader();

    // Filtros ativos
    const activeFilters: string[] = [];
    if (filters.product && filters.product !== "all") activeFilters.push(`Produto: ${filters.product}`);
    if (filters.month && filters.month !== "all") activeFilters.push(`Mês: ${filters.month}`);
    if (filters.status && filters.status !== "all") activeFilters.push(`Status: ${filters.status}`);
    if (filters.search) activeFilters.push(`Busca: ${filters.search}`);
    if (activeFilters.length) {
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`Filtros: ${activeFilters.join(" | ")}`, margin, y);
      y += 6;
    }

    // KPIs (compactos)
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text(
      `Total: ${filteredStats.totalPropostas}  |  Pagas: ${filteredStats.paidCount}  |  Ativas: ${filteredStats.totalPropostasAtivas}  |  Valor Pago: ${formatCurrency(filteredStats.totalBrutoPago)}`,
      margin,
      y
    );
    y += 6;

    drawTableHeader();

    // Linhas
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    filteredTelevendas.forEach((tv, idx) => {
      checkPage(6);
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, tableW, 6, "F");
      }
      doc.setTextColor(30, 41, 59);
      let cx = margin;
      scaledCols.forEach((col) => {
        const val = col.getValue(tv);
        const maxChars = Math.max(4, Math.floor(col.w / 1.6));
        const trimmed = val.length > maxChars ? val.substring(0, maxChars - 1) + "…" : val;
        doc.text(trimmed, cx + 1.5, y + 4.2);
        cx += col.w;
      });
      y += 6;
    });

    // Footer páginas
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
      doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margin, pageH - 5);
      doc.text(`Página ${i} de ${totalPages}`, pageW - margin, pageH - 5, { align: "right" });
    }

    const dateStr = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-");
    doc.save(`televendas_${dateStr}.pdf`);
  };

  const handleExport = async () => {
    if (!selected.length) {
      toast.error("Selecione pelo menos uma coluna");
      return;
    }
    setExporting(true);
    try {
      persist();
      if (format === "xlsx") exportXlsx();
      else exportPdf();
      toast.success(`Relatório ${format.toUpperCase()} gerado!`);
      setOpen(false);
    } catch (err) {
      console.error("Erro ao exportar:", err);
      toast.error("Erro ao gerar relatório");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 rounded-xl gap-1 text-xs">
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Personalizar Exportação</DialogTitle>
          <DialogDescription>
            Escolha as colunas e o formato. Sua seleção fica salva para a próxima vez.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Formato */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Formato</Label>
            <RadioGroup
              value={format}
              onValueChange={(v) => setFormat(v as "pdf" | "xlsx")}
              className="grid grid-cols-2 gap-3"
            >
              <label
                htmlFor="fmt-pdf"
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                  format === "pdf" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem id="fmt-pdf" value="pdf" />
                <FileText className="h-5 w-5 text-red-600" />
                <div>
                  <div className="font-medium text-sm">PDF</div>
                  <div className="text-xs text-muted-foreground">Pronto para imprimir</div>
                </div>
              </label>
              <label
                htmlFor="fmt-xlsx"
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                  format === "xlsx" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem id="fmt-xlsx" value="xlsx" />
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium text-sm">Excel (.xlsx)</div>
                  <div className="text-xs text-muted-foreground">Editável e filtrável</div>
                </div>
              </label>
            </RadioGroup>
          </div>

          {/* Colunas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Colunas ({selected.length}/{ALL_COLUMNS.length})
              </Label>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={selectAll} className="h-7 text-xs">
                  Todas
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs">
                  Nenhuma
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetDefault} className="h-7 text-xs">
                  Padrão
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg border p-3 bg-muted/30">
              {ALL_COLUMNS.map((col) => (
                <label
                  key={col.key}
                  htmlFor={`col-${col.key}`}
                  className="flex items-center gap-2 cursor-pointer text-sm hover:bg-background rounded px-2 py-1.5 transition"
                >
                  <Checkbox
                    id={`col-${col.key}`}
                    checked={selected.includes(col.key)}
                    onCheckedChange={() => toggleCol(col.key)}
                  />
                  <span>{col.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            {filteredTelevendas.length} registro(s) serão exportados conforme os filtros atuais.
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-background pt-3 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={exporting}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={exporting || !selected.length}>
            <FileDown className="h-4 w-4 mr-1" />
            {exporting ? "Gerando..." : `Gerar ${format.toUpperCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
