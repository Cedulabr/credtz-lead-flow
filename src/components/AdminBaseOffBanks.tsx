import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";

interface AllowedBank {
  id: string;
  codigo_banco: string;
  is_active: boolean;
  created_at: string;
}

export function AdminBaseOffBanks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [allowedBanks, setAllowedBanks] = useState<AllowedBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newBankCode, setNewBankCode] = useState("");

  useEffect(() => {
    fetchAllowedBanks();
  }, []);

  const fetchAllowedBanks = async () => {
    try {
      const { data, error } = await supabase
        .from('baseoff_allowed_banks')
        .select('*')
        .order('codigo_banco');

      if (error) throw error;
      setAllowedBanks(data || []);
    } catch (error) {
      console.error('Error fetching allowed banks:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar bancos permitidos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addBank = async () => {
    if (!newBankCode.trim()) {
      toast({
        title: "Erro",
        description: "Código do banco é obrigatório",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('baseoff_allowed_banks')
        .insert({
          codigo_banco: newBankCode.trim(),
          created_by: user?.id
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Erro",
            description: "Este banco já está cadastrado",
            variant: "destructive",
          });
          return;
        }
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Banco adicionado com sucesso",
      });

      setIsDialogOpen(false);
      setNewBankCode("");
      fetchAllowedBanks();
    } catch (error) {
      console.error('Error adding bank:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar banco",
        variant: "destructive",
      });
    }
  };

  const toggleBankStatus = async (bankId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('baseoff_allowed_banks')
        .update({ is_active: !currentStatus })
        .eq('id', bankId);

      if (error) throw error;

      setAllowedBanks(allowedBanks.map(bank => 
        bank.id === bankId ? { ...bank, is_active: !currentStatus } : bank
      ));

      toast({
        title: "Sucesso",
        description: "Status do banco atualizado",
      });
    } catch (error) {
      console.error('Error updating bank status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do banco",
        variant: "destructive",
      });
    }
  };

  const deleteBank = async (bankId: string) => {
    try {
      const { error } = await supabase
        .from('baseoff_allowed_banks')
        .delete()
        .eq('id', bankId);

      if (error) throw error;

      setAllowedBanks(allowedBanks.filter(bank => bank.id !== bankId));

      toast({
        title: "Sucesso",
        description: "Banco removido com sucesso",
      });
    } catch (error) {
      console.error('Error deleting bank:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover banco",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Bancos Permitidos - BaseOFF</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Banco
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Banco</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="codigo-banco">Código do Banco</Label>
                <Input
                  id="codigo-banco"
                  value={newBankCode}
                  onChange={(e) => setNewBankCode(e.target.value)}
                  placeholder="Ex: 001, 104, 237"
                />
              </div>
              <Button onClick={addBank} className="w-full">
                Adicionar Banco
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bancos Cadastrados ({allowedBanks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código do Banco</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allowedBanks.map((bank) => (
                <TableRow key={bank.id}>
                  <TableCell className="font-medium">{bank.codigo_banco}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={bank.is_active}
                        onCheckedChange={() => toggleBankStatus(bank.id, bank.is_active)}
                      />
                      <span className={bank.is_active ? "text-green-600" : "text-red-600"}>
                        {bank.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(bank.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteBank(bank.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {allowedBanks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum banco cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}