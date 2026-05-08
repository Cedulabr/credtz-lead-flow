import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, AlertTriangle, Clock, Calendar, TrendingUp, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const STATUS_COLORS: Record<string, string> = {
  ok: 'hsl(var(--primary))',
  pendente_ajuste: 'hsl(var(--destructive))',
  observacao: '#eab308',
  justificado: '#3b82f6',
  falta: '#ef4444',
  feriado: '#a855f7',
  folga: '#94a3b8',
  sem_jornada: '#cbd5e1',
};

const STATUS_LABEL: Record<string, string> = {
  ok: 'OK', pendente_ajuste: 'Pendente Ajuste', observacao: 'Observação',
  justificado: 'Justificado', falta: 'Falta', feriado: 'Feriado',
  folga: 'Folga', sem_jornada: 'Sem Jornada',
};

const fmtMin = (m: number) => {
  const sign = m < 0 ? '-' : '';
  const a = Math.abs(m);
  return `${sign}${Math.floor(a / 60)}h${String(a % 60).padStart(2, '0')}`;
};

export function HRDashboard() {
  const { user, isAdmin } = useAuth();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [userFilter, setUserFilter] = useState<string>('all');
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      const { data } = await supabase.from('user_companies').select('company_id').eq('user_id', user.id).eq('is_active', true).limit(1).maybeSingle();
      if (data) setCompanyId(data.company_id);
    };
    init();
  }, [user]);

  useEffect(() => { if (companyId) loadUsers(); }, [companyId]);
  useEffect(() => { if (companyId) load(); }, [companyId, from, to, userFilter]);

  const loadUsers = async () => {
    if (!companyId) return;
    const { data: ucs } = await supabase.from('user_companies').select('user_id').eq('company_id', companyId).eq('is_active', true);
    const ids = (ucs || []).map((u: any) => u.user_id);
    if (!ids.length) return;
    const { data: profs } = await (supabase as any).rpc('get_profiles_by_ids', { user_ids: ids });
    setUsers((profs || []).map((p: any) => ({ id: p.id, name: p.name || p.email || p.id })));
  };

  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    let q = (supabase as any)
      .from('time_clock_day_summary')
      .select('*')
      .eq('company_id', companyId)
      .gte('clock_date', from)
      .lte('clock_date', to)
      .order('clock_date', { ascending: true });
    if (userFilter !== 'all') q = q.eq('user_id', userFilter);
    const { data, error } = await q;
    if (error) { toast.error('Erro ao carregar dados'); setLoading(false); return; }
    setRows(data || []);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const totals = {
      worked: 0, expected: 0, overtime: 0, delay: 0, bank: 0,
      faltas: 0, pendentes: 0, justificados: 0, ok: 0, total: rows.length,
    };
    const byStatus: Record<string, number> = {};
    const byUser: Record<string, { name: string; worked: number; overtime: number; delay: number; faltas: number }> = {};

    for (const r of rows) {
      totals.worked += r.worked_minutes || 0;
      totals.expected += r.expected_minutes || 0;
      totals.overtime += r.overtime_minutes || 0;
      totals.delay += r.delay_minutes || 0;
      totals.bank += (r.worked_minutes || 0) - (r.expected_minutes || 0);
      byStatus[r.daily_status] = (byStatus[r.daily_status] || 0) + 1;
      if (r.daily_status === 'falta') totals.faltas++;
      if (r.daily_status === 'pendente_ajuste') totals.pendentes++;
      if (r.daily_status === 'justificado') totals.justificados++;
      if (r.daily_status === 'ok') totals.ok++;

      const uname = users.find(u => u.id === r.user_id)?.name || 'Colaborador';
      if (!byUser[r.user_id]) byUser[r.user_id] = { name: uname, worked: 0, overtime: 0, delay: 0, faltas: 0 };
      byUser[r.user_id].worked += r.worked_minutes || 0;
      byUser[r.user_id].overtime += r.overtime_minutes || 0;
      byUser[r.user_id].delay += r.delay_minutes || 0;
      if (r.daily_status === 'falta') byUser[r.user_id].faltas++;
    }

    return {
      totals,
      pieData: Object.entries(byStatus).map(([k, v]) => ({ name: STATUS_LABEL[k] || k, value: v, key: k })),
      barData: Object.values(byUser).slice(0, 15).map(u => ({
        name: u.name.split(' ')[0], worked: Math.round(u.worked / 60 * 10) / 10,
        overtime: Math.round(u.overtime / 60 * 10) / 10,
      })),
      userTable: Object.entries(byUser).map(([id, u]) => ({ id, ...u })),
    };
  }, [rows, users]);

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    const sheet1 = XLSX.utils.json_to_sheet(rows.map((r: any) => ({
      Colaborador: users.find(u => u.id === r.user_id)?.name || r.user_id,
      Data: r.clock_date,
      Status: STATUS_LABEL[r.daily_status] || r.daily_status,
      'Trabalhado (min)': r.worked_minutes || 0,
      'Esperado (min)': r.expected_minutes || 0,
      'Extras (min)': r.overtime_minutes || 0,
      'Atraso (min)': r.delay_minutes || 0,
      Inconsistências: Array.isArray(r.inconsistencies) ? r.inconsistencies.map((i: any) => i.code).join(', ') : '',
    })));
    XLSX.utils.book_append_sheet(wb, sheet1, 'Diário');
    const sheet2 = XLSX.utils.json_to_sheet(stats.userTable.map(u => ({
      Colaborador: u.name,
      'Trabalhado': fmtMin(u.worked),
      'Extras': fmtMin(u.overtime),
      'Atraso': fmtMin(u.delay),
      Faltas: u.faltas,
    })));
    XLSX.utils.book_append_sheet(wb, sheet2, 'Por Colaborador');
    XLSX.writeFile(wb, `dashboard-rh-${from}-a-${to}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Filtros</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div><Label>De</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><Label>Até</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div>
            <Label>Colaborador</Label>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={exportXlsx} className="w-full" disabled={!rows.length}>
              <Download className="h-4 w-4 mr-2" />Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KPI icon={<Clock />} label="Horas trabalhadas" value={fmtMin(stats.totals.worked)} />
            <KPI icon={<TrendingUp />} label="Horas extras" value={fmtMin(stats.totals.overtime)} />
            <KPI icon={<Clock />} label="Saldo banco" value={fmtMin(stats.totals.bank)} variant={stats.totals.bank >= 0 ? 'positive' : 'negative'} />
            <KPI icon={<AlertTriangle />} label="Pendentes ajuste" value={String(stats.totals.pendentes)} variant="warning" />
            <KPI icon={<Calendar />} label="Faltas" value={String(stats.totals.faltas)} variant={stats.totals.faltas > 0 ? 'negative' : undefined} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Distribuição de status</CardTitle></CardHeader>
              <CardContent>
                {stats.pieData.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={stats.pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                        {stats.pieData.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key] || '#888'} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Horas por colaborador (top 15)</CardTitle></CardHeader>
              <CardContent>
                {stats.barData.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados</p> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={stats.barData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="worked" fill="hsl(var(--primary))" name="Trabalhado (h)" />
                      <Bar dataKey="overtime" fill="#f59e0b" name="Extras (h)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Resumo por colaborador</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="py-2">Colaborador</th>
                    <th className="py-2">Trabalhado</th>
                    <th className="py-2">Extras</th>
                    <th className="py-2">Atraso</th>
                    <th className="py-2">Faltas</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.userTable.map(u => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2">{u.name}</td>
                      <td className="py-2">{fmtMin(u.worked)}</td>
                      <td className="py-2">{fmtMin(u.overtime)}</td>
                      <td className="py-2">{fmtMin(u.delay)}</td>
                      <td className="py-2">{u.faltas > 0 ? <Badge variant="destructive">{u.faltas}</Badge> : '0'}</td>
                    </tr>
                  ))}
                  {stats.userTable.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Sem dados no período</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function KPI({ icon, label, value, variant }: { icon: any; label: string; value: string; variant?: 'positive' | 'negative' | 'warning' }) {
  const color = variant === 'positive' ? 'text-green-600' : variant === 'negative' ? 'text-destructive' : variant === 'warning' ? 'text-amber-600' : 'text-foreground';
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <div className="h-4 w-4">{icon}</div>{label}
        </div>
        <div className={`text-xl font-bold mt-1 ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
