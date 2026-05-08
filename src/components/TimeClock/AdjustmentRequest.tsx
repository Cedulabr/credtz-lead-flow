import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGestorCompany } from '@/hooks/useGestorCompany';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Paperclip, Loader2, X, AlertTriangle, Wand2, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { evaluateDay, type ClockRecord, type DaySchedule, type DayResult } from '@/lib/timeClockEngine';

const TYPE_LABELS: Record<string, string> = {
  add_entry: 'Adicionar entrada',
  add_exit: 'Adicionar saída',
  add_break_start: 'Adicionar início de pausa',
  add_break_end: 'Adicionar fim de pausa',
  edit_entry: 'Editar entrada',
  edit_exit: 'Editar saída',
  edit_break_start: 'Editar início de pausa',
  edit_break_end: 'Editar fim de pausa',
  remove_record: 'Remover registro',
  justify_absence: 'Justificar ausência',
  other: 'Outro',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  cancelled: 'outline',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Rejeitada',
  cancelled: 'Cancelada',
};

interface AdjustmentRequestProps {
  companyId: string | null;
}

type Problem = 'sem_entrada' | 'sem_saida' | 'pausa_desbalanceada' | 'parcial';
const PROBLEM_LABEL: Record<Problem, string> = {
  sem_entrada: 'Sem entrada',
  sem_saida: 'Sem saída',
  pausa_desbalanceada: 'Pausa desbalanceada',
  parcial: 'Ajuste parcial',
};

interface PendingRow {
  user_id: string;
  user_name: string;
  company_id: string | null;
  date: string;
  result: DayResult;
  records: ClockRecord[];
  problem: Problem;
  problemLabel: string;
  severity: number;
  suggestedType: string;
  suggestedTime: string;
  reasonText: string;
  blocked?: boolean;
}

export function AdjustmentRequest({ companyId }: AdjustmentRequestProps) {
  const { user } = useAuth();
  const { isAdmin, isGestor, companyId: gestorCompanyId, companyUserIds } = useGestorCompany();
  const canManage = isAdmin || isGestor;

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pending panel
  const [users, setUsers] = useState<{ id: string; name: string; company_id: string | null }[]>([]);
  const [pendingsLoading, setPendingsLoading] = useState(false);
  const [pendings, setPendings] = useState<PendingRow[]>([]);
  const [monthStart, setMonthStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [monthEnd, setMonthEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filterUserId, setFilterUserId] = useState<string>('all');
  const [filterProblem, setFilterProblem] = useState<string>('all');
  const [sortMode, setSortMode] = useState<'severity' | 'name' | 'date_desc' | 'date_asc'>('severity');

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkReason, setBulkReason] = useState('Ajuste lançado pela gestão — registro incompleto');
  const [bulkEntryTime, setBulkEntryTime] = useState('08:00');
  const [bulkExitTime, setBulkExitTime] = useState('18:00');
  const [bulkBreakStart, setBulkBreakStart] = useState('12:00');
  const [bulkBreakEnd, setBulkBreakEnd] = useState('13:00');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Single adjust form (also used by "Lançar ajuste" buttons)
  const [clockDate, setClockDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [adjType, setAdjType] = useState<string>('add_entry');
  const [proposedTime, setProposedTime] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [targetCompanyId, setTargetCompanyId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('time_clock_adjustment_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) toast.error('Erro ao carregar solicitações');
    setRequests(data || []);
    setLoading(false);
  };

  // Load eligible users (admin: all; gestor: own company; user: only self)
  useEffect(() => {
    (async () => {
      if (!user) return;
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
          userIds = [...companyUserIds];
          userIds.forEach(id => { userCompany[id] = gestorCompanyId; });
        } else {
          userIds = [user.id];
          userCompany[user.id] = companyId;
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
  }, [user?.id, isAdmin, isGestor, gestorCompanyId, companyId, companyUserIds.join(',')]);

  const loadPendings = useCallback(async () => {
    if (!user || !users.length) { setPendings([]); return; }
    setPendingsLoading(true);
    try {
      const ids = users.map(u => u.id);

      const [recordsRes, schedulesRes, daysOffRes, justRes, existingReqRes] = await Promise.all([
        supabase.from('time_clock')
          .select('user_id, clock_date, clock_type, clock_time')
          .in('user_id', ids)
          .gte('clock_date', monthStart)
          .lte('clock_date', monthEnd)
          .order('clock_time', { ascending: true }),
        supabase.from('time_clock_schedules')
          .select('user_id, entry_time, exit_time, daily_hours, tolerance_minutes, work_days, is_active')
          .in('user_id', ids)
          .eq('is_active', true),
        supabase.from('time_clock_day_offs')
          .select('user_id, off_date, off_type, is_partial_day')
          .in('user_id', ids)
          .gte('off_date', monthStart)
          .lte('off_date', monthEnd),
        (supabase as any).from('time_clock_justifications')
          .select('user_id, reference_date, status')
          .in('user_id', ids)
          .gte('reference_date', monthStart)
          .lte('reference_date', monthEnd)
          .eq('status', 'approved'),
        (supabase as any).from('time_clock_adjustment_requests')
          .select('user_id, clock_date, status')
          .in('user_id', ids)
          .gte('clock_date', monthStart)
          .lte('clock_date', monthEnd)
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
        start: new Date(monthStart + 'T12:00:00'),
        end: new Date(monthEnd + 'T12:00:00'),
      });

      const rows: PendingRow[] = [];
      for (const u of users) {
        const sched = schedByUser[u.id] || null;
        for (const day of days) {
          const ds = format(day, 'yyyy-MM-dd');
          if (ds > todayStr) continue;
          const k = `${u.id}|${ds}`;
          const isBlocked = blockedSet.has(k);
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

          let problem: Problem = 'parcial';
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

          const reasonText = `Ajuste — ${PROBLEM_LABEL[problem]} em ${format(day, 'dd/MM/yyyy', { locale: ptBR })}`;

          rows.push({
            user_id: u.id,
            user_name: u.name,
            company_id: u.company_id,
            date: ds,
            result,
            records: recs,
            problem,
            problemLabel: PROBLEM_LABEL[problem],
            severity,
            suggestedType,
            suggestedTime,
            reasonText,
            blocked: isBlocked,
          });
        }
      }
      setPendings(rows);
      setSelected(new Set());
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao carregar pendências do mês');
    } finally {
      setPendingsLoading(false);
    }
  }, [user?.id, users, monthStart, monthEnd]);

  useEffect(() => { load(); }, [user]);
  useEffect(() => { loadPendings(); }, [loadPendings]);

  const filteredPendings = useMemo(() => {
    let arr = pendings;
    if (filterUserId !== 'all') arr = arr.filter(p => p.user_id === filterUserId);
    if (filterProblem !== 'all') arr = arr.filter(p => p.problem === filterProblem);
    const sorted = [...arr];
    sorted.sort((a, b) => {
      if (sortMode === 'date_asc') return a.date.localeCompare(b.date) || a.user_name.localeCompare(b.user_name);
      if (sortMode === 'date_desc') return b.date.localeCompare(a.date) || a.user_name.localeCompare(b.user_name);
      if (sortMode === 'name') return a.user_name.localeCompare(b.user_name) || a.date.localeCompare(b.date);
      return (a.severity - b.severity) || a.user_name.localeCompare(b.user_name) || a.date.localeCompare(b.date);
    });
    return sorted;
  }, [pendings, filterUserId, filterProblem, sortMode]);

  const actionable = filteredPendings.filter(p => !p.blocked);
  const allVisibleSelected = actionable.length > 0 &&
    actionable.every(p => selected.has(`${p.user_id}|${p.date}|${p.problem}`));

  const toggleAll = () => {
    if (allVisibleSelected) {
      const keep = new Set(selected);
      actionable.forEach(p => keep.delete(`${p.user_id}|${p.date}|${p.problem}`));
      setSelected(keep);
    } else {
      const next = new Set(selected);
      actionable.forEach(p => next.add(`${p.user_id}|${p.date}|${p.problem}`));
      setSelected(next);
    }
  };

  const toggleOne = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  const reset = () => {
    setClockDate(format(new Date(), 'yyyy-MM-dd'));
    setAdjType('add_entry');
    setProposedTime('');
    setReason('');
    setFile(null);
    setTargetUserId(canManage ? '' : (user?.id || ''));
    setTargetCompanyId(canManage ? null : companyId);
  };

  const startAdjustment = (p: PendingRow) => {
    setClockDate(p.date);
    setAdjType(p.suggestedType);
    setProposedTime(p.suggestedTime || '');
    setReason(p.reasonText);
    setFile(null);
    setTargetUserId(p.user_id);
    setTargetCompanyId(p.company_id);
    setOpen(true);
  };

  const submit = async () => {
    if (!user) return;
    const effectiveUserId = canManage ? (targetUserId || user.id) : user.id;
    const effectiveCompanyId = canManage
      ? (targetCompanyId || users.find(u => u.id === effectiveUserId)?.company_id || companyId)
      : companyId;
    if (!effectiveCompanyId) return toast.error('Sem empresa vinculada');
    if (!reason.trim()) return toast.error('Informe o motivo');
    if (adjType !== 'remove_record' && adjType !== 'justify_absence' && adjType !== 'other' && !proposedTime) {
      return toast.error('Informe o horário proposto');
    }
    setSubmitting(true);
    try {
      let attachment_path: string | null = null;
      if (file) {
        const ext = file.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('time-clock-attachments')
          .upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        attachment_path = path;
      }
      const payload: any = {
        user_id: effectiveUserId,
        company_id: effectiveCompanyId,
        clock_date: clockDate,
        adjustment_type: adjType,
        proposed_time: proposedTime || null,
        reason,
        attachment_path,
      };
      // Manager auto-approves on behalf of others
      if (canManage) {
        payload.status = 'approved';
        payload.reviewed_by = user.id;
        payload.reviewed_at = new Date().toISOString();
        payload.review_notes = 'Lançado e aprovado pela gestão';
      }
      const { error } = await (supabase as any)
        .from('time_clock_adjustment_requests')
        .insert(payload);
      if (error) throw error;
      toast.success(canManage ? 'Ajuste lançado e aprovado' : 'Solicitação enviada para análise');
      reset();
      setOpen(false);
      load();
      loadPendings();
    } catch (e: any) {
      toast.error(e.message || 'Falha ao enviar');
    } finally {
      setSubmitting(false);
    }
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
      company_id: p.company_id || companyId,
      clock_date: p.date,
      adjustment_type: p.suggestedType,
      proposed_time: ['add_entry', 'add_exit', 'add_break_start', 'add_break_end'].includes(p.suggestedType)
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

  const cancel = async (id: string) => {
    const { error } = await (supabase as any)
      .from('time_clock_adjustment_requests')
      .update({ status: 'cancelled' })
      .eq('id', id);
    if (error) return toast.error('Falha ao cancelar');
    toast.success('Solicitação cancelada');
    load();
  };

  const openAttachment = async (path: string) => {
    const { data, error } = await supabase.storage
      .from('time-clock-attachments')
      .createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return toast.error('Erro ao abrir anexo');
    window.open(data.signedUrl, '_blank');
  };

  const selectedCount = selected.size;

  return (
    <div className="space-y-4">
      {/* Pendências do mês */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Pendências do mês {canManage && <Badge variant="outline" className="ml-1">Gestão</Badge>}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {canManage
                    ? 'Dias com registro incompleto de todos os colaboradores. Clique em "Lançar ajuste" ou selecione vários para o lote.'
                    : 'Dias com registro incompleto ou inconsistente. Clique em "Lançar ajuste" para preencher automaticamente.'}
                </p>
              </div>
              <div className="flex gap-2">
                <div>
                  <Label className="text-xs">De</Label>
                  <Input type="date" value={monthStart} onChange={(e) => setMonthStart(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Até</Label>
                  <Input type="date" value={monthEnd} onChange={(e) => setMonthEnd(e.target.value)} />
                </div>
              </div>
            </div>

            {canManage && (
              <div className="flex flex-wrap items-end gap-2">
                <div className="min-w-[180px]">
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
                  <Label className="text-xs">Tipo de problema</Label>
                  <Select value={filterProblem} onValueChange={setFilterProblem}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="sem_entrada">Sem entrada</SelectItem>
                      <SelectItem value="sem_saida">Sem saída</SelectItem>
                      <SelectItem value="pausa_desbalanceada">Pausa desbalanceada</SelectItem>
                      <SelectItem value="parcial">Ajuste parcial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-[160px]">
                  <Label className="text-xs">Ordenar por</Label>
                  <Select value={sortMode} onValueChange={(v: any) => setSortMode(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="severity">Severidade</SelectItem>
                      <SelectItem value="name">Nome</SelectItem>
                      <SelectItem value="date_desc">Data (mais recente)</SelectItem>
                      <SelectItem value="date_asc">Data (mais antiga)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="flex items-center gap-2 px-2 h-9 border rounded-md bg-muted/40">
                    <Checkbox checked={allVisibleSelected} onCheckedChange={toggleAll} id="select-all" />
                    <label htmlFor="select-all" className="text-xs cursor-pointer">Selecionar visíveis</label>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setBulkOpen(true)}
                    disabled={selectedCount === 0}
                  >
                    <ListChecks className="h-4 w-4 mr-1" />
                    Lançar em lote ({selectedCount})
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pendingsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filteredPendings.length === 0 ? (
            <div className="py-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">Nenhuma pendência encontrada no período. ✓</p>
              {pendings.length > 0 && (filterUserId !== 'all' || filterProblem !== 'all') && (
                <div className="text-xs text-muted-foreground">
                  Há {pendings.length} pendência(s) ocultas pelos filtros.{' '}
                  <button className="underline" onClick={() => { setFilterUserId('all'); setFilterProblem('all'); }}>
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPendings.map((p) => {
                const key = `${p.user_id}|${p.date}|${p.problem}`;
                const incons = p.result.inconsistencies.map(i => i.message).join(' • ');
                const tone = p.result.status === 'pendente_ajuste'
                  ? 'border-red-300 bg-red-50'
                  : 'border-orange-300 bg-orange-50';
                const isChecked = selected.has(key);
                return (
                  <div key={key} className={`border rounded-lg p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${tone}`}>
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {canManage && (
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(key)}
                          disabled={p.blocked}
                          className="mt-1"
                        />
                      )}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {canManage && (
                            <span className="font-semibold text-sm">{p.user_name}</span>
                          )}
                          <span className="font-semibold">
                            {format(new Date(p.date + 'T12:00:00'), 'EEE, dd/MM', { locale: ptBR })}
                          </span>
                          <Badge variant={p.result.status === 'pendente_ajuste' ? 'destructive' : 'secondary'}>
                            {p.result.status === 'pendente_ajuste' ? 'Pendente' : 'Ajuste parcial'}
                          </Badge>
                          <Badge variant="outline">{p.problemLabel}</Badge>
                          {p.blocked && <Badge variant="outline">solicitação já existe</Badge>}
                        </div>
                        {incons && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{incons}</p>
                        )}
                        {p.records.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Batidas: {p.records.map(r => `${r.clock_type.replace('_', ' ')} ${r.clock_time.slice(0, 5)}`).join(' · ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0">
                      <Button size="sm" onClick={() => startAdjustment(p)} disabled={p.blocked}>
                        <Wand2 className="h-3 w-3 mr-1" />Lançar ajuste
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Lançar ajustes em lote</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {selectedCount} pendência(s) selecionada(s). Os horários abaixo serão usados quando a pendência exigir ajuste do tipo correspondente.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Entrada</Label>
                <Input type="time" value={bulkEntryTime} onChange={(e) => setBulkEntryTime(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Saída</Label>
                <Input type="time" value={bulkExitTime} onChange={(e) => setBulkExitTime(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Início pausa</Label>
                <Input type="time" value={bulkBreakStart} onChange={(e) => setBulkBreakStart(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Fim pausa</Label>
                <Input type="time" value={bulkBreakEnd} onChange={(e) => setBulkBreakEnd(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Motivo</Label>
              <Textarea rows={3} value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>Cancelar</Button>
            <Button onClick={submitBulk} disabled={bulkSubmitting}>
              {bulkSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Lançar {selectedCount} ajuste(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Solicitações */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Solicitações de Ajuste de Ponto</CardTitle>
            <p className="text-sm text-muted-foreground">Peça correção de batidas com anexo de comprovante.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={reset}><Plus className="h-4 w-4 mr-2" />Nova solicitação</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Nova solicitação de ajuste</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                {canManage && (
                  <div>
                    <Label>Colaborador</Label>
                    <Select
                      value={targetUserId}
                      onValueChange={(v) => {
                        setTargetUserId(v);
                        const u = users.find(x => x.id === v);
                        setTargetCompanyId(u?.company_id || null);
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {users.map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Data</Label>
                    <Input type="date" value={clockDate} onChange={(e) => setClockDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Tipo</Label>
                    <Select value={adjType} onValueChange={setAdjType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {!['remove_record', 'justify_absence', 'other'].includes(adjType) && (
                  <div>
                    <Label>Horário proposto</Label>
                    <Input type="time" value={proposedTime} onChange={(e) => setProposedTime(e.target.value)} />
                  </div>
                )}
                <div>
                  <Label>Motivo</Label>
                  <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explique brevemente o motivo..." />
                </div>
                <div>
                  <Label>Anexo (opcional)</Label>
                  <Input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <DialogFooter className="sticky bottom-0 bg-background pt-3">
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {canManage && targetUserId && targetUserId !== user?.id ? 'Lançar e aprovar' : 'Enviar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhuma solicitação ainda</p>
          ) : (
            <div className="space-y-2">
              {requests.map((r: any) => (
                <div key={r.id} className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_VARIANT[r.status] || 'outline'}>{STATUS_LABEL[r.status] || r.status}</Badge>
                      <span className="font-medium">{TYPE_LABELS[r.adjustment_type] || r.adjustment_type}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(r.clock_date + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                        {r.proposed_time ? ` às ${String(r.proposed_time).slice(0, 5)}` : ''}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r.reason}</p>
                    {r.review_notes && (
                      <p className="text-xs text-muted-foreground"><strong>Resposta:</strong> {r.review_notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {r.attachment_path && (
                      <Button variant="outline" size="sm" onClick={() => openAttachment(r.attachment_path)}>
                        <Paperclip className="h-3 w-3 mr-1" />Anexo
                      </Button>
                    )}
                    {r.status === 'pending' && (
                      <Button variant="ghost" size="sm" onClick={() => cancel(r.id)}>
                        <X className="h-3 w-3 mr-1" />Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
