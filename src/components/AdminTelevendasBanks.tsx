import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Plus, Edit, Trash2, Building2, Save, Search } from "lucide-react";

interface TelevendasBank {
  id: string;
  name: string;
  code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function AdminTelevendasBanks() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [banks, setBanks] = useState<TelevendasBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<TelevendasBank | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
  });

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const { data, error } = await supabase
        .from("televendas_banks")
        .select("*")
        .order("name");

      if (error) throw error;
      setBanks(data || []);
    } catch (error) {
      console.error("Error fetching banks:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar bancos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome do banco é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingBank) {
        const { error } = await supabase
          .from("televendas_banks")
          .update({
            name: formData.name.trim(),
            code: formData.code.trim() || null,
          })
          .eq("id", editingBank.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Banco atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase.from("televendas_banks").insert({
          name: formData.name.trim(),
          code: formData.code.trim() || null,
          created_by: user?.id,
        });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Banco cadastrado com sucesso!",
        });
      }

      setFormData({ name: "", code: "" });
      setEditingBank(null);
      setIsDialogOpen(false);
      fetchBanks();
    } catch (error) {
      console.error("Error saving bank:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar banco",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (bank: TelevendasBank) => {
    try {
      const { error } = await supabase
        .from("televendas_banks")
        .update({ is_active: !bank.is_active })
        .eq("id", bank.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Banco ${!bank.is_active ? "ativado" : "desativado"} com sucesso!`,
      });

      fetchBanks();
    } catch (error) {
      console.error("Error toggling bank status:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do banco",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (bank: TelevendasBank) => {
    try {
      const { error } = await supabase
        .from("televendas_banks")
        .delete()
        .eq("id", bank.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Banco excluído com sucesso!",
      });

      fetchBanks();
    } catch (error) {
      console.error("Error deleting bank:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir banco",
        variant: "destructive",
      });
    }
  };

  const startEdit = (bank: TelevendasBank) => {
    setEditingBank(bank);
    setFormData({
      name: bank.name,
      code: bank.code || "",
    });
    setIsDialogOpen(true);
  };

  const openNewDialog = () => {
    setEditingBank(null);
    setFormData({ name: "", code: "" });
    setIsDialogOpen(true);
  };

  const filteredBanks = banks.filter(
    (bank) =>
      bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bank.code && bank.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Banco do Televendas</h2>
            <p className="text-muted-foreground">
              Gerencie os bancos utilizados no setor de Televendas
            </p>
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Banco
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingBank ? "Editar Banco" : "Novo Banco"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="bank-name">Nome do Banco *</Label>
                <Input
                  id="bank-name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Banco do Brasil"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="bank-code">Código (opcional)</Label>
                <Input
                  id="bank-code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="Ex: 001"
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Banks Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bancos Cadastrados</span>
            <Badge variant="secondary">{filteredBanks.length} banco(s)</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBanks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "Nenhum banco encontrado"
                : "Nenhum banco cadastrado ainda"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBanks.map((bank) => (
                  <TableRow key={bank.id}>
                    <TableCell className="font-medium">{bank.name}</TableCell>
                    <TableCell>{bank.code || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={bank.is_active}
                          onCheckedChange={() => handleToggleActive(bank)}
                        />
                        <Badge
                          variant={bank.is_active ? "default" : "secondary"}
                        >
                          {bank.is_active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(bank.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(bank)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Confirmar exclusão
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir o banco "
                                {bank.name}"? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(bank)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
