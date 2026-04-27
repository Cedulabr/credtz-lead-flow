import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye, Loader2 } from "lucide-react";
import { useTelefoniaHistorico, type ConsultaRow } from "../hooks/useTelefoniaHistorico";
import { METODOS, methodLabel } from "../utils/methodConfig";
import { formatCpf } from "../utils/cpfMask";
import { ResultCard } from "./ResultCard";
import { supabase } from "@/integrations/supabase/client";

const ALL = "all";

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    success: { label: "Sucesso", className: "bg-green-600 text-white" },
    not_found: { label: "Não encontrado", className: "bg-secondary" },
    error: { label: "Erro", className: "bg-destructive text-destructive-foreground" },
    auth_error: { label: "Auth", className: "bg-destructive text-destructive-foreground" },
    quota_exceeded: { label: "Quota", className: "bg-destructive text-destructive-foreground" },
  };
  const m = map[status] || { label: status, className: "bg-secondary" };
  return <Badge className={m.className}>{m.label}</Badge>;
}

export function HistoricoTab({ onOpenLead }: { onOpenLead?: (id: string) => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [metodo, setMetodo] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [cpf, setCpf] = useState("");

  const filters = useMemo(
    () => ({
      from: from ? new Date(from + "T00:00:00").toISOString() : undefined,
      to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
      metodo: metodo !== ALL ? metodo : undefined,
      status: status !== ALL ? status : undefined,
      cpf: cpf || undefined,
    }),
    [from, to, metodo, status, cpf],
  );

  const { rows, usersMap, leadsMap, loading } = useTelefoniaHistorico(filters);
  const [selected, setSelected] = useState<ConsultaRow | null>(null);
  const [phones, setPhones] = useState<any[]>([]);
  const [loadingPhones, setLoadingPhones] = useState(false);

  const totals = useMemo(() => {
    const total = rows.length;
    const cache = rows.filter((r) => r.from_cache).length;
    const credits = rows.reduce((acc, r) => acc + (r.credits_used || 0), 0);
    return { total, cache, credits };
  }, [rows]);

  const openResult = async (row: ConsultaRow) => {
    setSelected(row);
    setLoadingPhones(true);
    setPhones([]);
    try {
      const { data } = await supabase
        .from("telefonia_numeros")
        .select("*")
        .eq("consulta_id", row.id);
      setPhones(data || []);
    } finally {
      setLoadingPhones(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <Label>De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Método</Label>
            <Select value={metodo} onValueChange={setMetodo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {METODOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="not_found">Não encontrado</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="auth_error">Auth error</SelectItem>
                <SelectItem value="quota_exceeded">Quota</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>CPF</Label>
            <Input
              placeholder="Buscar CPF"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Nome retornado</TableHead>
                <TableHead>Método</TableHead>
                <TableHead className="text-center">Telefones</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Lead</TableHead>
                <TableHead>Consultado por</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={9}>
                  <div className="py-8 flex items-center justify-center text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
                  </div>
                </TableCell></TableRow>
              )}
              {!loading && rows.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma consulta no período
                </TableCell></TableRow>
              )}
              {!loading && rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {new Date(r.queried_at).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell className="font-mono">{formatCpf(r.cpf)}</TableCell>
                  <TableCell>{r.nome_retornado || "—"}</TableCell>
                  <TableCell className="text-xs">{methodLabel(r.metodo)}</TableCell>
                  <TableCell className="text-center">{r.total_telefones ?? 0}</TableCell>
                  <TableCell>
                    {r.from_cache ? <Badge variant="secondary">Cache</Badge> : statusBadge(r.status)}
                  </TableCell>
                  <TableCell>
                    {r.lead_id ? (
                      <button
                        className="text-primary hover:underline text-xs"
                        onClick={() => onOpenLead?.(r.lead_id!)}
                      >
                        {leadsMap[r.lead_id] || "Ver lead"}
                      </button>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {r.queried_by ? usersMap[r.queried_by] || "—" : "—"}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => openResult(r)}>
                      <Eye className="h-4 w-4 mr-1" /> Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="p-3 border-t text-xs text-muted-foreground flex flex-wrap gap-x-4">
          <span>Total de consultas: <b>{totals.total}</b></span>
          <span>Créditos consumidos: <b>{totals.credits}</b></span>
          <span>Em cache: <b>{totals.cache}</b></span>
        </div>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              Consulta — {selected ? formatCpf(selected.cpf) : ""}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-4">
              {loadingPhones ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Carregando...
                </div>
              ) : (
                <ResultCard
                  metodo={selected.metodo}
                  resultado={selected.resultado}
                  telefones={phones}
                />
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
