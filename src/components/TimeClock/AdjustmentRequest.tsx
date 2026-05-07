import { useEffect, useState } from 'react';
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
import { Plus, Paperclip, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export function AdjustmentRequest({ companyId }: AdjustmentRequestProps) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => { load(); }, [user]);

  const reset = () => {
    setClockDate(format(new Date(), 'yyyy-MM-dd'));
    setAdjType('add_entry');
    setProposedTime('');
    setReason('');
    setFile(null);
  };

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Solicitações de Ajuste de Ponto</CardTitle>
          <p className="text-sm text-muted-foreground">Peça correção de batidas com anexo de comprovante.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nova solicitação</Button>
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
  );
}
