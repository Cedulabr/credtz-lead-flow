import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBrDid } from "../hooks/useBrDid";
import type { UserDid } from "../types";

export function LogsChamadasView() {
  const { user } = useAuth();
  const { loading, getCdrs } = useBrDid();
  const [dids, setDids] = useState<UserDid[]>([]);
  const [selectedDid, setSelectedDid] = useState("");
  const [mes, setMes] = useState(String(new Date().getMonth() + 1));
  const [ano, setAno] = useState(String(new Date().getFullYear()));
  const [cdrs, setCdrs] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) loadDids();
  }, [user?.id]);

  const loadDids = async () => {
    const { data } = await supabase
      .from("user_dids")
      .select("*")
      .eq("user_id", user!.id);
    if (data) setDids(data as unknown as UserDid[]);
  };

  // Fix #7: getCdrs now builds PERIODO internally in the hook
  const handleSearch = async () => {
    if (!selectedDid) return;
    const data = await getCdrs(selectedDid, parseInt(mes), parseInt(ano));
    if (data && Array.isArray(data)) {
      setCdrs(data);
    } else {
      setCdrs([]);
    }
  };

  const meses = [
    { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" }, { value: "4", label: "Abril" },
    { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
    { value: "7", label: "Julho" }, { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" }, { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Logs de Chamadas (CDR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-1 block">Número</label>
              <Select value={selectedDid} onValueChange={setSelectedDid}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {dids.map(d => (
                    <SelectItem key={d.id} value={d.numero}>{d.numero}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <label className="text-sm font-medium mb-1 block">Mês</label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {meses.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-24">
              <label className="text-sm font-medium mb-1 block">Ano</label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch} disabled={!selectedDid || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="ml-1">Buscar</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {cdrs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{cdrs.length} registros encontrados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cdrs.map((cdr: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{cdr.DATA || cdr.data || "-"}</TableCell>
                    <TableCell>{cdr.HORA || cdr.hora || "-"}</TableCell>
                    <TableCell className="font-mono">{cdr.ORIGEM || cdr.origem || "-"}</TableCell>
                    <TableCell className="font-mono">{cdr.DESTINO || cdr.destino || "-"}</TableCell>
                    <TableCell>{cdr.DURACAO || cdr.duracao || "-"}</TableCell>
                    <TableCell>{cdr.STATUS || cdr.status || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!loading && cdrs.length === 0 && selectedDid && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum registro de chamada encontrado para o período selecionado.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
