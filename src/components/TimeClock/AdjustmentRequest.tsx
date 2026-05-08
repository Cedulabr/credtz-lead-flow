import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Plus, Paperclip, Loader2, X, AlertTriangle, Wand2 } from 'lucide-react';
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

interface PendingDay {
  date: string;
  result: DayResult;
  records: ClockRecord[];
  missingTypes: Array<'entrada' | 'saida' | 'pausa_inicio' | 'pausa_fim'>;
  suggestedType: string;
  reasonText: string;
}

const TYPE_TO_LABEL = {
  entrada: 'entrada',
  saida: 'saída',
  pausa_inicio: 'início de pausa',
  pausa_fim: 'fim de pausa',
} as const;

export function AdjustmentRequest({ companyId }: AdjustmentRequestProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // pendings panel
  const [pendingsLoading, setPendingsLoading] = useState(false);
  const [pendings, setPendings] = useState<PendingDay[]>([]);
  const [monthStart, setMonthStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [monthEnd, setMonthEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  // form
  const [clockDate, setClockDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [adjType, setAdjType] = useState<string>('add_entry');
  const [proposedTime, setProposedTime] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);

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

  const loadPendings = useCallback(async () => {
    if (!user) return;
    setPendingsLoading(true);
    try {
      const [recordsRes, scheduleRes, daysOffRes, justRes] = await Promise.all([
        supabase
          .from('time_clock')
          .select('clock_date, clock_type, clock_time')
          .eq('user_id', user.id)
          .gte('clock_date', monthStart)
          .lte('clock_date', monthEnd)
          .order('clock_time', { ascending: true }),
        supabase
          .from('time_clock_schedules')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle(),
        supabase
          .from('time_clock_day_offs')
          .select('off_date, off_type, is_partial_day')
          .eq('user_id', user.id)
          .gte('off_date', monthStart)
          .lte('off_date', monthEnd),
        supabase
          .from('time_clock_justifications')
          .select('reference_date, status')
          .eq('user_id', user.id)
          .gte('reference_date', monthStart)
          .lte('reference_date', monthEnd)
          .eq('status', 'approved'),
      ]);

      const recordsByDate: Record<string, ClockRecord[]> = {};
      (recordsRes.data || []).forEach((r: any) => {
        if (!recordsByDate[r.clock_date]) recordsByDate[r.clock_date] = [];
        recordsByDate[r.clock_date].push({ clock_type: r.clock_type, clock_time: r.clock_time });
      });

      const dayOffMap = new Map<string, { isPartial: boolean }>();
      (daysOffRes.data || []).forEach((d: any) =>
        dayOffMap.set(d.off_date, { isPartial: !!d.is_partial_day })
      );
      const justSet = new Set<string>((justRes.data || []).map((j: any) => j.reference_date));

      const sched = scheduleRes.data
        ? {
            entry_time: (scheduleRes.data as any).entry_time || '08:00',
            exit_time: (scheduleRes.data as any).exit_time || '18:00',
            daily_hours: (scheduleRes.data as any).daily_hours || 8,
            tolerance_minutes: (scheduleRes.data as any).tolerance_minutes ?? 10,
            work_days: (scheduleRes.data as any).work_days || [1, 2, 3, 4, 5],
          }
        : null;

      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');

      const items: PendingDay[] = [];
      const days = eachDayOfInterval({
        start: new Date(monthStart + 'T12:00:00'),
        end: new Date(monthEnd + 'T12:00:00'),
      });

      for (const day of days) {
        const ds = format(day, 'yyyy-MM-dd');
        if (ds > todayStr) continue;
        const recs = recordsByDate[ds] || [];
        const dow = day.getDay();
        const off = dayOffMap.get(ds);
        const result = evaluateDay(recs, sched as DaySchedule | null, dow, {
          dayOff: off ? { type: 'folga', isPartial: off.isPartial } : null,
          justified: justSet.has(ds),
        });

        if (result.status !== 'pendente_ajuste' && result.status !== 'ajuste_parcial') continue;

        const types = new Set(recs.map(r => r.clock_type));
        const missingTypes: PendingDay['missingTypes'] = [];
        if (!types.has('entrada')) missingTypes.push('entrada');
        if (!types.has('saida')) missingTypes.push('saida');
        const inicios = recs.filter(r => r.clock_type === 'pausa_inicio').length;
        const fins = recs.filter(r => r.clock_type === 'pausa_fim').length;
        if (inicios > fins) missingTypes.push('pausa_fim');
        if (fins > inicios) missingTypes.push('pausa_inicio');

        const suggestedType =
          missingTypes[0] === 'entrada' ? 'add_entry' :
          missingTypes[0] === 'saida' ? 'add_exit' :
          missingTypes[0] === 'pausa_inicio' ? 'add_break_start' :
          missingTypes[0] === 'pausa_fim' ? 'add_break_end' :
          'edit_entry';

        const reasonText = missingTypes.length > 0
          ? `Registro incompleto em ${format(day, 'dd/MM', { locale: ptBR })}: faltando ${missingTypes.map(t => TYPE_TO_LABEL[t]).join(', ')}.`
          : `Registro inconsistente em ${format(day, 'dd/MM', { locale: ptBR })}.`;

        items.push({ date: ds, result, records: recs, missingTypes, suggestedType, reasonText });
      }

      items.sort((a, b) => b.date.localeCompare(a.date));
      setPendings(items);
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao carregar pendências do mês');
    } finally {
      setPendingsLoading(false);
    }
  }, [user, monthStart, monthEnd]);

  useEffect(() => { load(); }, [user]);
  useEffect(() => { loadPendings(); }, [loadPendings]);

  const reset = () => {
    setClockDate(format(new Date(), 'yyyy-MM-dd'));
    setAdjType('add_entry');
    setProposedTime('');
    setReason('');
    setFile(null);
  };

  const startAdjustment = (p: PendingDay) => {
    setClockDate(p.date);
    setAdjType(p.suggestedType);
    setProposedTime('');
    setReason(p.reasonText);
    setFile(null);
    setOpen(true);
  };

  // Evita propor ajuste para datas que já tenham solicitação pendente/aprovada
  const blockedDates = useMemo(() => {
    const s = new Set<string>();
    requests.forEach(r => {
      if (r.status === 'pending' || r.status === 'approved') s.add(r.clock_date);
    });
    return s;
  }, [requests]);

  const submit = async () => {
    if (!user || !companyId) return toast.error('Sem empresa vinculada');
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
      const { error } = await (supabase as any)
        .from('time_clock_adjustment_requests')
        .insert({
          user_id: user.id,
          company_id: companyId,
          clock_date: clockDate,
          adjustment_type: adjType,
          proposed_time: proposedTime || null,
          reason,
          attachment_path,
        });
      if (error) throw error;
      toast.success('Solicitação enviada para análise');
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

  return (
    <div className="space-y-4">
      {/* Pendências do mês */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Pendências do mês
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Dias com registro incompleto ou inconsistente. Clique em "Lançar ajuste" para preencher automaticamente.
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
        </CardHeader>
        <CardContent>
          {pendingsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : pendings.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma pendência encontrada no período. ✓</p>
          ) : (
            <div className="space-y-2">
              {pendings.map((p) => {
                const already = blockedDates.has(p.date);
                const incons = p.result.inconsistencies.map(i => i.message).join(' • ');
                const tone = p.result.status === 'pendente_ajuste'
                  ? 'border-red-300 bg-red-50'
                  : 'border-orange-300 bg-orange-50';
                return (
                  <div key={p.date} className={`border rounded-lg p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${tone}`}>
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">
                          {format(new Date(p.date + 'T12:00:00'), "EEE, dd/MM", { locale: ptBR })}
                        </span>
                        <Badge variant={p.result.status === 'pendente_ajuste' ? 'destructive' : 'secondary'}>
                          {p.result.status === 'pendente_ajuste' ? 'Pendente' : 'Ajuste parcial'}
                        </Badge>
                        {p.missingTypes.map(t => (
                          <Badge key={t} variant="outline">faltando {TYPE_TO_LABEL[t]}</Badge>
                        ))}
                        {already && <Badge variant="outline">solicitação já existe</Badge>}
                      </div>
                      {incons && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{incons}</p>
                      )}
                      {p.records.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Batidas: {p.records.map(r => `${r.clock_type.replace('_', ' ')} ${r.clock_time.slice(0,5)}`).join(' · ')}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0">
                      <Button size="sm" onClick={() => startAdjustment(p)} disabled={already}>
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
                  Enviar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma solicitação enviada.</p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <div key={r.id} className="border rounded-lg p-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                      <span className="font-medium">{TYPE_LABELS[r.adjustment_type] || r.adjustment_type}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(r.clock_date + 'T00:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                        {r.proposed_time && ` às ${r.proposed_time.slice(0, 5)}`}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{r.reason}</p>
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
