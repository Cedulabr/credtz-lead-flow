import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Search } from "lucide-react";

interface User {
  id: string;
  name: string;
}
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

interface TelevendaWithUser extends Televenda {
  user_id: string;
  user?: {
    name: string;
  } | null;
}

export const TelevendasManagement = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [televendas, setTelevendas] = useState<TelevendaWithUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTv, setSelectedTv] = useState<TelevendaWithUser | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTv, setEditingTv] = useState<TelevendaWithUser | null>(null);
  const [deletingTvId, setDeletingTvId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchTelevendas = async () => {
    try {
      let query = supabase
        .from("televendas")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedMonth && selectedMonth !== "all") {
        const [year, month] = selectedMonth.split("-");
        const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        const endDate = new Date(parseInt(year), parseInt(month), 0);
        
        query = query
          .gte("data_venda", startDate.toISOString().split("T")[0])
          .lte("data_venda", endDate.toISOString().split("T")[0]);
      }

      if (selectedUserId && selectedUserId !== "all") {
        query = query.eq("user_id", selectedUserId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user names for each televenda
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(tv => tv.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        
        const profilesMap = new Map(
          (profilesData || []).map(p => [p.id, p])
        );
        
        const televendasWithUsers = data.map(tv => ({
          ...tv,
          user: profilesMap.get(tv.user_id) || null
        }));
        
        setTelevendas(televendasWithUsers);
      } else {
        setTelevendas([]);
      }
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
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchTelevendas();
  }, [selectedMonth, selectedUserId]);

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

  const handleEdit = (tv: TelevendaWithUser, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem editar propostas",
        variant: "destructive",
      });
      return;
    }
    setEditingTv(tv);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (tvId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) {
      toast({
        title: "Acesso negado",
        description: "Apenas administradores podem excluir propostas",
        variant: "destructive",
      });
      return;
    }
    setDeletingTvId(tvId);
    setIsDeleteDialogOpen(true);
  };

  const confirmEdit = async () => {
    if (!editingTv) return;
    
    try {
      const { error } = await (supabase as any)
        .from("televendas")
        .update({
          nome: editingTv.nome,
          cpf: editingTv.cpf,
          telefone: editingTv.telefone,
          banco: editingTv.banco,
          parcela: editingTv.parcela,
          troco: editingTv.troco,
          tipo_operacao: editingTv.tipo_operacao,
          observacao: editingTv.observacao,
          data_venda: editingTv.data_venda,
        })
        .eq("id", editingTv.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Proposta atualizada com sucesso!",
      });

      setIsEditDialogOpen(false);
      setEditingTv(null);
      fetchTelevendas();
    } catch (error) {
      console.error("Error updating televenda:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar proposta",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deletingTvId) return;
    
    try {
      const { error } = await (supabase as any)
        .from("televendas")
        .delete()
        .eq("id", deletingTvId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Proposta excluída com sucesso!",
      });

      setIsDeleteDialogOpen(false);
      setDeletingTvId(null);
      fetchTelevendas();
    } catch (error) {
      console.error("Error deleting televenda:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir proposta",
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

  const handleRowClick = (tv: TelevendaWithUser) => {
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

  // Filter televendas based on search term
  const filteredTelevendas = televendas.filter((tv) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      tv.nome.toLowerCase().includes(term) ||
      tv.cpf.toLowerCase().includes(term)
    );
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <CardTitle>Gestão de Propostas - Televendas</CardTitle>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              {/* User filter (admin only) */}
              {isAdmin && (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Filtrar por usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || 'Sem nome'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Month filter */}
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {getMonthOptions().map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                  {isAdmin && <TableHead>Gerenciar</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTelevendas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 10 : 9} className="text-center text-muted-foreground py-8">
                      {searchTerm ? 'Nenhuma venda encontrada' : 'Nenhuma venda registrada'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTelevendas.map((tv) => (
                  <TableRow 
                    key={tv.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(tv)}
                  >
                    <TableCell className="text-sm text-muted-foreground">{tv.user?.name || 'N/A'}</TableCell>
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
                    {isAdmin && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleEdit(tv, e)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => handleDelete(tv.id, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
                )}
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Proposta</DialogTitle>
            <DialogDescription>
              Edite os dados da proposta de televenda
            </DialogDescription>
          </DialogHeader>
          {editingTv && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome</Label>
                  <Input
                    value={editingTv.nome}
                    onChange={(e) => setEditingTv({ ...editingTv, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={editingTv.cpf}
                    onChange={(e) => setEditingTv({ ...editingTv, cpf: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={editingTv.telefone}
                    onChange={(e) => setEditingTv({ ...editingTv, telefone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Data da Venda</Label>
                  <Input
                    type="date"
                    value={editingTv.data_venda}
                    onChange={(e) => setEditingTv({ ...editingTv, data_venda: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Banco</Label>
                  <Input
                    value={editingTv.banco}
                    onChange={(e) => setEditingTv({ ...editingTv, banco: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Tipo de Operação</Label>
                  <Input
                    value={editingTv.tipo_operacao}
                    onChange={(e) => setEditingTv({ ...editingTv, tipo_operacao: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Parcela</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingTv.parcela}
                    onChange={(e) => setEditingTv({ ...editingTv, parcela: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Troco</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingTv.troco || ''}
                    onChange={(e) => setEditingTv({ ...editingTv, troco: parseFloat(e.target.value) || null })}
                  />
                </div>
              </div>

              <div>
                <Label>Observações</Label>
                <Input
                  value={editingTv.observacao || ''}
                  onChange={(e) => setEditingTv({ ...editingTv, observacao: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={confirmEdit}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta proposta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
