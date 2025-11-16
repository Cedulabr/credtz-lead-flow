import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, UserCheck, UserX, Plus, Trash2, RefreshCw, Settings } from "lucide-react";
import { CreateUser } from "./CreateUser";

interface User {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
  pix_key?: string;
  role: string;
  company?: string;
  level?: string;
  is_active?: boolean;
  leads_premium_enabled?: boolean;
  can_access_premium_leads?: boolean;
  created_at: string;
}

export function UsersList() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null as any });
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [permissionsDialog, setPermissionsDialog] = useState({ open: false, user: null as User | null });
  const [permissions, setPermissions] = useState({
    can_access_premium_leads: false,
  });
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    pix_key: "",
    company: "",
    level: "",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || "",
      email: user.email || "",
      cpf: user.cpf || "",
      phone: user.phone || "",
      pix_key: user.pix_key || "",
      company: user.company || "",
      level: user.level || "",
    });
    setIsDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: userForm.name,
          email: userForm.email,
          cpf: userForm.cpf,
          phone: userForm.phone,
          pix_key: userForm.pix_key,
          company: userForm.company,
          level: (userForm.level as any) || null,
        })
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: "Usuário atualizado!",
        description: "Os dados do usuário foram salvos com sucesso.",
      });

      setIsDialogOpen(false);
      setEditingUser(null);
      setUserForm({
        name: "",
        email: "",
        cpf: "",
        phone: "",
        pix_key: "",
        company: "",
        level: "",
      });
      loadUsers();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar dados do usuário.",
        variant: "destructive",
      });
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Status atualizado!",
        description: `Usuário ${!user.is_active ? 'ativado' : 'inativado'} com sucesso.`,
      });

      loadUsers();
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do usuário.",
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (user: User) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.name}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      toast({
        title: "Usuário excluído!",
        description: "O usuário foi removido do sistema.",
      });

      loadUsers();
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir usuário.",
        variant: "destructive",
      });
    }
  };

  const handleSetPassword = (user: any) => {
    setPasswordDialog({ open: true, user });
    setNewPassword("");
  };

  const handleUpdatePassword = async () => {
    if (!passwordDialog.user || !newPassword) return;

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { 
          user_id: passwordDialog.user.id,
          new_password: newPassword
        }
      });

      if (error) throw error;

      toast({
        title: "Senha definida com sucesso!",
        description: `Nova senha definida para ${passwordDialog.user.name || passwordDialog.user.email}`,
      });

      setPasswordDialog({ open: false, user: null });
      setNewPassword("");
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao definir senha",
        variant: "destructive",
      });
    }
  };

  const resetUserPassword = async (user: User) => {
    if (!confirm(`Tem certeza que deseja resetar a senha do usuário ${user.name}?`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      toast({
        title: "Senha resetada!",
        description: `Nova senha temporária: ${data.new_password}`,
      });

    } catch (error: any) {
      console.error('Erro ao resetar senha:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao resetar senha do usuário.",
        variant: "destructive",
      });
    }
  };

  const handlePermissionsOpen = (user: User) => {
    setPermissionsDialog({ open: true, user });
    setPermissions({
      can_access_premium_leads: user.can_access_premium_leads || false,
    });
  };

  const updateUserPermissions = async (userId: string, newPermissions: { can_access_premium_leads: boolean }) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update(newPermissions)
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Permissões atualizadas!",
        description: "As permissões do usuário foram atualizadas com sucesso.",
      });

      setPermissionsDialog({ open: false, user: null });
      loadUsers();
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar permissões do usuário.",
        variant: "destructive",
      });
    }
  };

  const getUserStatusBadge = (user: User) => {
    const isActive = user.is_active !== false; // Default to true if undefined
    return (
      <Badge variant={isActive ? "default" : "secondary"} className="flex items-center gap-1">
        {isActive ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
        {isActive ? "Ativo" : "Inativo"}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usuários Criados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Carregando usuários...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Usuários Criados
          </div>
          <CreateUser />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>PIX</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissões</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.name || "Nome não informado"}
                  </TableCell>
                  <TableCell>{user.email || "Email não informado"}</TableCell>
                  <TableCell>{user.cpf || "Não informado"}</TableCell>
                  <TableCell>{user.phone || "Não informado"}</TableCell>
                  <TableCell>{user.pix_key || "Não informado"}</TableCell>
                  <TableCell>{user.company || "Não informado"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {user.role === 'admin' ? 'Administrador' : 
                       user.role === 'partner' ? 'Parceiro' : 
                       user.role || 'Usuário'}
                    </Badge>
                  </TableCell>
                  <TableCell>{getUserStatusBadge(user)}</TableCell>
                   <TableCell>
                     <div className="flex gap-1">
                       {user.can_access_premium_leads && <Badge variant="secondary" className="text-xs">Premium</Badge>}
                     </div>
                   </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(user)}
                        title="Editar usuário"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant={user.is_active !== false ? "secondary" : "default"}
                        onClick={() => toggleUserStatus(user)}
                        title={user.is_active !== false ? "Inativar usuário" : "Ativar usuário"}
                      >
                        {user.is_active !== false ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePermissionsOpen(user)}
                        title="Gerenciar permissões"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetPassword(user)}
                        title="Definir senha"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resetUserPassword(user)}
                        title="Resetar senha"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteUser(user)}
                        title="Excluir usuário"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {users.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="user-name">Nome</Label>
                <Input
                  id="user-name"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="user-email">Email</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="user-cpf">CPF</Label>
                <Input
                  id="user-cpf"
                  value={userForm.cpf}
                  onChange={(e) => setUserForm({ ...userForm, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <Label htmlFor="user-phone">Telefone</Label>
                <Input
                  id="user-phone"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <Label htmlFor="user-pix">Chave PIX</Label>
                <Input
                  id="user-pix"
                  value={userForm.pix_key}
                  onChange={(e) => setUserForm({ ...userForm, pix_key: e.target.value })}
                  placeholder="Chave PIX para pagamentos"
                />
              </div>
              <div>
                <Label htmlFor="user-company">Empresa</Label>
                <Input
                  id="user-company"
                  value={userForm.company}
                  onChange={(e) => setUserForm({ ...userForm, company: e.target.value })}
                  placeholder="Nome da empresa"
                />
              </div>
              <div>
                <Label htmlFor="user-level">Nível do Usuário</Label>
                <Select 
                  value={userForm.level} 
                  onValueChange={(value) => setUserForm({ ...userForm, level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze</SelectItem>
                    <SelectItem value="prata">Prata</SelectItem>
                    <SelectItem value="ouro">Ouro</SelectItem>
                    <SelectItem value="diamante">Diamante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleSaveUser} className="w-full">
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Password Dialog */}
        <Dialog open={passwordDialog.open} onOpenChange={(open) => setPasswordDialog({ open, user: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Definir Senha - {passwordDialog.user?.name || passwordDialog.user?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="new-password">Nova Senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setPasswordDialog({ open: false, user: null })}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleUpdatePassword}
                  disabled={!newPassword}
                >
                  Definir Senha
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={permissionsDialog.open} onOpenChange={(open) => setPermissionsDialog({ open, user: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerenciar Permissões - {permissionsDialog.user?.name || permissionsDialog.user?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="leads-premium">Leads Premium</Label>
                <Switch
                  id="leads-premium"
                  checked={permissions.can_access_premium_leads}
                  onCheckedChange={(checked) => {
                    setPermissions({ ...permissions, can_access_premium_leads: checked });
                  }}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setPermissionsDialog({ open: false, user: null })}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={() => {
                    if (permissionsDialog.user) {
                      updateUserPermissions(permissionsDialog.user.id, permissions);
                    }
                  }}
                >
                  Salvar Permissões
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}