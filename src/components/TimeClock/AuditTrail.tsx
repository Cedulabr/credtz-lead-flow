import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, History, Search, FileText } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface LogRow {
  id: string;
  time_clock_id: string | null;
  action: string;
  performed_by: string;
  reason: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
}

export function AuditTrail() {
  const { user, isAdmin } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [closureLogs, setClosureLogs] = useState<any[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (user) init();
  }, [user]);

  const init = async () => {
    const { data: uc } = await supabase
      .from('user_companies').select('company_id').eq('user_id', user!.id).eq('is_active', true).maybeSingle();
    if (uc) setCompanyId(uc.company_id);
    await load(uc?.company_id || null);
  };

  const load = async (cid: string | null) => {
    setLoading(true);
    try {
      const { data: lg } = await supabase
        .from('time_clock_logs')
        .select('*')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(500);

      const { data: cl } = await (supabase as any)
        .from('time_clock_closure_logs')
        .select('*')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      setLogs((lg as LogRow[]) || []);
      setClosureLogs(cl || []);

      const ids = Array.from(new Set([
        ...(lg || []).map((l: any) => l.performed_by),
        ...(cl || []).map((l: any) => l.performed_by),
      ].filter(Boolean)));
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, name, email').in('id', ids);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p.name || p.email || p.id.slice(0, 8); });
        setProfileMap(map);
      }
    } finally {
      setLoading(false);
    }
  };

  const actionLabel = (a: string) => ({
    insert: 'Inserção', update: 'Edição', delete: 'Exclusão',
    adjustment: 'Ajuste', closed: 'Fechamento', reopened: 'Reabertura',
  }[a] || a);

  const actionVariant = (a: string): any => {
    if (a === 'reopened' || a === 'delete') return 'destructive';
    if (a === 'closed') return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Trilha de Auditoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <Label>De</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="flex-1">
              <Label>Até</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={() => load(companyId)} disabled={loading}>
              <Search className="h-4 w-4 mr-2" /> Buscar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Fechamentos / Reaberturas</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> :
            closureLogs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Sem registros</p> :
            <div className="space-y-2">
              {closureLogs.map((c) => (
                <div key={c.id} className="border rounded p-3 text-sm flex items-start justify-between gap-3">
                  <div>
                    <Badge variant={actionVariant(c.action)} className="mr-2">{actionLabel(c.action)}</Badge>
                    Período <strong>{format(parseISO(c.period_month), 'MM/yyyy')}</strong> por{' '}
                    <strong>{profileMap[c.performed_by] || c.performed_by.slice(0, 8)}</strong>
                    {c.reason && <div className="text-xs italic text-muted-foreground mt-1">"{c.reason}"</div>}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {format(parseISO(c.created_at), 'dd/MM HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Alterações em batidas</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> :
            logs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">Sem registros</p> :
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="border rounded p-3 text-sm">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={actionVariant(l.action)}>{actionLabel(l.action)}</Badge>
                      <span className="text-xs text-muted-foreground">por <strong>{profileMap[l.performed_by] || l.performed_by.slice(0, 8)}</strong></span>
                    </div>
                    <span className="text-xs text-muted-foreground">{format(parseISO(l.created_at), 'dd/MM/yyyy HH:mm:ss')}</span>
                  </div>
                  {l.reason && <div className="text-xs italic mt-1">"{l.reason}"</div>}
                  {(l.old_values || l.new_values) && (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-destructive/10 p-2 rounded">
                        <div className="font-medium mb-1">Antes</div>
                        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(l.old_values, null, 1)}</pre>
                      </div>
                      <div className="bg-emerald-500/10 p-2 rounded">
                        <div className="font-medium mb-1">Depois</div>
                        <pre className="whitespace-pre-wrap break-all">{JSON.stringify(l.new_values, null, 1)}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          }
        </CardContent>
      </Card>
    </div>
  );
}
