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
import { Search, Plus, Minus, MessageSquare, History, Users, TrendingUp, RefreshCcw, Calendar, User, ArrowUpRight, ArrowDownRight } from "lucide-react";
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

export function AdminSmsCreditsManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithCredits[]>([]);
  const [creditHistory, setCreditHistory] = useState<CreditHistory[]>([]);
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
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, role, is_active')
        .order('name');
      if (profilesError) throw profilesError;

      const { data: credits, error: creditsError } = await supabase
        .from('sms_credits')
        .select('user_id, credits_balance');
      if (creditsError) throw creditsError;

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
      toast({ title: "Erro", description: "Erro ao carregar usuários", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCreditHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('sms_credits_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const userIds = [...new Set([
        ...(data || []).map(h => h.user_id),
        ...(data || []).map(h => h.admin_id).filter(Boolean)
      ])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p.name || p.email || 'Usuário']) || []);

      const historyWithNames = (data || []).map(h => ({
        ...h,
        user_name: profilesMap.get(h.user_id) || 'Usuário',
        admin_name: h.admin_id ? profilesMap.get(h.admin_id) || 'Admin' : 'Sistema'
      }));

      setCreditHistory(historyWithNames);
    } catch (error) {
      console.error('Error fetching credit history:', error);
    }
  };

  const handleManageCredits = async () => {
    if (!selectedUser || !creditAmount) return;
    try {
      setIsLoading(true);
      const { error } = await supabase.rpc('admin_manage_sms_credits', {
        target_user_id: selectedUser.id,
        credit_action: creditAction,
        credit_amount: parseInt(creditAmount),
        credit_reason: creditReason || null
      });
      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `Créditos SMS ${creditAction === 'add' ? 'adicionados' : 'removidos'} com sucesso`,
      });
      setShowCreditModal(false);
      setCreditAmount("");
      setCreditReason("");
      setSelectedUser(null);
      fetchUsers();
      fetchCreditHistory();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao gerenciar créditos", variant: "destructive" });
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
  const totalConsumed = creditHistory
    .filter(h => h.action === 'consume')
    .reduce((sum, h) => sum + h.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 dark:from-emerald-900/20 dark:to-emerald-800/20 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Total Créditos SMS</p>
                <p className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{totalCredits}</p>
              </div>
              <MessageSquare className="h-10 w-10 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Com Créditos</p>
                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{usersWithCredits}</p>
              </div>
              <Users className="h-10 w-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 dark:from-purple-900/20 dark:to-purple-800/20 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Consumidos</p>
                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{totalConsumed}</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Gerenciar Créditos
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Créditos SMS por Usuário</CardTitle>
                  <CardDescription>Adicione ou remova créditos SMS dos colaboradores</CardDescription>
                </div>
                <Button variant="outline" onClick={fetchUsers}>
                  <RefreshCcw className="h-4 w-4 mr-2" /> Atualizar
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
                      <TableHead className="text-center">Créditos SMS</TableHead>
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
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-500" />
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
                              size="sm" variant="outline"
                              className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                              onClick={() => openCreditModal(user, 'add')}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Adicionar
                            </Button>
                            <Button
                              size="sm" variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50"
                              onClick={() => openCreditModal(user, 'remove')}
                              disabled={user.credits_balance === 0}
                            >
                              <Minus className="h-4 w-4 mr-1" /> Remover
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
              <CardTitle>Histórico de Créditos SMS</CardTitle>
              <CardDescription>Todas as movimentações de créditos SMS</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-center">Antes</TableHead>
                      <TableHead className="text-center">Depois</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditHistory.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">
                              {format(new Date(h.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{h.user_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {h.action === 'add' ? (
                              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                            ) : h.action === 'remove' ? (
                              <ArrowDownRight className="h-4 w-4 text-red-500" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="text-sm capitalize">{h.action === 'add' ? 'Adicionado' : h.action === 'remove' ? 'Removido' : 'Consumido'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold">{h.amount}</TableCell>
                        <TableCell className="text-center text-muted-foreground">{h.balance_before}</TableCell>
                        <TableCell className="text-center font-medium">{h.balance_after}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {h.reason || '-'}
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

      {/* Credit Modal */}
      <Dialog open={showCreditModal} onOpenChange={setShowCreditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creditAction === 'add' ? '➕ Adicionar' : '➖ Remover'} Créditos SMS
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedUser.name}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                <p className="text-sm mt-1">Saldo atual: <span className="font-bold">{selectedUser.credits_balance}</span></p>
              </div>
              <div>
                <label className="text-sm font-medium">Quantidade</label>
                <Input
                  type="number"
                  min="1"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(e.target.value)}
                  placeholder="Ex: 100"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Motivo (opcional)</label>
                <Textarea
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  placeholder="Ex: Recarga mensal SMS"
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditModal(false)}>Cancelar</Button>
            <Button
              onClick={handleManageCredits}
              disabled={isLoading || !creditAmount}
              className={creditAction === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isLoading ? 'Processando...' : creditAction === 'add' ? 'Adicionar' : 'Remover'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
