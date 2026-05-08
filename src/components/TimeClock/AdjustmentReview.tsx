import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Paperclip, Check, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useGestorCompany } from '@/hooks/useGestorCompany';

const TYPE_LABELS: Record<string, string> = {
  add_entry: 'Adicionar entrada', add_exit: 'Adicionar saída',
  add_break_start: 'Adicionar início de pausa', add_break_end: 'Adicionar fim de pausa',
  edit_entry: 'Editar entrada', edit_exit: 'Editar saída',
  edit_break_start: 'Editar início de pausa', edit_break_end: 'Editar fim de pausa',
  remove_record: 'Remover registro', justify_absence: 'Justificar ausência', other: 'Outro',
};

const STATUS_VARIANT: Record<string, any> = {
  pending: 'secondary', approved: 'default', rejected: 'destructive', cancelled: 'outline',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', approved: 'Aprovada', rejected: 'Rejeitada', cancelled: 'Cancelada',
};

const ADJ_TYPES_FORM = [
  'add_entry','add_exit','add_break_start','add_break_end',
  'edit_entry','edit_exit','edit_break_start','edit_break_end',
  'remove_record',
];

export function AdjustmentReview() {
  const { user } = useAuth();
  const { isAdmin, isGestor, companyId, companyUserIds } = useGestorCompany();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [reviewing, setReviewing] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [users, setUsers] = useState<{ id: string; name: string; company_id: string | null }[]>([]);
  const [newUserId, setNewUserId] = useState<string>('');
  const [newDate, setNewDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [newType, setNewType] = useState<string>('add_entry');
  const [newTime, setNewTime] = useState<string>('');
  const [newReason, setNewReason] = useState<string>('');
  const [newTargetId, setNewTargetId] = useState<string>('');
  const [dayRecords, setDayRecords] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    let q = (supabase as any)
      .from('time_clock_adjustment_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (filter === 'pending') q = q.eq('status', 'pending');
    const { data, error } = await q;
    if (error) { toast.error('Erro ao carregar'); setLoading(false); return; }
    setItems(data || []);

    const ids = Array.from(new Set((data || []).map((d: any) => d.user_id)));
    if (ids.length) {
      const { data: profs } = await (supabase as any).rpc('get_profiles_by_ids', { _user_ids: ids });
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p.name || p.email || p.id; });
      setProfileMap(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  // Load eligible users for "Lançar ajuste"
  useEffect(() => {
    (async () => {
      try {
        let userIds: string[] = [];
        let userCompany: Record<string, string | null> = {};
        if (isAdmin) {
          const { data: ucData } = await supabase
            .from('user_companies')
            .select('user_id, company_id')
            .eq('is_active', true);
          (ucData || []).forEach((r: any) => {
            userIds.push(r.user_id);
            userCompany[r.user_id] = r.company_id;
          });
        } else if (isGestor) {
          userIds = companyUserIds;
          userIds.forEach(id => { userCompany[id] = companyId; });
        }
        userIds = Array.from(new Set(userIds));
        if (!userIds.length) { setUsers([]); return; }
        const { data: profs } = await (supabase as any).rpc('get_profiles_by_ids', { _user_ids: userIds });
        const list = (profs || []).map((p: any) => ({
          id: p.id,
          name: p.name || p.email || p.id,
          company_id: userCompany[p.id] || null,
        })).sort((a: any, b: any) => a.name.localeCompare(b.name));
        setUsers(list);
      } catch (e) {
        console.error('load users error', e);
      }
    })();
  }, [isAdmin, isGestor, companyId, companyUserIds.join(',')]);

  // When user/date/type changes, load existing day records (for edit/remove)
  useEffect(() => {
    if (!createOpen || !newUserId || !newDate) { setDayRecords([]); return; }
    const needsTarget = newType.startsWith('edit_') || newType === 'remove_record';
    if (!needsTarget) { setDayRecords([]); return; }
    (async () => {
      const { data } = await supabase
        .from('time_clock')
        .select('id, clock_type, clock_time, status')
        .eq('user_id', newUserId)
        .eq('clock_date', newDate)
        .order('clock_time');
      setDayRecords(data || []);
    })();
  }, [createOpen, newUserId, newDate, newType]);

  const decide = async (status: 'approved' | 'rejected') => {
    if (!reviewing || !user) return;
    setSubmitting(true);
    const { error } = await (supabase as any)
      .from('time_clock_adjustment_requests')
      .update({
        status, review_notes: reviewNotes || null,
        reviewed_by: user.id, reviewed_at: new Date().toISOString(),
      })
      .eq('id', reviewing.id);
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(status === 'approved' ? 'Solicitação aprovada e dia recalculado' : 'Solicitação rejeitada');
    setReviewing(null); setReviewNotes(''); load();
  };

  const openAttachment = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('time-clock-attachments')
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return toast.error('Erro ao abrir anexo');
    window.open(data.signedUrl, '_blank');
  };

  const resetCreateForm = () => {
    setNewUserId(''); setNewDate(format(new Date(), 'yyyy-MM-dd'));
    setNewType('add_entry'); setNewTime(''); setNewReason(''); setNewTargetId('');
    setDayRecords([]);
  };

  const submitCreate = async () => {
    if (!user) return;
    if (!newUserId) return toast.error('Selecione o colaborador');
    if (!newDate) return toast.error('Selecione a data');
    if (!newReason.trim()) return toast.error('Informe o motivo');
    const needsTime = newType.startsWith('add_') || newType.startsWith('edit_');
    if (needsTime && !newTime) return toast.error('Informe o horário');
    const needsTarget = newType.startsWith('edit_') || newType === 'remove_record';
    if (needsTarget && !newTargetId) return toast.error('Selecione a batida alvo');

    const target = users.find(u => u.id === newUserId);
    setCreating(true);
    const payload: any = {
      user_id: newUserId,
      company_id: target?.company_id || null,
      clock_date: newDate,
      adjustment_type: newType,
      proposed_time: needsTime ? newTime : null,
      target_record_id: needsTarget ? newTargetId : null,
      reason: `Lançamento administrativo: ${newReason.trim()}`,
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: 'Lançado e aprovado por administrador/gestor',
    };
    const { error } = await (supabase as any)
      .from('time_clock_adjustment_requests')
      .insert(payload);
    setCreating(false);
    if (error) return toast.error(error.message);
    toast.success('Ajuste lançado e aplicado ao ponto do colaborador');
    setCreateOpen(false);
    resetCreateForm();
    load();
  };

  const canCreate = isAdmin || isGestor;
  const needsTimeField = newType.startsWith('add_') || newType.startsWith('edit_');
  const needsTargetField = newType.startsWith('edit_') || newType === 'remove_record';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle>Revisão de Ajustes de Ponto</CardTitle>
            <p className="text-sm text-muted-foreground">Aprovar, rejeitar ou lançar ajustes em nome de colaboradores.</p>
          </div>
          {canCreate && (
            <Button size="sm" onClick={() => { resetCreateForm(); setCreateOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Lançar ajuste
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="all">Todas</TabsTrigger>
          </TabsList>
          <TabsContent value={filter} className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma solicitação.</p>
            ) : (
              <div className="space-y-3">
                {items.map((r) => (
                  <div key={r.id} className="border rounded-lg p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                        <span className="font-medium">{profileMap[r.user_id] || 'Colaborador'}</span>
                        <span className="text-sm">·</span>
                        <span className="text-sm">{TYPE_LABELS[r.adjustment_type]}</span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(r.clock_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                          {r.proposed_time && ` às ${r.proposed_time.slice(0, 5)}`}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.reason}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.attachment_path && (
                        <Button variant="outline" size="sm" onClick={() => openAttachment(r.attachment_path)}>
                          <Paperclip className="h-3 w-3 mr-1" />Anexo
                        </Button>
                      )}
                      {r.status === 'pending' && (
                        <Button size="sm" onClick={() => { setReviewing(r); setReviewNotes(''); }}>Revisar</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Revisar solicitação</DialogTitle></DialogHeader>
          {reviewing && (
            <div className="space-y-3 py-2">
              <div className="text-sm">
                <p><strong>Colaborador:</strong> {profileMap[reviewing.user_id]}</p>
                <p><strong>Data:</strong> {format(new Date(reviewing.clock_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}</p>
                <p><strong>Tipo:</strong> {TYPE_LABELS[reviewing.adjustment_type]}</p>
                {reviewing.proposed_time && <p><strong>Horário:</strong> {reviewing.proposed_time.slice(0, 5)}</p>}
                <p className="mt-2"><strong>Motivo:</strong> {reviewing.reason}</p>
              </div>
              <Textarea
                placeholder="Notas da revisão (opcional)"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
          <DialogFooter className="sticky bottom-0 bg-background pt-3">
            <Button variant="destructive" onClick={() => decide('rejected')} disabled={submitting}>
              <X className="h-4 w-4 mr-1" />Rejeitar
            </Button>
            <Button onClick={() => decide('approved')} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Aprovar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lançar ajuste */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) resetCreateForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Lançar ajuste de ponto</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1">
              <Label>Colaborador</Label>
              <Select value={newUserId} onValueChange={setNewUserId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {users.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data</Label>
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={newType} onValueChange={(v) => { setNewType(v); setNewTargetId(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADJ_TYPES_FORM.map(t => (
                      <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {needsTimeField && (
              <div className="space-y-1">
                <Label>Horário</Label>
                <Input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
              </div>
            )}
            {needsTargetField && (
              <div className="space-y-1">
                <Label>Batida alvo</Label>
                <Select value={newTargetId} onValueChange={setNewTargetId}>
                  <SelectTrigger><SelectValue placeholder={dayRecords.length ? 'Selecione' : 'Sem batidas no dia'} /></SelectTrigger>
                  <SelectContent>
                    {dayRecords.map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.clock_type} — {format(new Date(r.clock_time), 'HH:mm')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Motivo</Label>
              <Textarea value={newReason} onChange={(e) => setNewReason(e.target.value)} rows={3}
                placeholder="Ex.: sistema fora do ar, esquecimento de batida, etc." />
            </div>
            <p className="text-xs text-muted-foreground">
              O ajuste será aplicado imediatamente ao ponto do colaborador e o cálculo do dia será refeito.
            </p>
          </div>
          <DialogFooter className="sticky bottom-0 bg-background pt-3">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancelar</Button>
            <Button onClick={submitCreate} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Lançar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
