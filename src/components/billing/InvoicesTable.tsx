import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, FileDown } from "lucide-react";

type Invoice = {
  id: string;
  module_slug: string | null;
  amount_paid: number;
  currency: string | null;
  status: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
};

const fmtMoney = (v: number, c = "brl") =>
  v.toLocaleString("pt-BR", { style: "currency", currency: c.toUpperCase() });
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

const statusBadge = (s: string) => {
  if (s === "paid") return <Badge className="bg-emerald-600">Pago</Badge>;
  if (s === "open") return <Badge variant="destructive">Em aberto</Badge>;
  if (s === "void") return <Badge variant="outline">Anulada</Badge>;
  return <Badge variant="secondary">{s}</Badge>;
};

export function InvoicesTable() {
  const [rows, setRows] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("invoices" as any)
        .select("id, module_slug, amount_paid, currency, status, hosted_invoice_url, invoice_pdf, period_start, period_end, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  if (!rows.length) return <p className="text-sm text-muted-foreground p-4">Nenhuma fatura ainda.</p>;

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Módulo</TableHead>
            <TableHead>Período</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell>{fmtDate(r.created_at)}</TableCell>
              <TableCell className="font-mono text-xs">{r.module_slug || "—"}</TableCell>
              <TableCell className="text-sm">
                {fmtDate(r.period_start)} → {fmtDate(r.period_end)}
              </TableCell>
              <TableCell>{fmtMoney(Number(r.amount_paid), r.currency || "brl")}</TableCell>
              <TableCell>{statusBadge(r.status)}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {r.hosted_invoice_url && (
                    <Button asChild size="sm" variant="ghost">
                      <a href={r.hosted_invoice_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                  {r.invoice_pdf && (
                    <Button asChild size="sm" variant="ghost">
                      <a href={r.invoice_pdf} target="_blank" rel="noreferrer">
                        <FileDown className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
