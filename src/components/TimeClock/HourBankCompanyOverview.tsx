import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, TrendingUp, TrendingDown, MinusCircle, RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGestorCompany } from '@/hooks/useGestorCompany';
import { useToast } from '@/hooks/use-toast';
import { formatMinutesToHM } from '@/lib/timeClockCalculations';

interface UserBalance {
  userId: string;
  userName: string;
  totalBalance: number;
  totalOvertime: number;
  totalDelay: number;
  activeRequest: any | null;
}

export function HourBankCompanyOverview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { companyUserIds, isAdmin, isGestor, loading: companyLoading } = useGestorCompany();
  const [loading, setLoading] = useState(false);
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [filter, setFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [search, setSearch] = useState('');

  // Compensation request dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'compensacao' | 'desconto_folha'>('compensacao');
  const [selectedUser, setSelectedUser] = useState<UserBalance | null>(null);
  const [requestMinutes, setRequestMinutes] = useState('');
  const [requestReason, setRequestReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!companyLoading) loadData();
  }, [companyLoading, companyUserIds]);

  const loadData = async () => {
    setLoading(true);
    const year = new Date().getFullYear().toString();

    // Get all user IDs to query
    let userIds: string[] = [];
    if (isAdmin) {
      const { data } = await supabase.from('profiles').select('id, name, email').eq('is_active', true);
      if (data) userIds = data.map(u => u.id);
    } else {
      userIds = companyUserIds;
    }

    if (userIds.length === 0) { setLoading(false); return; }

    // Get profiles
    const { data: profiles } = await supabase.from('profiles').select('id, name, email').in('id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.id, p.name || p.email?.split('@')[0] || 'Sem nome']));

    // Get hour bank data for current year
    const { data: bankData } = await supabase
      .from('time_clock_hour_bank')
      .select('user_id, balance_minutes, overtime_minutes, delay_minutes')
      .in('user_id', userIds)
      .gte('reference_month', `${year}-01`)
      .lte('reference_month', `${year}-12`);

    // Get active compensation requests
    const { data: activeRequests } = await supabase
      .from('hour_bank_compensation_requests')
      .select('*')
      .in('user_id', userIds)
      .in('status', ['pending', 'in_progress']);

    // Aggregate per user
    const balanceMap = new Map<string, { balance: number; overtime: number; delay: number }>();
    (bankData || []).forEach((row: any) => {
      const existing = balanceMap.get(row.user_id) || { balance: 0, overtime: 0, delay: 0 };
      existing.balance += row.balance_minutes || 0;
      existing.overtime += row.overtime_minutes || 0;
      existing.delay += row.delay_minutes || 0;
      balanceMap.set(row.user_id, existing);
    });

    const requestMap = new Map<string, any>();
    (activeRequests || []).forEach((r: any) => {
      requestMap.set(r.user_id, r);
    });

    const results: UserBalance[] = userIds.map(uid => ({
      userId: uid,
      userName: profileMap.get(uid) || 'Sem nome',
      totalBalance: balanceMap.get(uid)?.balance || 0,
      totalOvertime: balanceMap.get(uid)?.overtime || 0,
      totalDelay: balanceMap.get(uid)?.delay || 0,
      activeRequest: requestMap.get(uid) || null,
    }));

    setUserBalances(results);
    setLoading(false);
  };

  const openDialog = (userBal: UserBalance, type: 'compensacao' | 'desconto_folha') => {
    setSelectedUser(userBal);
    setDialogType(type);
    setRequestMinutes(Math.abs(userBal.totalBalance) > 0 ? Math.floor(Math.abs(userBal.totalBalance) / 60).toString() : '');
    setRequestReason('');
    setDialogOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedUser || !user || !requestMinutes) return;
    setSaving(true);
    const minutes = parseInt(requestMinutes) * 60;

    if (dialogType === 'desconto_folha') {
      // Direct discount entry
      const referenceMonth = new Date().toISOString().substring(0, 7);
      const { error } = await supabase.from('hour_bank_entries').insert({
        user_id: selectedUser.userId,
        entry_type: 'desconto_folha',
        minutes: -minutes,
        entry_date: new Date().toISOString().split('T')[0],
        reason: requestReason || 'Desconto em folha por horas negativas',
        reference_month: referenceMonth,
        performed_by: user.id,
      });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Desconto registrado com sucesso!' });
      }
    } else {
      // Create compensation request with 30min/day limit
      const { error } = await supabase.from('hour_bank_compensation_requests').insert({
        user_id: selectedUser.userId,
        requested_by: user.id,
        total_minutes: minutes,
        daily_limit_minutes: 30,
        compensation_type: 'compensacao',
        status: 'pending',
        reason: requestReason || 'Compensação de horas negativas',
      });
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Solicitação de compensação criada! O colaborador será notificado.' });
      }
    }

    setSaving(false);
    setDialogOpen(false);
    loadData();
  };

  const filtered = userBalances.filter(u => {
    if (filter === 'positive' && u.totalBalance <= 0) return false;
    if (filter === 'negative' && u.totalBalance >= 0) return false;
    if (search && !u.userName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading || companyLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Visão por Colaborador</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input className="pl-8 w-[180px]" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="positive">Positivo</SelectItem>
                  <SelectItem value="negative">Negativo</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={loadData}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum colaborador encontrado.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Saldo Acumulado</TableHead>
                    <TableHead>Horas Extras</TableHead>
                    <TableHead>Atrasos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(u => (
                    <TableRow key={u.userId}>
                      <TableCell className="font-medium">{u.userName}</TableCell>
                      <TableCell>
                        <Badge className={u.totalBalance >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {u.totalBalance >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {u.totalBalance >= 0 ? '+' : '-'}{formatMinutesToHM(Math.abs(u.totalBalance))}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-green-700">
                        {u.totalOvertime > 0 ? `+${formatMinutesToHM(u.totalOvertime)}` : '-'}
                      </TableCell>
                      <TableCell className="text-red-700">
                        {u.totalDelay > 0 ? `-${formatMinutesToHM(u.totalDelay)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {u.activeRequest ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                            Compensando ({formatMinutesToHM(u.activeRequest.compensated_minutes || 0)} / {formatMinutesToHM(u.activeRequest.total_minutes)})
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {u.totalBalance < 0 && !u.activeRequest && (
                            <>
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openDialog(u, 'compensacao')}>
                                Compensar
                              </Button>
                              <Button size="sm" variant="destructive" className="text-xs h-7" onClick={() => openDialog(u, 'desconto_folha')}>
                                <MinusCircle className="h-3 w-3 mr-1" /> Descontar
                              </Button>
                            </>
                          )}
                          {u.totalBalance >= 0 && u.totalBalance > 0 && (
                            <span className="text-xs text-muted-foreground">Saldo positivo</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog for creating compensation request or discount */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogType === 'compensacao' ? 'Solicitar Compensação' : 'Lançar Desconto em Folha'}
            </DialogTitle>
            <DialogDescription>
              {dialogType === 'compensacao'
                ? `O colaborador ${selectedUser?.userName} compensará no máximo 30min por dia trabalhado.`
                : `Desconto será aplicado diretamente no banco de horas de ${selectedUser?.userName}.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm">Saldo atual: <span className="font-bold text-red-700">
                {selectedUser && formatMinutesToHM(Math.abs(selectedUser.totalBalance))} negativas
              </span></p>
            </div>

            <div className="space-y-2">
              <Label>Horas a {dialogType === 'compensacao' ? 'compensar' : 'descontar'}</Label>
              <Input
                type="number"
                min="1"
                value={requestMinutes}
                onChange={e => setRequestMinutes(e.target.value)}
                placeholder="Ex: 4"
              />
              {dialogType === 'compensacao' && requestMinutes && (
                <p className="text-xs text-muted-foreground">
                  A 30min/dia, levará aproximadamente {Math.ceil((parseInt(requestMinutes) * 60) / 30)} dias úteis.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea
                value={requestReason}
                onChange={e => setRequestReason(e.target.value)}
                placeholder={dialogType === 'compensacao' ? 'Compensação de horas negativas' : 'Desconto por horas negativas acumuladas'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={saving || !requestMinutes}
              variant={dialogType === 'desconto_folha' ? 'destructive' : 'default'}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {dialogType === 'compensacao' ? 'Solicitar Compensação' : 'Lançar Desconto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
