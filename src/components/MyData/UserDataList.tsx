import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Users, Eye, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserData, UserDataStatus } from './types';

interface UserDataWithProfile extends UserData {
  profile_name?: string;
  profile_email?: string;
}

interface UserDataListProps {
  onSelectUser: (userData: UserData, userId: string) => void;
  companyId?: string | null; // If provided, filter users by company
}

export function UserDataList({ onSelectUser, companyId }: UserDataListProps) {
  const [users, setUsers] = useState<UserDataWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
  }, [companyId]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // If companyId is provided, get users from that company only
      let targetUserIds: string[] = [];
      
      if (companyId) {
        // Get all user IDs from the specific company
        const { data: companyUsers, error: companyError } = await supabase
          .from('user_companies')
          .select('user_id')
          .eq('company_id', companyId)
          .eq('is_active', true);
        
        if (companyError) throw companyError;
        targetUserIds = (companyUsers || []).map(cu => cu.user_id);
        
        if (targetUserIds.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }
      }

      // Fetch user_data with optional company filter
      let query = supabase
        .from('user_data')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (companyId && targetUserIds.length > 0) {
        query = query.in('user_id', targetUserIds);
      }

      const { data: userData, error: userDataError } = await query;

      if (userDataError) throw userDataError;

      // Fetch profiles to get names and emails
      const userIds = (userData || []).map(u => u.user_id);
      
      if (userIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Merge data
      const mergedData = (userData || []).map(ud => {
        const profile = profiles?.find(p => p.id === ud.user_id);
        return {
          ...ud,
          profile_name: profile?.name || ud.full_name || 'Sem nome',
          profile_email: profile?.email || '',
        };
      }) as UserDataWithProfile[];

      setUsers(mergedData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar lista de usuários');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: UserDataStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovado
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Reprovado
          </Badge>
        );
      case 'in_review':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Clock className="h-3 w-3 mr-1" />
            Em Análise
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Incompleto
          </Badge>
        );
    }
  };

  const getPersonTypeBadge = (type: string) => {
    return type === 'pj' ? (
      <Badge variant="outline" className="border-purple-300 text-purple-700">
        Pessoa Jurídica
      </Badge>
    ) : (
      <Badge variant="outline" className="border-blue-300 text-blue-700">
        Pessoa Física
      </Badge>
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.profile_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.profile_email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.cpf?.includes(searchTerm)) ||
      (user.cnpj?.includes(searchTerm));
    
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gestão de Cadastros
        </CardTitle>
        <CardDescription>
          Visualize e gerencie os cadastros de todos os usuários
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, CPF ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="incomplete">Incompleto</SelectItem>
              <SelectItem value="in_review">Em Análise</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="rejected">Reprovado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-700">
                {users.filter(u => u.status === 'incomplete').length}
              </div>
              <div className="text-sm text-yellow-600">Incompletos</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">
                {users.filter(u => u.status === 'in_review').length}
              </div>
              <div className="text-sm text-blue-600">Em Análise</div>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-700">
                {users.filter(u => u.status === 'approved').length}
              </div>
              <div className="text-sm text-green-600">Aprovados</div>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-700">
                {users.filter(u => u.status === 'rejected').length}
              </div>
              <div className="text-sm text-red-600">Reprovados</div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum cadastro encontrado
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.profile_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.profile_email}
                        </div>
                        {user.person_type === 'pf' && user.cpf && (
                          <div className="text-xs text-muted-foreground">
                            CPF: {user.cpf}
                          </div>
                        )}
                        {user.person_type === 'pj' && user.cnpj && (
                          <div className="text-xs text-muted-foreground">
                            CNPJ: {user.cnpj}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPersonTypeBadge(user.person_type)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(user.status as UserDataStatus)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(user.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onSelectUser(user, user.user_id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Visualizar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
