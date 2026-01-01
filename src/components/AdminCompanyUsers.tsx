import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Trash2, Crown, User } from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface CompanyUser {
  id: string;
  user_id: string;
  company_role: 'gestor' | 'colaborador';
  is_active: boolean;
  created_at: string;
  profile?: {
    name: string | null;
    email: string | null;
  };
}

interface AvailableUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface AdminCompanyUsersProps {
  company: Company;
  onUpdate: () => void;
}

export function AdminCompanyUsers({ company, onUpdate }: AdminCompanyUsersProps) {
  const { toast } = useToast();
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<'gestor' | 'colaborador'>('colaborador');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchCompanyUsers();
    fetchAvailableUsers();
  }, [company.id]);

  const fetchCompanyUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_companies')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile data for each user
      const usersWithProfiles = await Promise.all(
        (data || []).map(async (userCompany) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', userCompany.user_id)
            .single();

          return {
            ...userCompany,
            profile: profile || { name: null, email: null }
          };
        })
      );

      setCompanyUsers(usersWithProfiles);
    } catch (error) {
      console.error('Error fetching company users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('is_active', true);

      if (profilesError) throw profilesError;

      // Get users already in this company
      const { data: existingUsers, error: existingError } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', company.id);

      if (existingError) throw existingError;

      const existingUserIds = new Set((existingUsers || []).map(u => u.user_id));
      
      // Filter out users already in the company
      const available = (profiles || []).filter(p => !existingUserIds.has(p.id));
      setAvailableUsers(available);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  const handleAddUser = async () => {
    if (!selectedUserId) {
      toast({
        title: "Selecione um usuário",
        description: "Escolha um usuário para adicionar à empresa.",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('user_companies')
        .insert({
          user_id: selectedUserId,
          company_id: company.id,
          company_role: selectedRole
        });

      if (error) throw error;

      toast({
        title: "Usuário adicionado!",
        description: `Usuário adicionado como ${selectedRole === 'gestor' ? 'Gestor' : 'Colaborador'}.`,
      });

      setSelectedUserId("");
      setSelectedRole('colaborador');
      fetchCompanyUsers();
      fetchAvailableUsers();
      onUpdate();
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar usuário.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleChangeRole = async (userCompany: CompanyUser, newRole: 'gestor' | 'colaborador') => {
    try {
      const { error } = await supabase
        .from('user_companies')
        .update({ company_role: newRole })
        .eq('id', userCompany.id);

      if (error) throw error;

      toast({
        title: "Cargo atualizado!",
        description: `Usuário agora é ${newRole === 'gestor' ? 'Gestor' : 'Colaborador'}.`,
      });

      fetchCompanyUsers();
    } catch (error) {
      console.error('Error changing role:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar cargo.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveUser = async (userCompany: CompanyUser) => {
    if (!confirm(`Remover ${userCompany.profile?.name || 'este usuário'} da empresa?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('user_companies')
        .delete()
        .eq('id', userCompany.id);

      if (error) throw error;

      toast({
        title: "Usuário removido",
        description: "O usuário foi removido da empresa.",
      });

      fetchCompanyUsers();
      fetchAvailableUsers();
      onUpdate();
    } catch (error) {
      console.error('Error removing user:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover usuário.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Adicionar usuário */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Nenhum usuário disponível
                    </SelectItem>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.email || 'Sem nome'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="w-40">
              <Select value={selectedRole} onValueChange={(value: 'gestor' | 'colaborador') => setSelectedRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">
                    <div className="flex items-center gap-2">
                      <Crown className="h-3 w-3 text-yellow-500" />
                      Gestor
                    </div>
                  </SelectItem>
                  <SelectItem value="colaborador">
                    <div className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      Colaborador
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddUser} disabled={isAdding || !selectedUserId}>
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuário</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companyUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                Nenhum usuário vinculado a esta empresa
              </TableCell>
            </TableRow>
          ) : (
            companyUsers.map((userCompany) => (
              <TableRow key={userCompany.id}>
                <TableCell className="font-medium">
                  {userCompany.profile?.name || 'Sem nome'}
                </TableCell>
                <TableCell>{userCompany.profile?.email || '-'}</TableCell>
                <TableCell>
                  <Select 
                    value={userCompany.company_role} 
                    onValueChange={(value: 'gestor' | 'colaborador') => handleChangeRole(userCompany, value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gestor">
                        <div className="flex items-center gap-2">
                          <Crown className="h-3 w-3 text-yellow-500" />
                          Gestor
                        </div>
                      </SelectItem>
                      <SelectItem value="colaborador">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          Colaborador
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge variant={userCompany.is_active ? "default" : "secondary"}>
                    {userCompany.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRemoveUser(userCompany)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
