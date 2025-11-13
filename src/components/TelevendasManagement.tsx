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

  const fetchTelevendas = async () => {
    try {
      const { data, error } = await supabase
        .from("televendas")
        .select("*")
        .order("created_at", { ascending: false });

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
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestão de Propostas - Televendas</CardTitle>
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
                <TableRow key={tv.id}>
                  <TableCell>{tv.nome}</TableCell>
                  <TableCell>{tv.cpf}</TableCell>
                  <TableCell>{new Date(tv.data_venda).toLocaleDateString()}</TableCell>
                  <TableCell>{tv.banco}</TableCell>
                  <TableCell>{tv.tipo_operacao}</TableCell>
                  <TableCell>R$ {tv.parcela.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(tv.status)}</TableCell>
                  <TableCell>
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
  );
};
