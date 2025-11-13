import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Televenda {
  id: string;
  nome: string;
  cpf: string;
  data_venda: string;
  telefone: string;
  banco: string;
  parcela: number;
  troco: number | null;
  tipo_operacao: string;
  observacao: string | null;
  status: string;
  created_at: string;
}

export const TelevendasManagement = () => {
  const { toast } = useToast();
  const [televendas, setTelevendas] = useState<Televenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [selectedTv, setSelectedTv] = useState<Televenda | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchTelevendas = async () => {
    try {
      let query = (supabase as any)
        .from("televendas")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedMonth) {
        const [year, month] = selectedMonth.split("-");
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        
        query = query
          .gte("data_venda", startDate.toISOString().split("T")[0])
          .lte("data_venda", endDate.toISOString().split("T")[0]);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTelevendas(data || []);
    } catch (error) {
      console.error("Error fetching televendas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar vendas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelevendas();
  }, [selectedMonth]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from("televendas")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso!",
      });

      fetchTelevendas();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pendente: "default",
      pago: "secondary",
      cancelado: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  const handleRowClick = (tv: Televenda) => {
    setSelectedTv(tv);
    setIsDialogOpen(true);
  };

  const getMonthOptions = () => {
    const months = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      months.push({ value, label });
    }
    return months;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gestão de Propostas - Televendas</CardTitle>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos os meses</SelectItem>
                {getMonthOptions().map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {televendas.map((tv) => (
                  <TableRow 
                    key={tv.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(tv)}
                  >
                    <TableCell>{tv.nome}</TableCell>
                    <TableCell>{tv.cpf}</TableCell>
                    <TableCell>{new Date(tv.data_venda).toLocaleDateString()}</TableCell>
                    <TableCell>{tv.banco}</TableCell>
                    <TableCell>{tv.tipo_operacao}</TableCell>
                    <TableCell>R$ {tv.parcela.toFixed(2)}</TableCell>
                    <TableCell>{getStatusBadge(tv.status)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={tv.status}
                        onValueChange={(value) => updateStatus(tv.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="pago">Pago</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Venda</DialogTitle>
          </DialogHeader>
          {selectedTv && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Nome</Label>
                  <p className="font-medium">{selectedTv.nome}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">CPF</Label>
                  <p className="font-medium">{selectedTv.cpf}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Telefone</Label>
                  <p className="font-medium">{selectedTv.telefone}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data da Venda</Label>
                  <p className="font-medium">
                    {new Date(selectedTv.data_venda).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Banco</Label>
                  <p className="font-medium">{selectedTv.banco}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tipo de Operação</Label>
                  <p className="font-medium">{selectedTv.tipo_operacao}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Parcela</Label>
                  <p className="font-medium">R$ {selectedTv.parcela.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Troco</Label>
                  <p className="font-medium">
                    {selectedTv.troco ? `R$ ${selectedTv.troco.toFixed(2)}` : "-"}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">{getStatusBadge(selectedTv.status)}</div>
              </div>

              {selectedTv.observacao && (
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="mt-1 p-3 bg-muted rounded-md">
                    {selectedTv.observacao}
                  </p>
                </div>
              )}

              <div className="text-sm text-muted-foreground">
                Cadastrado em: {new Date(selectedTv.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
