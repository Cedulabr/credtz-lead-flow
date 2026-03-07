import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Edit, Plus, Users, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useGestorCompany } from '@/hooks/useGestorCompany';

interface SalaryRecord {
  id: string;
  user_id: string;
  company_id: string | null;
  base_salary: number;
  cargo: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_name?: string;
  user_email?: string;
}

export function SalaryManager() {
  const { user, isAdmin } = useAuth();
  const { companyId } = useGestorCompany();
  const { toast } = useToast();
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ user_id: '', base_salary: '', cargo: 'Colaborador' });
  const [filterCompany, setFilterCompany] = useState<string>(companyId || 'all');
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [filterCompany]);

  const loadData = async () => {
    setLoading(true);

    // Load companies for filter
    if (isAdmin) {
      const { data: comps } = await supabase.from('companies').select('id, name').eq('is_active', true);
      setCompanies(comps || []);
    }

    // Load salaries
    let salaryQuery = supabase.from('employee_salaries').select('*').eq('is_active', true);
    if (filterCompany && filterCompany !== 'all') {
      salaryQuery = salaryQuery.eq('company_id', filterCompany);
    }
    const { data: salaryData } = await salaryQuery;

    // Load users for name mapping
    const targetCompany = filterCompany !== 'all' ? filterCompany : companyId;
    let userQuery = supabase.from('profiles').select('id, name, email');
    if (targetCompany) {
      const { data: ucData } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_id', targetCompany)
        .eq('is_active', true);
      const userIds = ucData?.map(u => u.user_id) || [];
      if (userIds.length > 0) {
        userQuery = userQuery.in('id', userIds);
      }
    }
    const { data: userData } = await userQuery;
    setUsers(userData || []);

    // Merge names into salary data
    const merged = (salaryData || []).map(s => {
      const u = userData?.find(u => u.id === s.user_id);
      return { ...s, user_name: u?.name, user_email: u?.email };
    });
    setSalaries(merged);
    setLoading(false);
  };

  const hourlyRate = (salary: number) => (salary / 176).toFixed(2);
  const minuteRate = (salary: number) => (salary / 176 / 60).toFixed(4);

  const handleSave = async () => {
    const salary = parseFloat(formData.base_salary);
    if (!formData.user_id || isNaN(salary)) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    const payload = {
      user_id: formData.user_id,
      company_id: filterCompany !== 'all' ? filterCompany : companyId,
      base_salary: salary,
      cargo: formData.cargo || 'Colaborador',
    };

    if (editingId) {
      const { error } = await supabase.from('employee_salaries').update(payload).eq('id', editingId);
      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Salário atualizado com sucesso!' });
    } else {
      const { error } = await supabase.from('employee_salaries').insert(payload);
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Este colaborador já possui salário cadastrado nesta empresa', variant: 'destructive' });
        } else {
          toast({ title: 'Erro ao cadastrar', description: error.message, variant: 'destructive' });
        }
        return;
      }
      toast({ title: 'Salário cadastrado com sucesso!' });
    }

    setShowModal(false);
    setEditingId(null);
    setFormData({ user_id: '', base_salary: '', cargo: 'Colaborador' });
    loadData();
  };

  const openEdit = (record: SalaryRecord) => {
    setEditingId(record.id);
    setFormData({
      user_id: record.user_id,
      base_salary: String(record.base_salary),
      cargo: record.cargo,
    });
    setShowModal(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({ user_id: '', base_salary: '', cargo: 'Colaborador' });
    setShowModal(true);
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
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todas empresas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas empresas</SelectItem>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={openNew} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Cadastrar Salário
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Colaboradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salaries.length}</div>
            <p className="text-xs text-muted-foreground">com salário cadastrado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Folha Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {salaries.reduce((sum, s) => sum + Number(s.base_salary), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">total bruto</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sem Cadastro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersWithoutSalary.length}</div>
            <p className="text-xs text-muted-foreground">colaboradores pendentes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Salário Base</TableHead>
                <TableHead>Valor/Hora</TableHead>
                <TableHead>Valor/Min Desconto</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : salaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum salário cadastrado
                  </TableCell>
                </TableRow>
              ) : salaries.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{s.user_name || 'Sem nome'}</div>
                      <div className="text-xs text-muted-foreground">{s.user_email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.cargo}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    R$ {Number(s.base_salary).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      R$ {hourlyRate(Number(s.base_salary))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    R$ {minuteRate(Number(s.base_salary))}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Salário' : 'Cadastrar Salário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select
                value={formData.user_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, user_id: v }))}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador" />
                </SelectTrigger>
                <SelectContent>
                  {(editingId ? users : usersWithoutSalary).map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input
                value={formData.cargo}
                onChange={(e) => setFormData(prev => ({ ...prev, cargo: e.target.value }))}
                placeholder="Ex: Consultor, Analista, Gerente"
              />
            </div>
            <div className="space-y-2">
              <Label>Salário Base (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.base_salary}
                onChange={(e) => setFormData(prev => ({ ...prev, base_salary: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            {formData.base_salary && !isNaN(parseFloat(formData.base_salary)) && (
              <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor/Hora:</span>
                  <span className="font-medium">R$ {hourlyRate(parseFloat(formData.base_salary))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Desconto/Minuto atraso:</span>
                  <span className="font-medium">R$ {minuteRate(parseFloat(formData.base_salary))}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Atualizar' : 'Cadastrar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
