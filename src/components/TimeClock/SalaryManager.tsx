import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Edit, Plus, Clock, TrendingUp, History, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useGestorCompany } from '@/hooks/useGestorCompany';
import { format, parseISO, addMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SalaryRecord {
  id: string;
  user_id: string;
  company_id: string | null;
  base_salary: number;
  cargo: string;
  is_active: boolean;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

type Mode = 'new' | 'raise' | 'fix';

export function SalaryManager() {
  const { isAdmin } = useAuth();
  const { companyId } = useGestorCompany();
  const { toast } = useToast();
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [history, setHistory] = useState<SalaryRecord[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<Mode>('new');
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [historyUser, setHistoryUser] = useState<SalaryRecord | null>(null);
  const defaultEffective = format(startOfMonth(addMonths(new Date(), 1)), 'yyyy-MM-dd');
  const [formData, setFormData] = useState({
    user_id: '',
    base_salary: '',
    cargo: 'Colaborador',
    effective_from: defaultEffective,
  });
  const [filterCompany, setFilterCompany] = useState<string>(companyId || 'all');
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => { loadData(); }, [filterCompany]);

  const loadData = async () => {
    setLoading(true);
    if (isAdmin) {
      const { data: comps } = await supabase.from('companies').select('id, name').eq('is_active', true);
      setCompanies(comps || []);
    }

    // Only currently-vigent rows for the main grid
    let salaryQuery = supabase.from('employee_salaries').select('*').is('effective_to', null).eq('is_active', true);
    if (filterCompany && filterCompany !== 'all') salaryQuery = salaryQuery.eq('company_id', filterCompany);
    const { data: salaryData } = await salaryQuery;

    const targetCompany = filterCompany !== 'all' ? filterCompany : companyId;
    let userQuery = supabase.from('profiles').select('id, name, email');
    if (targetCompany) {
      const { data: ucData } = await supabase.from('user_companies').select('user_id').eq('company_id', targetCompany).eq('is_active', true);
      const userIds = ucData?.map(u => u.user_id) || [];
      if (userIds.length > 0) userQuery = userQuery.in('id', userIds);
    }
    const { data: userData } = await userQuery;
    setUsers(userData || []);

    const merged = (salaryData || []).map((s: any) => {
      const u = userData?.find(u => u.id === s.user_id);
      return { ...s, user_name: u?.name, user_email: u?.email };
    });
    setSalaries(merged);
    setLoading(false);
  };

  const loadHistory = async (record: SalaryRecord) => {
    setHistoryUser(record);
    let q = supabase.from('employee_salaries').select('*').eq('user_id', record.user_id).order('effective_from', { ascending: false });
    if (record.company_id) q = q.eq('company_id', record.company_id);
    const { data } = await q;
    setHistory((data || []) as any);
  };

  const hourlyRate = (salary: number) => (salary / 176).toFixed(2);
  const minuteRate = (salary: number) => (salary / 176 / 60).toFixed(4);

  const openNew = () => {
    setMode('new');
    setEditingRecord(null);
    setFormData({ user_id: '', base_salary: '', cargo: 'Colaborador', effective_from: format(new Date(), 'yyyy-MM-dd') });
    setShowModal(true);
  };

  const openRaise = (record: SalaryRecord) => {
    setMode('raise');
    setEditingRecord(record);
    setFormData({ user_id: record.user_id, base_salary: '', cargo: record.cargo, effective_from: defaultEffective });
    setShowModal(true);
  };

  const openFix = (record: SalaryRecord) => {
    setMode('fix');
    setEditingRecord(record);
    setFormData({
      user_id: record.user_id,
      base_salary: String(record.base_salary),
      cargo: record.cargo,
      effective_from: record.effective_from,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    const salary = parseFloat(formData.base_salary);
    if (!formData.user_id || isNaN(salary) || salary <= 0) {
      toast({ title: 'Preencha salário e colaborador', variant: 'destructive' });
      return;
    }
    const targetCompany = filterCompany !== 'all' ? filterCompany : companyId;

    if (mode === 'new') {
      const { error } = await supabase.from('employee_salaries').insert({
        user_id: formData.user_id,
        company_id: targetCompany,
        base_salary: salary,
        cargo: formData.cargo || 'Colaborador',
        is_active: true,
        effective_from: formData.effective_from,
      });
      if (error) {
        toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Salário cadastrado!' });
    } else if (mode === 'raise' && editingRecord) {
      const { error } = await (supabase as any).rpc('register_salary_change', {
        p_user_id: editingRecord.user_id,
        p_company_id: editingRecord.company_id,
        p_new_salary: salary,
        p_new_cargo: formData.cargo,
        p_effective_from: formData.effective_from,
      });
      if (error) {
        toast({ title: 'Erro ao registrar aumento', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Aumento registrado! Histórico preservado.' });
    } else if (mode === 'fix' && editingRecord) {
      const { error } = await supabase.from('employee_salaries').update({
        base_salary: salary,
        cargo: formData.cargo,
        effective_from: formData.effective_from,
      }).eq('id', editingRecord.id);
      if (error) {
        toast({ title: 'Erro ao corrigir', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Valor corrigido (histórico não foi alterado)' });
    }
    setShowModal(false);
    loadData();
  };

  const usersWithoutSalary = users.filter(u => !salaries.find(s => s.user_id === u.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Gestão de Salários
        </h2>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todas empresas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas empresas</SelectItem>
                {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button onClick={openNew} size="sm"><Plus className="h-4 w-4 mr-1" />Cadastrar Salário</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Colaboradores</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{salaries.length}</div><p className="text-xs text-muted-foreground">com salário vigente</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Folha Mensal</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">R$ {salaries.reduce((s, x) => s + Number(x.base_salary), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div><p className="text-xs text-muted-foreground">total bruto</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Sem Cadastro</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{usersWithoutSalary.length}</div><p className="text-xs text-muted-foreground">colaboradores pendentes</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Salário Vigente</TableHead>
                <TableHead>Vigência desde</TableHead>
                <TableHead>Valor/Hora</TableHead>
                <TableHead className="w-[160px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : salaries.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum salário cadastrado</TableCell></TableRow>
              ) : salaries.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.user_name || 'Sem nome'}</div>
                    <div className="text-xs text-muted-foreground">{s.user_email}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{s.cargo}</Badge></TableCell>
                  <TableCell className="font-medium">R$ {Number(s.base_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.effective_from ? format(parseISO(s.effective_from), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                  </TableCell>
                  <TableCell><div className="flex items-center gap-1 text-sm"><Clock className="h-3 w-3 text-muted-foreground" />R$ {hourlyRate(Number(s.base_salary))}</div></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Registrar aumento" onClick={() => openRaise(s)}>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Corrigir valor atual" onClick={() => openFix(s)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Histórico" onClick={() => loadHistory(s)}>
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cadastrar / Aumento / Correção */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {mode === 'new' && 'Cadastrar Salário'}
              {mode === 'raise' && 'Registrar Aumento'}
              {mode === 'fix' && 'Corrigir Valor Atual'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'raise' && 'Cria um novo registro com vigência a partir da data informada. As folhas anteriores continuam com o salário antigo.'}
              {mode === 'fix' && 'Corrige o valor do salário vigente sem criar histórico. Use apenas para erro de digitação.'}
              {mode === 'new' && 'Primeiro salário do colaborador. Próximas mudanças devem usar “Registrar aumento”.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {mode === 'new' && (
              <div className="space-y-2">
                <Label>Colaborador</Label>
                <Select value={formData.user_id} onValueChange={(v) => setFormData(p => ({ ...p, user_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {usersWithoutSalary.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {mode === 'raise' && editingRecord && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <div className="font-medium">{editingRecord.user_name}</div>
                <div className="text-muted-foreground">Salário atual: R$ {Number(editingRecord.base_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={formData.cargo} onChange={(e) => setFormData(p => ({ ...p, cargo: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{mode === 'raise' ? 'Novo Salário (R$)' : 'Salário Base (R$)'}</Label>
              <Input type="number" step="0.01" value={formData.base_salary} onChange={(e) => setFormData(p => ({ ...p, base_salary: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>{mode === 'fix' ? 'Início da vigência (correção)' : mode === 'raise' ? 'Vigência a partir de' : 'Vigência inicial'}</Label>
              <Input type="date" value={formData.effective_from} onChange={(e) => setFormData(p => ({ ...p, effective_from: e.target.value }))} />
              {mode === 'raise' && (
                <p className="text-xs text-muted-foreground">O salário anterior será encerrado em {formData.effective_from ? format(new Date(new Date(formData.effective_from).getTime() - 86400000), 'dd/MM/yyyy') : '-'}.</p>
              )}
            </div>
            {formData.base_salary && !isNaN(parseFloat(formData.base_salary)) && (
              <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Valor/Hora:</span><span className="font-medium">R$ {hourlyRate(parseFloat(formData.base_salary))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Desconto/Min:</span><span className="font-medium">R$ {minuteRate(parseFloat(formData.base_salary))}</span></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave}>
              {mode === 'new' && 'Cadastrar'}
              {mode === 'raise' && 'Registrar aumento'}
              {mode === 'fix' && 'Salvar correção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Histórico */}
      <Dialog open={!!historyUser} onOpenChange={(o) => !o && setHistoryUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico de Salários</DialogTitle>
            <DialogDescription>{historyUser?.user_name}</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vigência</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Salário</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map(h => (
                <TableRow key={h.id}>
                  <TableCell className="text-sm">
                    {h.effective_from ? format(parseISO(h.effective_from), 'dd/MM/yyyy') : '-'}
                    {' → '}
                    {h.effective_to ? format(parseISO(h.effective_to), 'dd/MM/yyyy') : 'atual'}
                  </TableCell>
                  <TableCell>{h.cargo}</TableCell>
                  <TableCell className="text-right font-medium">R$ {Number(h.base_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    {h.effective_to === null
                      ? <Badge className="bg-green-100 text-green-800">Vigente</Badge>
                      : <Badge variant="outline">Encerrado</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
