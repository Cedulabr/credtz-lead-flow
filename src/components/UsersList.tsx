import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, UserCheck, UserX, Plus } from "lucide-react";

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
  created_at: string;
}

export function UsersList() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    pix_key: "",
    company: "",
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
    // For now, we'll show a placeholder since we don't have an active/inactive field
    // This would typically update an 'is_active' field in the profiles table
    toast({
      title: "Funcionalidade em desenvolvimento",
      description: "Sistema de ativação/desativação será implementado em breve.",
    });
  };

  const getUserStatusBadge = (user: User) => {
    // For now, all users are considered active
    // This would typically check an 'is_active' field
    return (
      <Badge variant="default" className="flex items-center gap-1">
        <UserCheck className="h-3 w-3" />
        Ativo
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
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Usuários Criados
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
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleUserStatus(user)}
                      >
                        <UserX className="h-3 w-3" />
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
              <Button onClick={handleSaveUser} className="w-full">
                Salvar Alterações
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}