import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus, Trash2, Loader2, Users, CalendarOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGestorCompany } from '@/hooks/useGestorCompany';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type OffType = 'folga' | 'feriado' | 'licenca' | 'ferias' | 'abono';

interface DayOff {
  id: string;
  user_id: string;
  company_id: string | null;
  off_date: string;
  off_type: OffType;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

const OFF_TYPE_CONFIG: Record<OffType, { label: string; color: string }> = {
  folga: { label: 'Folga', color: 'bg-blue-100 text-blue-800' },
  feriado: { label: 'Feriado', color: 'bg-green-100 text-green-800' },
  licenca: { label: 'Licença', color: 'bg-purple-100 text-purple-800' },
  ferias: { label: 'Férias', color: 'bg-orange-100 text-orange-800' },
  abono: { label: 'Abono', color: 'bg-gray-100 text-gray-800' },
};

export function DayOffManager() {
  const { user } = useAuth();
  const { companyId, isGestor, isAdmin, companyUserIds, loading: gestorLoading } = useGestorCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [dayOffs, setDayOffs] = useState<DayOff[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalDate, setModalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [modalOffType, setModalOffType] = useState<OffType>('folga');
  const [modalReason, setModalReason] = useState('');
  const [modalUserId, setModalUserId] = useState<string>('');
  const [modalBulk, setModalBulk] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (gestorLoading) return;
    if (isGestor && companyId) {
      setCompanies([{ id: companyId, name: 'Minha Empresa' }]);
      setSelectedCompanyId(companyId);
    } else if (isAdmin) {
      (async () => {
        const { data } = await supabase.from('companies').select('id, name').order('name');
        if (data && data.length > 0) {
          setCompanies(data);
          setSelectedCompanyId(data[0].id);
        }
      })();
    } else if (user?.id) {
      // Fallback for regular collaborators
      (async () => {
        const { data } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(1)
          .single();
        if (data?.company_id) {
          setCompanies([{ id: data.company_id, name: 'Minha Empresa' }]);
          setSelectedCompanyId(data.company_id);
        }
      })();
    }
  }, [gestorLoading, companyId, isGestor, isAdmin, user?.id]);

  useEffect(() => {
    if (selectedCompanyId) {
      loadUsers();
      loadDayOffs();
    }
  }, [selectedCompanyId, selectedMonth]);

  const loadUsers = async () => {
    const { data: ucData } = await supabase
      .from('user_companies')
      .select('user_id')
      .eq('company_id', selectedCompanyId)
      .eq('is_active', true);

    if (ucData && ucData.length > 0) {
      const userIds = ucData.map(u => u.user_id);
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds)
        .eq('is_active', true)
        .order('name');

      if (data) {
        setUsers(data.map(u => ({ id: u.id, name: u.name || u.email?.split('@')[0] || 'Sem nome' })));
        if (!modalUserId && data.length > 0) setModalUserId(data[0].id);
      }
    }
  };

  const loadDayOffs = async () => {
    setLoading(true);
    const startDate = `${selectedMonth}-01`;
    const endDate = format(endOfMonth(new Date(`${selectedMonth}-01`)), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('time_clock_day_offs')
      .select('*')
      .eq('company_id', selectedCompanyId)
      .gte('off_date', startDate)
      .lte('off_date', endDate)
      .order('off_date', { ascending: true });

    setDayOffs((data as DayOff[]) || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!modalDate || !modalOffType || !selectedCompanyId) {
      toast({ title: 'Dados incompletos', description: 'Selecione empresa, data e tipo.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    try {
      if (modalBulk) {
        // Bulk: delete existing then insert for all users
        const userIds = users.map(u => u.id);

        // Delete existing records for this date (avoids unique constraint + RLS UPDATE issues)
        const { error: delError } = await supabase
          .from('time_clock_day_offs')
          .delete()
          .in('user_id', userIds)
          .eq('off_date', modalDate)
          .eq('company_id', selectedCompanyId);

        if (delError) {
          console.error('Delete error (bulk):', delError);
        }

        const inserts = users.map(u => ({
          user_id: u.id,
          company_id: selectedCompanyId,
          off_date: modalDate,
          off_type: modalOffType,
          reason: modalReason || null,
          created_by: user?.id,
        }));

        const { error } = await supabase.from('time_clock_day_offs').insert(inserts);
        if (error) throw error;
        toast({ title: `${OFF_TYPE_CONFIG[modalOffType].label} lançado para ${users.length} colaboradores!` });
      } else {
        if (!modalUserId) return;

        // Delete existing record for this user+date first
        const { error: delError } = await supabase
          .from('time_clock_day_offs')
          .delete()
          .eq('user_id', modalUserId)
          .eq('off_date', modalDate)
          .eq('company_id', selectedCompanyId);

        if (delError) {
          console.error('Delete error (individual):', delError);
        }

        const { error } = await supabase.from('time_clock_day_offs').insert({
          user_id: modalUserId,
          company_id: selectedCompanyId,
          off_date: modalDate,
          off_type: modalOffType,
          reason: modalReason || null,
          created_by: user?.id,
        });
        if (error) throw error;
        toast({ title: `${OFF_TYPE_CONFIG[modalOffType].label} lançado com sucesso!` });
      }

      setShowModal(false);
      setModalReason('');
      setModalBulk(false);
      loadDayOffs();
    } catch (error: any) {
      console.error('Erro ao lançar folga:', error);
      toast({ title: 'Erro ao lançar', description: error.message, variant: 'destructive' });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('time_clock_day_offs').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Removido com sucesso!' });
      loadDayOffs();
    }
  };

  const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Desconhecido';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarOff className="h-5 w-5" />
                Gestão de Folgas e Feriados
              </CardTitle>
              <CardDescription>Lance folgas, feriados, férias e licenças para colaboradores</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setModalBulk(false); setShowModal(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Lançar Individual
              </Button>
              <Button variant="outline" onClick={() => { setModalBulk(true); setShowModal(true); }}>
                <Users className="h-4 w-4 mr-2" /> Lançar para Todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {isAdmin && companies.length > 1 && (
              <div className="space-y-1">
                <Label className="text-xs">Empresa</Label>
                <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Mês</Label>
              <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-[180px]" />
            </div>
          </div>

          {/* Summary badges */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(OFF_TYPE_CONFIG).map(([type, config]) => {
              const count = dayOffs.filter(d => d.off_type === type).length;
              if (count === 0) return null;
              return (
                <Badge key={type} className={config.color}>
                  {config.label}: {count}
                </Badge>
              );
            })}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : dayOffs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma folga lançada neste mês.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead className="w-[60px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayOffs.map((dayOff) => (
                    <TableRow key={dayOff.id}>
                      <TableCell>
                        {format(parseISO(dayOff.off_date), 'dd/MM/yyyy (EEE)', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">{getUserName(dayOff.user_id)}</TableCell>
                      <TableCell>
                        <Badge className={OFF_TYPE_CONFIG[dayOff.off_type]?.color || ''}>
                          {OFF_TYPE_CONFIG[dayOff.off_type]?.label || dayOff.off_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {dayOff.reason || '-'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(dayOff.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modalBulk ? 'Lançar para Todos os Colaboradores' : 'Lançar Folga/Feriado'}
            </DialogTitle>
            <DialogDescription>
              {modalBulk
                ? `Será lançado para todos os ${users.length} colaboradores da empresa.`
                : 'Selecione o colaborador e as informações do dia.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!modalBulk && (
              <div className="space-y-1">
                <Label>Colaborador</Label>
                <Select value={modalUserId} onValueChange={setModalUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={modalDate} onChange={(e) => setModalDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={modalOffType} onValueChange={(v) => setModalOffType(v as OffType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OFF_TYPE_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Motivo (opcional)</Label>
              <Textarea value={modalReason} onChange={(e) => setModalReason(e.target.value)} placeholder="Ex: Feriado nacional, folga compensatória..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !modalDate}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
