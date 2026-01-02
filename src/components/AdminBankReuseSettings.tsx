import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Building2, Clock, Bell, Search } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BankReuseSetting {
  id: string;
  bank_name: string;
  reuse_months: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function AdminBankReuseSettings() {
  const { toast } = useToast();
  const [banks, setBanks] = useState<BankReuseSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankReuseSetting | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    bank_name: "",
    reuse_months: 6,
  });

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase
        .from("bank_reuse_settings")
        .select("*")
        .order("bank_name", { ascending: true });

      if (error) throw error;
      setBanks(data || []);
    } catch (error) {
      console.error("Erro ao buscar bancos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar configurações de bancos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.bank_name.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Informe o nome do banco.",
        variant: "destructive",
      });
      return;
    }

    if (formData.reuse_months < 1) {
      toast({
        title: "Valor inválido",
        description: "O prazo deve ser de pelo menos 1 mês.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingBank) {
        const { error } = await supabase
          .from("bank_reuse_settings")
          .update({
            bank_name: formData.bank_name,
            reuse_months: formData.reuse_months,
          })
          .eq("id", editingBank.id);

        if (error) throw error;

        toast({
          title: "Banco atualizado!",
          description: `${formData.bank_name} foi atualizado com sucesso.`,
        });
      } else {
        const { error } = await supabase.from("bank_reuse_settings").insert({
          bank_name: formData.bank_name,
          reuse_months: formData.reuse_months,
        });

        if (error) throw error;

        toast({
          title: "Banco cadastrado!",
          description: `${formData.bank_name} foi adicionado com prazo de ${formData.reuse_months} meses.`,
        });
      }

      setFormData({ bank_name: "", reuse_months: 6 });
      setEditingBank(null);
      setIsDialogOpen(false);
      fetchBanks();
    } catch (error: any) {
      console.error("Erro ao salvar banco:", error);
      toast({
        title: "Erro",
        description: error.message?.includes("unique")
          ? "Este banco já está cadastrado."
          : "Erro ao salvar banco.",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (bank: BankReuseSetting) => {
    try {
      const { error } = await supabase
        .from("bank_reuse_settings")
        .update({ is_active: !bank.is_active })
        .eq("id", bank.id);

      if (error) throw error;

      toast({
        title: bank.is_active ? "Alerta desativado" : "Alerta ativado",
        description: `Alertas de ${bank.bank_name} ${bank.is_active ? "desativados" : "ativados"}.`,
      });

      fetchBanks();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do banco.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (bank: BankReuseSetting) => {
    try {
      const { error } = await supabase
        .from("bank_reuse_settings")
        .delete()
        .eq("id", bank.id);

      if (error) throw error;

      toast({
        title: "Banco removido",
        description: `${bank.bank_name} foi removido.`,
      });

      fetchBanks();
    } catch (error) {
      console.error("Erro ao excluir banco:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir banco.",
        variant: "destructive",
      });
    }
  };

  const startEdit = (bank: BankReuseSetting) => {
    setEditingBank(bank);
    setFormData({
      bank_name: bank.bank_name,
      reuse_months: bank.reuse_months,
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingBank(null);
    setFormData({ bank_name: "", reuse_months: 6 });
    setIsDialogOpen(true);
  };

  const filteredBanks = banks.filter((bank) =>
    bank.bank_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Alertas por Banco (Reaproveitamento)
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure o prazo de reaproveitamento para cada banco
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Banco
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBank ? "Editar Banco" : "Cadastrar Novo Banco"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Nome do Banco *</Label>
                <Input
                  id="bank_name"
                  placeholder="Ex: Banrisul, C6, Pan..."
                  value={formData.bank_name}
                  onChange={(e) =>
                    setFormData({ ...formData, bank_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reuse_months">Prazo para Nova Operação (meses) *</Label>
                <Input
                  id="reuse_months"
                  type="number"
                  min={1}
                  max={36}
                  placeholder="6"
                  value={formData.reuse_months}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reuse_months: parseInt(e.target.value) || 6,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Após uma proposta ser marcada como PAGA, o sistema criará um alerta
                  para essa quantidade de meses no futuro.
                </p>
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingBank ? "Atualizar" : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar banco..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{banks.length}</p>
              <p className="text-sm text-muted-foreground">Bancos Cadastrados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500/10">
              <Bell className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {banks.filter((b) => b.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">Alertas Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {banks.length > 0
                  ? Math.round(
                      banks.reduce((sum, b) => sum + b.reuse_months, 0) /
                        banks.length
                    )
                  : 0}
              </p>
              <p className="text-sm text-muted-foreground">Prazo Médio (meses)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bancos e Prazos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Banco</TableHead>
                  <TableHead className="text-center">Prazo (meses)</TableHead>
                  <TableHead className="text-center">Status Alerta</TableHead>
                  <TableHead>Atualizado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBanks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">
                        Nenhum banco encontrado
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBanks.map((bank) => (
                    <TableRow key={bank.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{bank.bank_name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono">
                          {bank.reuse_months} meses
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            checked={bank.is_active}
                            onCheckedChange={() => handleToggleActive(bank)}
                          />
                          <Badge variant={bank.is_active ? "default" : "secondary"}>
                            {bank.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(bank.updated_at), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(bank)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(bank)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
