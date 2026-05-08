import { useEffect, useMemo, useState, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Paperclip, Check, X, Plus, AlertTriangle, Wand2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useGestorCompany } from '@/hooks/useGestorCompany';
import { evaluateDay, type ClockRecord, type DaySchedule, type DayResult } from '@/lib/timeClockEngine';

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

type PendingRow = {
  user_id: string;
  user_name: string;
  company_id: string | null;
  date: string;
  status: 'pendente_ajuste' | 'ajuste_parcial';
  problem: 'sem_entrada' | 'sem_saida' | 'pausa_desbalanceada' | 'parcial';
  problemLabel: string;
  severity: number; // 1 = falta entrada/saida, 2 = pausa, 3 = outros
  suggestedType: string;
  suggestedTime: string; // HH:MM
  records: ClockRecord[];
  inconsText: string;
};

const PROBLEM_LABEL: Record<PendingRow['problem'], string> = {
  sem_entrada: 'Sem entrada',
  sem_saida: 'Sem saída',
  pausa_desbalanceada: 'Pausa desbalanceada',
  parcial: 'Ajuste parcial',
};

export function AdjustmentReview() {
  const { user } = useAuth();
  const { isAdmin, isGestor, companyId, companyUserIds } = useGestorCompany();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all' | 'pendings'>('pending');
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

  // Pendings panel
  const [pendingsLoading, setPendingsLoading] = useState(false);
  const [pendings, setPendings] = useState<PendingRow[]>([]);
  const [periodFrom, setPeriodFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [periodTo, setPeriodTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [filterProblem, setFilterProblem] = useState<string>('all');
  const [sortMode, setSortMode] = useState<'severity' | 'date_asc' | 'date_desc' | 'name'>('severity');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState('Ajuste lançado pela gestão — registro incompleto');
  const [bulkEntryTime, setBulkEntryTime] = useState('08:00');
  const [bulkExitTime, setBulkExitTime] = useState('18:00');
  const [bulkBreakStart, setBulkBreakStart] = useState('12:00');
  const [bulkBreakEnd, setBulkBreakEnd] = useState('13:00');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

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

  // Load eligible users
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

  // Day records (for edit/remove in single create)
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

  // ===== Pendings =====
  const loadPendings = useCallback(async () => {
    if (!users.length) { setPendings([]); return; }
    setPendingsLoading(true);
    try {
      const ids = users.map(u => u.id);

      const [recordsRes, schedulesRes, daysOffRes, justRes, existingReqRes] = await Promise.all([
        supabase.from('time_clock')
          .select('user_id, clock_date, clock_type, clock_time')
          .in('user_id', ids)
          .gte('clock_date', periodFrom)
          .lte('clock_date', periodTo)
          .order('clock_time', { ascending: true }),
        supabase.from('time_clock_schedules')
          .select('user_id, entry_time, exit_time, daily_hours, tolerance_minutes, work_days, is_active')
          .in('user_id', ids)
          .eq('is_active', true),
        supabase.from('time_clock_day_offs')
          .select('user_id, off_date, off_type, is_partial_day')
          .in('user_id', ids)
          .gte('off_date', periodFrom)
          .lte('off_date', periodTo),
        (supabase as any).from('time_clock_justifications')
          .select('user_id, reference_date, status')
          .in('user_id', ids)
          .gte('reference_date', periodFrom)
          .lte('reference_date', periodTo)
          .eq('status', 'approved'),
        (supabase as any).from('time_clock_adjustment_requests')
          .select('user_id, clock_date, status')
          .in('user_id', ids)
          .gte('clock_date', periodFrom)
          .lte('clock_date', periodTo)
          .in('status', ['pending', 'approved']),
      ]);

      const recordsByUserDate: Record<string, ClockRecord[]> = {};
      (recordsRes.data || []).forEach((r: any) => {
        const k = `${r.user_id}|${r.clock_date}`;
        (recordsByUserDate[k] ||= []).push({ clock_type: r.clock_type, clock_time: r.clock_time });
      });
      const schedByUser: Record<string, DaySchedule> = {};
      (schedulesRes.data || []).forEach((s: any) => {
        schedByUser[s.user_id] = {
          entry_time: s.entry_time || '08:00',
          exit_time: s.exit_time || '18:00',
          daily_hours: s.daily_hours || 8,
          tolerance_minutes: s.tolerance_minutes ?? 10,
          work_days: s.work_days || [1, 2, 3, 4, 5],
        } as DaySchedule;
      });
      const dayOffMap = new Map<string, { isPartial: boolean }>();
      (daysOffRes.data || []).forEach((d: any) =>
        dayOffMap.set(`${d.user_id}|${d.off_date}`, { isPartial: !!d.is_partial_day })
      );
      const justSet = new Set<string>(
        (justRes.data || []).map((j: any) => `${j.user_id}|${j.reference_date}`)
      );
      const blockedSet = new Set<string>(
        (existingReqRes.data || []).map((r: any) => `${r.user_id}|${r.clock_date}`)
      );

      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const days = eachDayOfInterval({
        start: new Date(periodFrom + 'T12:00:00'),
        end: new Date(periodTo + 'T12:00:00'),
      });

      const rows: PendingRow[] = [];
      for (const u of users) {
        const sched = schedByUser[u.id] || null;
        for (const day of days) {
          const ds = format(day, 'yyyy-MM-dd');
          if (ds > todayStr) continue;
          const k = `${u.id}|${ds}`;
          if (blockedSet.has(k)) continue;
          const recs = recordsByUserDate[k] || [];
          const dow = day.getDay();
          const off = dayOffMap.get(k);
          const result: DayResult = evaluateDay(recs, sched, dow, {
            dayOff: off ? { type: 'folga', isPartial: off.isPartial } : null,
            justified: justSet.has(k),
          });
          if (result.status !== 'pendente_ajuste' && result.status !== 'ajuste_parcial') continue;

          const types = new Set(recs.map(r => r.clock_type));
          const inicios = recs.filter(r => r.clock_type === 'pausa_inicio').length;
          const fins = recs.filter(r => r.clock_type === 'pausa_fim').length;

          let problem: PendingRow['problem'] = 'parcial';
          let suggestedType = 'other';
          let suggestedTime = '';
          let severity = 3;

          if (!types.has('entrada')) {
            problem = 'sem_entrada'; suggestedType = 'add_entry';
            suggestedTime = sched?.entry_time?.slice(0, 5) || '08:00';
            severity = 1;
          } else if (!types.has('saida')) {
            problem = 'sem_saida'; suggestedType = 'add_exit';
            suggestedTime = sched?.exit_time?.slice(0, 5) || '18:00';
            severity = 1;
          } else if (inicios > fins) {
            problem = 'pausa_desbalanceada'; suggestedType = 'add_break_end';
            suggestedTime = '13:00';
            severity = 2;
          } else if (fins > inicios) {
            problem = 'pausa_desbalanceada'; suggestedType = 'add_break_start';
            suggestedTime = '12:00';
            severity = 2;
          }

          rows.push({
            user_id: u.id,
            user_name: u.name,
            company_id: u.company_id,
            date: ds,
            status: result.status as any,
            problem,
            problemLabel: PROBLEM_LABEL[problem],
            severity,
            suggestedType,
            suggestedTime,
            records: recs,
            inconsText: result.inconsistencies.map(i => i.message).join(' • '),
          });
        }
      }
      setPendings(rows);
      setSelected(new Set());
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao carregar pendências');
    } finally {
      setPendingsLoading(false);
    }
  }, [users, periodFrom, periodTo]);

  useEffect(() => {
    if (filter === 'pendings') loadPendings();
  }, [filter, loadPendings]);

  const filteredPendings = useMemo(() => {
    let arr = pendings;
    if (filterUserId !== 'all') arr = arr.filter(p => p.user_id === filterUserId);
    if (filterProblem !== 'all') arr = arr.filter(p => p.problem === filterProblem);
    const sorted = [...arr];
    sorted.sort((a, b) => {
      if (sortMode === 'date_asc') return a.date.localeCompare(b.date) || a.user_name.localeCompare(b.user_name);
      if (sortMode === 'date_desc') return b.date.localeCompare(a.date) || a.user_name.localeCompare(b.user_name);
      if (sortMode === 'name') return a.user_name.localeCompare(b.user_name) || a.date.localeCompare(b.date);
      // severity default
      return (a.severity - b.severity) || a.user_name.localeCompare(b.user_name) || a.date.localeCompare(b.date);
    });
    return sorted;
  }, [pendings, filterUserId, filterProblem, sortMode]);

  const allVisibleSelected = filteredPendings.length > 0 &&
    filteredPendings.every(p => selected.has(`${p.user_id}|${p.date}|${p.problem}`));

  const toggleAll = () => {
    if (allVisibleSelected) {
      const keep = new Set(selected);
      filteredPendings.forEach(p => keep.delete(`${p.user_id}|${p.date}|${p.problem}`));
      setSelected(keep);
    } else {
      const next = new Set(selected);
      filteredPendings.forEach(p => next.add(`${p.user_id}|${p.date}|${p.problem}`));
      setSelected(next);
    }
  };

  const toggleOne = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  const startAdjustmentFromPending = (p: PendingRow) => {
    setNewUserId(p.user_id);
    setNewDate(p.date);
    setNewType(p.suggestedType);
    setNewTime(p.suggestedTime);
    setNewReason(`Ajuste lançado pela gestão — ${p.problemLabel} em ${format(new Date(p.date + 'T12:00:00'), 'dd/MM/yyyy')}`);
    setNewTargetId('');
    setCreateOpen(true);
  };

  const submitBulk = async () => {
    if (!user) return;
    const rows = filteredPendings.filter(p => selected.has(`${p.user_id}|${p.date}|${p.problem}`));
    if (!rows.length) return toast.error('Nenhuma pendência selecionada');
    if (!bulkReason.trim()) return toast.error('Informe o motivo');

    const timeFor = (p: PendingRow): string => {
      if (p.suggestedType === 'add_entry') return bulkEntryTime;
      if (p.suggestedType === 'add_exit') return bulkExitTime;
      if (p.suggestedType === 'add_break_start') return bulkBreakStart;
      if (p.suggestedType === 'add_break_end') return bulkBreakEnd;
      return p.suggestedTime || bulkEntryTime;
    };

    const payloads = rows.map(p => ({
      user_id: p.user_id,
      company_id: p.company_id,
      clock_date: p.date,
      adjustment_type: p.suggestedType,
      proposed_time: ['add_entry','add_exit','add_break_start','add_break_end'].includes(p.suggestedType)
        ? timeFor(p) : null,
      target_record_id: null,
      reason: `${bulkReason.trim()} (${p.problemLabel})`,
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: 'Lote — lançado e aprovado pela gestão',
    }));

    setBulkSubmitting(true);
    const { error } = await (supabase as any)
      .from('time_clock_adjustment_requests')
      .insert(payloads);
    setBulkSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(`${payloads.length} ajuste(s) lançado(s) em lote`);
    setBulkOpen(false);
    setSelected(new Set());
    loadPendings();
    load();
  };

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
    if (filter === 'pendings') loadPendings();
  };

  const canCreate = isAdmin || isGestor;
  const needsTimeField = newType.startsWith('add_') || newType.startsWith('edit_');
  const needsTargetField = newType.startsWith('edit_') || newType === 'remove_record';
  const selectedCount = selected.size;

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
            <TabsTrigger value="pendings">
              <AlertTriangle className="h-3 w-3 mr-1" />Pendências do mês
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {renderRequestsList()}
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            {renderRequestsList()}
          </TabsContent>

          <TabsContent value="pendings" className="mt-4 space-y-3">
            <div className="flex flex-wrap items-end gap-3 p-3 border rounded-lg bg-muted/30">
              <div>
                <Label className="text-xs">De</Label>
                <Input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Até</Label>
                <Input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
              </div>
              <div className="min-w-[200px]">
                <Label className="text-xs">Colaborador</Label>
                <Select value={filterUserId} onValueChange={setFilterUserId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[180px]">
                <Label className="text-xs">Tipo de pendência</Label>
                <Select value={filterProblem} onValueChange={setFilterProblem}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="sem_entrada">Sem entrada</SelectItem>
                    <SelectItem value="sem_saida">Sem saída</SelectItem>
                    <SelectItem value="pausa_desbalanceada">Pausa desbalanceada</SelectItem>
                    <SelectItem value="parcial">Ajuste parcial (outros)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[180px]">
                <Label className="text-xs">Ordenar por</Label>
                <Select value={sortMode} onValueChange={(v) => setSortMode(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="severity">Severidade (entrada/saída primeiro)</SelectItem>
                    <SelectItem value="name">Colaborador (A→Z)</SelectItem>
                    <SelectItem value="date_asc">Data (mais antiga)</SelectItem>
                    <SelectItem value="date_desc">Data (mais recente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={loadPendings} disabled={pendingsLoading}>
                {pendingsLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : null}
                Atualizar
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} id="sel-all" />
                <Label htmlFor="sel-all" className="text-sm cursor-pointer">
                  Selecionar todas visíveis ({filteredPendings.length})
                </Label>
              </div>
              <Button
                size="sm"
                disabled={selectedCount === 0}
                onClick={() => setBulkOpen(true)}
              >
                <ListChecks className="h-4 w-4 mr-1" />
                Lançar {selectedCount > 0 ? `${selectedCount} ` : ''}em lote
              </Button>
            </div>

            {pendingsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : filteredPendings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma pendência encontrada no período. ✓</p>
            ) : (
              <div className="space-y-2">
                {filteredPendings.map((p) => {
                  const key = `${p.user_id}|${p.date}|${p.problem}`;
                  const isSel = selected.has(key);
                  const tone = p.status === 'pendente_ajuste'
                    ? 'border-red-300 bg-red-50/60'
                    : 'border-orange-300 bg-orange-50/60';
                  return (
                    <div key={key} className={`border rounded-lg p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${tone}`}>
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <Checkbox checked={isSel} onCheckedChange={() => toggleOne(key)} className="mt-1" />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{p.user_name}</span>
                            <span className="text-sm text-muted-foreground">·</span>
                            <span className="text-sm">
                              {format(new Date(p.date + 'T12:00:00'), "EEE, dd/MM/yyyy", { locale: ptBR })}
                            </span>
                            <Badge variant={p.severity === 1 ? 'destructive' : 'secondary'}>
                              {p.problemLabel}
                            </Badge>
                            {p.suggestedTime && (
                              <Badge variant="outline">sugerido: {p.suggestedTime}</Badge>
                            )}
                          </div>
                          {p.inconsText && (
                            <p className="text-xs text-muted-foreground line-clamp-2">{p.inconsText}</p>
                          )}
                          {p.records.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Batidas: {p.records.map(r => `${r.clock_type.replace('_', ' ')} ${r.clock_time.slice(0,5)}`).join(' · ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0">
                        <Button size="sm" variant="outline" onClick={() => startAdjustmentFromPending(p)}>
                          <Wand2 className="h-3 w-3 mr-1" />Lançar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Review dialog */}
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

      {/* Lançar ajuste (single) */}
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

      {/* Bulk dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Lançar ajustes em lote ({selectedCount})</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto">
            <p className="text-xs text-muted-foreground">
              Os horários abaixo serão aplicados conforme o tipo de pendência sugerido para cada dia.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Entrada padrão</Label>
                <Input type="time" value={bulkEntryTime} onChange={(e) => setBulkEntryTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Saída padrão</Label>
                <Input type="time" value={bulkExitTime} onChange={(e) => setBulkExitTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Início pausa</Label>
                <Input type="time" value={bulkBreakStart} onChange={(e) => setBulkBreakStart(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fim pausa</Label>
                <Input type="time" value={bulkBreakEnd} onChange={(e) => setBulkBreakEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Motivo (aplicado a todos)</Label>
              <Textarea rows={3} value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              Os ajustes serão aprovados e aplicados imediatamente ao ponto dos colaboradores.
            </p>
          </div>
          <DialogFooter className="sticky bottom-0 bg-background pt-3">
            <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkSubmitting}>Cancelar</Button>
            <Button onClick={submitBulk} disabled={bulkSubmitting}>
              {bulkSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Confirmar lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );

  function renderRequestsList() {
    if (loading) {
      return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    }
    if (items.length === 0) {
      return <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma solicitação.</p>;
    }
    return (
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
    );
  }
}
