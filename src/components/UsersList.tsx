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
import { Edit, UserCheck, UserX, Plus, Trash2, RefreshCw, Settings, Search, Crown, User, Key } from "lucide-react";
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
  can_access_indicar?: boolean;
  can_access_meus_clientes?: boolean;
  can_access_televendas?: boolean;
  can_access_gestao_televendas?: boolean;
  can_access_documentos?: boolean;
  can_access_tabela_comissoes?: boolean;
  can_access_minhas_comissoes?: boolean;
  created_at: string;
}

interface Company {
  id: string;
  name: string;
}

interface UserCompany {
  id: string;
  company_id: string;
  user_id: string;
  company_role: 'gestor' | 'colaborador';
  companies?: Company;
}

export function UsersList() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userCompanies, setUserCompanies] = useState<Record<string, UserCompany>>({});
  const [passwordDialog, setPasswordDialog] = useState({ open: false, user: null as any });
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [permissionsDialog, setPermissionsDialog] = useState({ open: false, user: null as User | null });
  const [searchTerm, setSearchTerm] = useState("");

  // Centralizar definição de permissões - ADICIONE NOVOS MÓDULOS AQUI
  const PERMISSION_MODULES = [
    { key: "can_access_premium_leads", label: "Leads Premium", defaultValue: false },
    { key: "can_access_indicar", label: "Indicar", defaultValue: true },
    { key: "can_access_gerador_propostas", label: "Gerador de Propostas", defaultValue: true },
    { key: "can_access_activate_leads", label: "Activate Leads", defaultValue: true },
    { key: "can_access_baseoff_consulta", label: "Consulta Base OFF", defaultValue: true },
    { key: "can_access_meus_clientes", label: "Meus Clientes", defaultValue: true },
    { key: "can_access_televendas", label: "Televendas", defaultValue: true },
    { key: "can_access_gestao_televendas", label: "Gestão de Televendas", defaultValue: true },
    { key: "can_access_financas", label: "Finanças", defaultValue: true },
    { key: "can_access_documentos", label: "Documentos", defaultValue: true },
    { key: "can_access_alertas", label: "Alertas de Reaproveitamento", defaultValue: true },
    { key: "can_access_tabela_comissoes", label: "Tabela de Comissões", defaultValue: true },
    { key: "can_access_minhas_comissoes", label: "Minhas Comissões", defaultValue: true },
    { key: "can_access_relatorio_desempenho", label: "Relatório de Desempenho", defaultValue: false },
    { key: "can_access_colaborativo", label: "Colaborativo", defaultValue: true },
    { key: "can_access_controle_ponto", label: "Controle de Ponto", defaultValue: true },
  ] as const;

  // Gerar estado inicial baseado nos módulos definidos
  const getDefaultPermissions = () => {
    const defaults: Record<string, boolean> = {};
    PERMISSION_MODULES.forEach(mod => {
      defaults[mod.key] = mod.defaultValue;
    });
    return defaults;
  };

  const [permissions, setPermissions] = useState<Record<string, boolean>>(getDefaultPermissions());
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    pix_key: "",
    company: "",
    level: "",
    company_id: "",
    company_role: "" as 'gestor' | 'colaborador' | "",
  });

  useEffect(() => {
    loadUsers();
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadUserCompanies = async (userIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('user_companies')
        .select('id, company_id, user_id, company_role, companies(id, name)')
        .in('user_id', userIds)
        .eq('is_active', true);

      if (error) throw error;
      
      const mapping: Record<string, UserCompany> = {};
      (data || []).forEach((uc: any) => {
        mapping[uc.user_id] = uc;
      });
      setUserCompanies(mapping);
    } catch (error) {
      console.error('Erro ao carregar empresas dos usuários:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
      
      if (data && data.length > 0) {
        await loadUserCompanies(data.map(u => u.id));
      }
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

  // Função para lidar com promoção de colaborador para gestor
  const handleRolePromotion = async (userId: string, companyId: string) => {
    try {
      // Atualizar permissões específicas de gestão se necessário
      const { error } = await supabase
        .from('profiles')
        .update({
          can_access_gestao_televendas: true,
          can_access_relatorio_desempenho: true,
        })
        .eq('id', userId);

      if (error) {
        console.error('Erro ao atualizar permissões de gestor:', error);
      } else {
        toast({
          title: "Promoção para Gestor",
          description: "Permissões de gestão ativadas automaticamente.",
        });
      }
    } catch (error) {
      console.error('Erro ao processar promoção:', error);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    const userCompany = userCompanies[user.id];
    setUserForm({
      name: user.name || "",
      email: user.email || "",
      cpf: user.cpf || "",
      phone: user.phone || "",
      pix_key: user.pix_key || "",
      company: user.company || "",
      level: user.level || "",
      company_id: userCompany?.company_id || "",
      company_role: userCompany?.company_role || "",
    });
    setIsDialogOpen(true);
  };

  // Filtrar usuários por busca
  const filteredUsers = users.filter(user => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      (user.name || "").toLowerCase().includes(term) ||
      (user.email || "").toLowerCase().includes(term) ||
      (user.cpf || "").includes(term)
    );
  });

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      // Update profile
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

      // Update company assignment
      if (userForm.company_id && userForm.company_role) {
        const existingUserCompany = userCompanies[editingUser.id];
        const previousRole = existingUserCompany?.company_role;
        const newRole = userForm.company_role;
        
        if (existingUserCompany) {
          // Update existing
          const { error: ucError } = await supabase
            .from('user_companies')
            .update({
              company_id: userForm.company_id,
              company_role: userForm.company_role,
            })
            .eq('id', existingUserCompany.id);
          
          if (ucError) throw ucError;

          // Se mudou de colaborador para gestor, transferir leads atribuídos
          if (previousRole === 'colaborador' && newRole === 'gestor') {
            await handleRolePromotion(editingUser.id, userForm.company_id);
          }
          // Se mudou de gestor para colaborador, notificar
          if (previousRole === 'gestor' && newRole === 'colaborador') {
            toast({
              title: "Cargo alterado",
              description: "O usuário agora é colaborador e não terá mais acesso às funcionalidades de gestão.",
            });
          }
        } else {
          // Insert new
          const { error: ucError } = await supabase
            .from('user_companies')
            .insert({
              user_id: editingUser.id,
              company_id: userForm.company_id,
              company_role: userForm.company_role,
            });
          
          if (ucError) throw ucError;
        }
      } else if (userCompanies[editingUser.id] && !userForm.company_id) {
        // Remove company assignment if cleared
        const { error: deleteError } = await supabase
          .from('user_companies')
          .update({ is_active: false })
          .eq('id', userCompanies[editingUser.id].id);
        
        if (deleteError) throw deleteError;
      }

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
        company_id: "",
        company_role: "",
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
      // Verificar se usuário está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Sessão expirada",
          description: "Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { 
          user_id: passwordDialog.user.id,
          new_password: newPassword
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      // Testar login (debug) com a nova senha
      let loginTestOk: boolean | null = null;
      let loginTestError: string | undefined;
      try {
        const { data: debugData, error: debugError } = await supabase.functions.invoke('admin-debug-login', {
          body: { user_id: passwordDialog.user.id, password: newPassword }
        });
        if (debugError) {
          loginTestOk = null;
          loginTestError = debugError.message;
        } else {
          loginTestOk = debugData?.login_test?.ok === true;
          loginTestError = debugData?.login_test?.error;
        }
      } catch (e: any) {
        loginTestOk = null;
        loginTestError = e?.message;
      }

      if (loginTestOk === false) {
        toast({
          title: "Senha atualizada, mas login falhou",
          description: loginTestError || "O Supabase ainda está retornando credenciais inválidas para este usuário.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Senha definida com sucesso!",
          description: `Nova senha definida para ${passwordDialog.user.name || passwordDialog.user.email}${loginTestOk === true ? ' (login testado: OK)' : ''}`,
        });
      }

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
      // Verificar se usuário está autenticado
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Sessão expirada",
          description: "Por favor, faça login novamente.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-reset-password', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      const newPass = data?.new_password as string | undefined;

      // Testar login (debug) com a senha gerada
      let loginTestOk: boolean | null = null;
      let loginTestError: string | undefined;
      if (newPass) {
        try {
          const { data: debugData, error: debugError } = await supabase.functions.invoke('admin-debug-login', {
            body: { user_id: user.id, password: newPass }
          });
          if (debugError) {
            loginTestOk = null;
            loginTestError = debugError.message;
          } else {
            loginTestOk = debugData?.login_test?.ok === true;
            loginTestError = debugData?.login_test?.error;
          }
        } catch (e: any) {
          loginTestOk = null;
          loginTestError = e?.message;
        }
      }

      if (loginTestOk === false) {
        toast({
          title: "Senha resetada, mas login falhou",
          description: loginTestError || "O Supabase ainda está retornando credenciais inválidas para este usuário.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Senha resetada!",
          description: `Email: ${user.email} | Nova senha temporária: ${newPass || '(não retornada)'}${loginTestOk === true ? ' (login testado: OK)' : ''}`,
        });
      }

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
    // Carregar permissões dinamicamente baseado nos módulos definidos
    const userPermissions: Record<string, boolean> = {};
    PERMISSION_MODULES.forEach(mod => {
      userPermissions[mod.key] = (user as any)[mod.key] !== false;
    });
    setPermissions(userPermissions);
  };

  const updateUserPermissions = async (userId: string, newPermissions: typeof permissions) => {
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
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <UserCheck className="h-6 w-6 text-primary" />
            Gestão de Usuários
            <Badge variant="secondary" className="ml-2">{users.length}</Badge>
          </CardTitle>
          <CreateUser />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Barra de busca */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-2">
              {filteredUsers.length} usuário(s) encontrado(s)
            </p>
          )}
        </div>

        <div className="overflow-x-auto rounded-lg border">
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
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.name || "Nome não informado"}
                      {userCompanies[user.id]?.company_role === 'gestor' && (
                        <Crown className="h-4 w-4 text-warning" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{user.cpf || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{user.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{user.pix_key || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{userCompanies[user.id]?.companies?.name || user.company || "—"}</span>
                      {userCompanies[user.id]?.company_role && (
                        <Badge 
                          variant={userCompanies[user.id]?.company_role === 'gestor' ? "default" : "outline"} 
                          className="w-fit text-xs"
                        >
                          {userCompanies[user.id]?.company_role === 'gestor' ? (
                            <><Crown className="h-3 w-3 mr-1" /> Gestor</>
                          ) : (
                            <><User className="h-3 w-3 mr-1" /> Colaborador</>
                          )}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? "default" : "outline"}>
                      {user.role === 'admin' ? 'Admin' : 
                       user.role === 'partner' ? 'Parceiro' : 
                       user.role || 'Usuário'}
                    </Badge>
                  </TableCell>
                  <TableCell>{getUserStatusBadge(user)}</TableCell>
                   <TableCell>
                     <div className="flex flex-wrap gap-1 max-w-[150px]">
                       {user.can_access_premium_leads !== false && <Badge variant="secondary" className="text-xs">Premium</Badge>}
                       {user.can_access_gestao_televendas !== false && <Badge variant="secondary" className="text-xs">Gestão</Badge>}
                     </div>
                   </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEditUser(user)}
                        title="Editar usuário"
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleUserStatus(user)}
                        title={user.is_active !== false ? "Inativar" : "Ativar"}
                        className="h-8 w-8"
                      >
                        {user.is_active !== false ? <UserX className="h-4 w-4 text-warning" /> : <UserCheck className="h-4 w-4 text-success" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handlePermissionsOpen(user)}
                        title="Permissões"
                        className="h-8 w-8"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleSetPassword(user)}
                        title="Definir senha"
                        className="h-8 w-8"
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => resetUserPassword(user)}
                        title="Resetar senha"
                        className="h-8 w-8"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteUser(user)}
                        title="Excluir"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserX className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? "Nenhum usuário encontrado com esses critérios." : "Nenhum usuário cadastrado."}
            </p>
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
                <Label htmlFor="user-company-select">Empresa</Label>
                <Select 
                  value={userForm.company_id || "none"} 
                  onValueChange={(value) => setUserForm({ ...userForm, company_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="user-company-role">Cargo na Empresa</Label>
                <Select 
                  value={userForm.company_role || "none"} 
                  onValueChange={(value) => setUserForm({ ...userForm, company_role: value === "none" ? "" : value as 'gestor' | 'colaborador' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                  </SelectContent>
                </Select>
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Gerenciar Permissões - {permissionsDialog.user?.name || permissionsDialog.user?.email}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-muted-foreground">
                Ative ou desative as permissões de acesso às seções do sistema.
              </p>
              <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                💡 Total de módulos: {PERMISSION_MODULES.length} - Novos módulos são adicionados automaticamente.
              </p>
              
              <div className="space-y-3">
                {PERMISSION_MODULES.map((mod) => (
                  <div key={mod.key} className="flex items-center justify-between p-3 rounded-lg border">
                    <Label htmlFor={mod.key} className="font-medium">{mod.label}</Label>
                    <Switch
                      id={mod.key}
                      checked={permissions[mod.key] ?? mod.defaultValue}
                      onCheckedChange={(checked) => setPermissions({ ...permissions, [mod.key]: checked })}
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
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