import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Paperclip, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';

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

export function AdjustmentReview() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [reviewing, setReviewing] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revisão de Ajustes de Ponto</CardTitle>
        <p className="text-sm text-muted-foreground">Aprovar ou rejeitar solicitações de colaboradores.</p>
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
    </Card>
  );
}
