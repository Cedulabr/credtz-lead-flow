import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Lock, Unlock, Loader2, Calendar, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Closure {
  id: string;
  company_id: string;
  period_month: string;
  closed_at: string;
  closed_by: string;
  reopened_at: string | null;
  reopened_by: string | null;
  reason: string | null;
}

export function ClosurePanel() {
  const { user, isAdmin } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isGestor, setIsGestor] = useState(false);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(format(startOfMonth(new Date()), 'yyyy-MM'));
  const [busy, setBusy] = useState(false);
  const [reopenTarget, setReopenTarget] = useState<Closure | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (user) init();
  }, [user]);

  const init = async () => {
    const { data: uc } = await supabase
      .from('user_companies')
      .select('company_id, company_role')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .maybeSingle();
    if (uc) {
      setCompanyId(uc.company_id);
      setIsGestor(uc.company_role === 'gestor');
    }
    await loadClosures(uc?.company_id || null);
  };

  const loadClosures = async (cid: string | null) => {
    setLoading(true);
    let q = (supabase as any).from('time_clock_period_closures').select('*').order('period_month', { ascending: false });
    if (!isAdmin && cid) q = q.eq('company_id', cid);
    const { data } = await q;
    setClosures((data as Closure[]) || []);
    setLoading(false);
  };

  const canManage = isAdmin || isGestor;

  const closePeriod = async () => {
    if (!companyId || !canManage) return;
    setBusy(true);
    try {
      const periodDate = `${period}-01`;
      const { data: existing } = await (supabase as any)
        .from('time_clock_period_closures')
        .select('id, reopened_at')
        .eq('company_id', companyId)
        .eq('period_month', periodDate)
        .maybeSingle();
      if (existing && !existing.reopened_at) {
        toast({ title: 'Período já está fechado', variant: 'destructive' });
        return;
      }
      const payload = {
        company_id: companyId,
        period_month: periodDate,
        closed_by: user!.id,
        closed_at: new Date().toISOString(),
        reopened_at: null,
        reopened_by: null,
      };
      const { error } = existing
        ? await (supabase as any).from('time_clock_period_closures').update(payload).eq('id', existing.id)
        : await (supabase as any).from('time_clock_period_closures').insert(payload);
      if (error) throw error;

      await (supabase as any).from('time_clock_closure_logs').insert({
        company_id: companyId,
        period_month: periodDate,
        action: 'closed',
        performed_by: user!.id,
        reason: 'Fechamento manual do período',
      });

      toast({ title: 'Período fechado com sucesso!' });
      await loadClosures(companyId);
    } catch (e: any) {
      toast({ title: 'Erro ao fechar período', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const confirmReopen = async () => {
    if (!reopenTarget || !reopenReason.trim()) {
      toast({ title: 'Motivo obrigatório', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const { error } = await (supabase as any)
        .from('time_clock_period_closures')
        .update({
          reopened_at: new Date().toISOString(),
          reopened_by: user!.id,
          reason: reopenReason,
        })
        .eq('id', reopenTarget.id);
      if (error) throw error;

      await (supabase as any).from('time_clock_closure_logs').insert({
        closure_id: reopenTarget.id,
        company_id: reopenTarget.company_id,
        period_month: reopenTarget.period_month,
        action: 'reopened',
        performed_by: user!.id,
        reason: reopenReason,
      });

      toast({ title: 'Período reaberto', description: 'Edições estão liberadas novamente.' });
      setReopenTarget(null);
      setReopenReason('');
      await loadClosures(companyId);
    } catch (e: any) {
      toast({ title: 'Erro ao reabrir', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (!canManage) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-50" />
          Apenas Admin ou Gestor podem gerenciar fechamentos de período.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Fechamento de Período
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <Label>Mês de referência</Label>
              <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
            <Button onClick={closePeriod} disabled={busy || !companyId}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Fechar período
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-start gap-2">
            <AlertTriangle className="h-3 w-3 mt-0.5" />
            Após o fechamento, edições de batidas no período ficam bloqueadas. A reabertura exige justificativa registrada em log de auditoria.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Histórico de Fechamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : closures.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum fechamento registrado.</p>
          ) : (
            <div className="space-y-2">
              {closures.map((c) => {
                const isOpen = !!c.reopened_at;
                return (
                  <div key={c.id} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <div className="font-medium">
                        {format(parseISO(c.period_month), "MMMM 'de' yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Fechado em {format(parseISO(c.closed_at), 'dd/MM/yyyy HH:mm')}
                        {isOpen && ` · Reaberto em ${format(parseISO(c.reopened_at!), 'dd/MM/yyyy HH:mm')}`}
                      </div>
                      {c.reason && <div className="text-xs italic text-muted-foreground mt-1">"{c.reason}"</div>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={isOpen ? 'secondary' : 'default'}>
                        {isOpen ? 'Reaberto' : 'Fechado'}
                      </Badge>
                      {!isOpen && (
                        <Button size="sm" variant="outline" onClick={() => setReopenTarget(c)}>
                          <Unlock className="h-3 w-3 mr-1" /> Reabrir
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!reopenTarget} onOpenChange={(o) => !o && setReopenTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir período</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Reabrir o período de{' '}
              <strong>{reopenTarget && format(parseISO(reopenTarget.period_month), "MMMM 'de' yyyy", { locale: ptBR })}</strong>?
              A ação será registrada no log de auditoria.
            </p>
            <div>
              <Label>Motivo da reabertura *</Label>
              <Textarea value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} rows={3} placeholder="Ex.: Ajuste de batida solicitado pelo colaborador..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopenTarget(null)}>Cancelar</Button>
            <Button onClick={confirmReopen} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar reabertura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
