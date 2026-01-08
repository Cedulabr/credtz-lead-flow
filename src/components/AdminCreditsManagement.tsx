import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, 
  Plus, 
  Minus, 
  Coins, 
  History, 
  Users, 
  TrendingUp,
  RefreshCcw,
  Calendar,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Zap
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserWithCredits {
  id: string;
  name: string;
  email: string;
  credits_balance: number;
  role: string;
  is_active: boolean;
}

interface CreditHistory {
  id: string;
  user_id: string;
  admin_id: string;
  action: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  reason: string | null;
  created_at: string;
  user_name?: string;
  admin_name?: string;
}

interface LeadDistribution {
  user_id: string;
  user_name: string;
  leads_distributed: number;
  credits_consumed: number;
  last_request: string;
}

export function AdminCreditsManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithCredits[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditHistory[]>([]);
  const [distributions, setDistributions] = useState<LeadDistribution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithCredits | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAction, setCreditAction] = useState<'add' | 'remove'>('add');
  const [creditAmount, setCreditAmount] = useState("");
  const [creditReason, setCreditReason] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchCreditHistory();
    fetchDistributions();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      
      // Fetch all users with their credits
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, role, is_active')
        .order('name');

      if (profilesError) throw profilesError;

      // Fetch credits for all users
      const { data: credits, error: creditsError } = await supabase
        .from('user_credits')
        .select('user_id, credits_balance');

      if (creditsError) throw creditsError;

      // Map credits to users
      const creditsMap = new Map(credits?.map(c => [c.user_id, c.credits_balance]) || []);
      
      const usersWithCredits: UserWithCredits[] = (profiles || []).map(p => ({
        id: p.id,
        name: p.name || p.email || 'Sem nome',
        email: p.email || '',
        credits_balance: creditsMap.get(p.id) || 0,
        role: p.role || 'partner',
        is_active: p.is_active ?? true
      }));

      setUsers(usersWithCredits);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCreditHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('credits_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Fetch user names
      const userIds = [...new Set([
        ...(data || []).map(h => h.user_id),
        ...(data || []).map(h => h.admin_id)
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p.name || p.email || 'Usuário']) || []);

      const historyWithNames = (data || []).map(h => ({
        ...h,
        user_name: profilesMap.get(h.user_id) || 'Usuário',
        admin_name: profilesMap.get(h.admin_id) || 'Admin'
      }));

      setCreditHistory(historyWithNames);
    } catch (error) {
      console.error('Error fetching credit history:', error);
    }
  };

  const fetchDistributions = async () => {
    try {
      // Get lead requests grouped by user
      const { data: requests, error } = await supabase
        .from('lead_requests')
        .select('user_id, leads_count, requested_at')
        .order('requested_at', { ascending: false });

      if (error) throw error;

      // Group by user
      const userStats = new Map<string, { leads: number, lastRequest: string }>();
      
      (requests || []).forEach(r => {
        const existing = userStats.get(r.user_id);
        if (existing) {
          existing.leads += r.leads_count;
        } else {
          userStats.set(r.user_id, { 
            leads: r.leads_count, 
            lastRequest: r.requested_at 
          });
        }
      });

      // Get user names
      const userIds = Array.from(userStats.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p.name || p.email || 'Usuário']) || []);

      // Get credits consumed
      const { data: credits } = await supabase
        .from('credits_history')
        .select('user_id, amount')
        .eq('action', 'consume');

      const consumedMap = new Map<string, number>();
      (credits || []).forEach(c => {
        const existing = consumedMap.get(c.user_id) || 0;
        consumedMap.set(c.user_id, existing + c.amount);
      });

      const distributionsList: LeadDistribution[] = Array.from(userStats.entries()).map(([userId, stats]) => ({
        user_id: userId,
        user_name: profilesMap.get(userId) || 'Usuário',
        leads_distributed: stats.leads,
        credits_consumed: consumedMap.get(userId) || 0,
        last_request: stats.lastRequest
      }));

      setDistributions(distributionsList.sort((a, b) => b.leads_distributed - a.leads_distributed));
    } catch (error) {
      console.error('Error fetching distributions:', error);
    }
  };

  const handleManageCredits = async () => {
    if (!selectedUser || !creditAmount) return;

    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.rpc('admin_manage_credits', {
        target_user_id: selectedUser.id,
        credit_action: creditAction,
        credit_amount: parseInt(creditAmount),
        credit_reason: creditReason || null
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `Créditos ${creditAction === 'add' ? 'adicionados' : 'removidos'} com sucesso`,
      });

      setShowCreditModal(false);
      setCreditAmount("");
      setCreditReason("");
      setSelectedUser(null);
      
      fetchUsers();
      fetchCreditHistory();
    } catch (error: any) {
      console.error('Error managing credits:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerenciar créditos",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreditModal = (user: UserWithCredits, action: 'add' | 'remove') => {
    setSelectedUser(user);
    setCreditAction(action);
    setCreditAmount("");
    setCreditReason("");
    setShowCreditModal(true);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCredits = users.reduce((sum, u) => sum + u.credits_balance, 0);
  const usersWithCredits = users.filter(u => u.credits_balance > 0).length;
  const totalConsumed = distributions.reduce((sum, d) => sum + d.credits_consumed, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Total de Créditos</p>
                <p className="text-3xl font-bold text-emerald-700">{totalCredits}</p>
              </div>
              <Coins className="h-10 w-10 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Usuários com Créditos</p>
                <p className="text-3xl font-bold text-blue-700">{usersWithCredits}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Créditos Consumidos</p>
                <p className="text-3xl font-bold text-purple-700">{totalConsumed}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Leads Distribuídos</p>
                <p className="text-3xl font-bold text-amber-700">
                  {distributions.reduce((sum, d) => sum + d.leads_distributed, 0)}
                </p>
              </div>
              <Zap className="h-10 w-10 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Gerenciar Créditos
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Distribuição
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Gerenciar Créditos de Usuários</CardTitle>
                  <CardDescription>Adicione ou remova créditos dos usuários</CardDescription>
                </div>
                <Button variant="outline" onClick={fetchUsers}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuário..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Créditos</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                            {user.role === 'admin' ? 'Admin' : 'Parceiro'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'default' : 'destructive'}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Coins className="h-4 w-4 text-amber-500" />
                            <span className={`font-bold text-lg ${
                              user.credits_balance === 0 ? 'text-red-500' : 'text-emerald-600'
                            }`}>
                              {user.credits_balance}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                              onClick={() => openCreditModal(user, 'add')}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Adicionar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => openCreditModal(user, 'remove')}
                              disabled={user.credits_balance === 0}
                            >
                              <Minus className="h-4 w-4 mr-1" />
                              Remover
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Créditos</CardTitle>
              <CardDescription>Todas as movimentações de créditos</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-center">Saldo Anterior</TableHead>
                      <TableHead className="text-center">Saldo Novo</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Responsável</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditHistory.map((history) => (
                      <TableRow key={history.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(history.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{history.user_name}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={history.action === 'add' ? 'default' : history.action === 'remove' ? 'destructive' : 'secondary'}
                            className="flex items-center gap-1 w-fit"
                          >
                            {history.action === 'add' ? (
                              <><ArrowUpRight className="h-3 w-3" /> Adicionado</>
                            ) : history.action === 'remove' ? (
                              <><ArrowDownRight className="h-3 w-3" /> Removido</>
                            ) : (
                              <><Zap className="h-3 w-3" /> Consumido</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          <span className={history.action === 'add' ? 'text-emerald-600' : 'text-red-600'}>
                            {history.action === 'add' ? '+' : '-'}{history.amount}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{history.balance_before}</TableCell>
                        <TableCell className="text-center font-bold">{history.balance_after}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {history.reason || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {history.admin_name}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Leads por Usuário</CardTitle>
              <CardDescription>Relatório de leads distribuídos e créditos consumidos</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead className="text-center">Leads Recebidos</TableHead>
                      <TableHead className="text-center">Créditos Consumidos</TableHead>
                      <TableHead>Última Solicitação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {distributions.map((dist) => (
                      <TableRow key={dist.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <span className="font-medium">{dist.user_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Zap className="h-4 w-4 text-amber-500" />
                            <span className="font-bold text-lg">{dist.leads_distributed}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Coins className="h-4 w-4 text-purple-500" />
                            <span className="font-bold text-lg text-purple-600">{dist.credits_consumed}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(dist.last_request), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Credit Management Modal */}
      <Dialog open={showCreditModal} onOpenChange={setShowCreditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditAction === 'add' ? 'Adicionar Créditos' : 'Remover Créditos'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">{selectedUser?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Saldo atual: <span className="font-bold">{selectedUser?.credits_balance} créditos</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade de Créditos</label>
              <Input
                type="number"
                min="1"
                placeholder="Ex: 100"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <Textarea
                placeholder="Informe o motivo da alteração..."
                value={creditReason}
                onChange={(e) => setCreditReason(e.target.value)}
                rows={3}
              />
            </div>

            {creditAmount && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Novo saldo:</p>
                <p className="text-2xl font-bold">
                  {creditAction === 'add' 
                    ? (selectedUser?.credits_balance || 0) + parseInt(creditAmount || '0')
                    : Math.max(0, (selectedUser?.credits_balance || 0) - parseInt(creditAmount || '0'))
                  } créditos
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleManageCredits}
              disabled={!creditAmount || isLoading}
              className={creditAction === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isLoading ? 'Processando...' : creditAction === 'add' ? 'Adicionar Créditos' : 'Remover Créditos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
