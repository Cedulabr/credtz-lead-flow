import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivateLead, ActivateLeadStats, ACTIVATE_STATUS_CONFIG } from "../types";
import { BarChart3, TrendingUp, Users, Target, XCircle, AlertTriangle, Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ActivateMetricsViewProps {
  leads: ActivateLead[];
  stats: ActivateLeadStats;
}

export function ActivateMetricsView({ leads, stats }: ActivateMetricsViewProps) {
  const lossRate = useMemo(() => {
    if (stats.total === 0) return "0.0";
    return ((stats.semPossibilidade / stats.total) * 100).toFixed(1);
  }, [stats]);

  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    leads.forEach(l => { dist[l.status] = (dist[l.status] || 0) + 1; });
    return Object.entries(dist)
      .map(([status, count]) => ({
        status, count,
        label: ACTIVATE_STATUS_CONFIG[status]?.label || status,
        color: ACTIVATE_STATUS_CONFIG[status]?.dotColor || 'bg-gray-400',
        percentage: stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads, stats]);

  const userBreakdown = useMemo(() => {
    const byUser: Record<string, { total: number; fechados: number }> = {};
    leads.forEach(l => {
      const uid = l.assigned_to || "Não atribuído";
      if (!byUser[uid]) byUser[uid] = { total: 0, fechados: 0 };
      byUser[uid].total++;
      if (l.status === "fechado") byUser[uid].fechados++;
    });
    return Object.entries(byUser)
      .map(([user, data]) => ({ user, ...data, rate: data.total > 0 ? ((data.fechados / data.total) * 100).toFixed(1) : "0" }))
      .sort((a, b) => b.total - a.total);
  }, [leads]);

  const overdueLeads = useMemo(() => {
    const now = new Date();
    return leads.filter(l => {
      if (l.status !== "novo") return false;
      const hoursOld = (now.getTime() - new Date(l.created_at).getTime()) / (1000 * 60 * 60);
      return hoursOld >= 48;
    });
  }, [leads]);

  const kpiCards = [
    { label: "Total de Leads", value: stats.total, color: "border-l-blue-500", iconBg: "bg-blue-100", iconColor: "text-blue-600", icon: BarChart3 },
    { label: "Novos", value: stats.novos, color: "border-l-sky-500", iconBg: "bg-sky-100", iconColor: "text-sky-600", icon: Sparkles },
    { label: "Em Andamento", value: stats.emAndamento, color: "border-l-indigo-500", iconBg: "bg-indigo-100", iconColor: "text-indigo-600", icon: TrendingUp },
    { label: "Fechados", value: stats.fechados, color: "border-l-emerald-500", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", icon: Target },
    { label: "Taxa Conversão", value: `${stats.conversionRate.toFixed(1)}%`, color: "border-l-violet-500", iconBg: "bg-violet-100", iconColor: "text-violet-600", icon: TrendingUp },
    { label: "Alertas 48h", value: stats.alertas, color: "border-l-red-500", iconBg: "bg-red-100", iconColor: "text-red-600", icon: AlertTriangle, pulse: stats.alertas > 0 },
  ];

  return (
    <div className="space-y-6 p-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={cn("border-l-4", kpi.color)}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", kpi.iconBg, kpi.pulse && "animate-pulse")}>
                  <Icon className={cn("h-5 w-5", kpi.iconColor)} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alertas 48h */}
      {overdueLeads.length > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Leads com mais de 48h sem tratamento ({overdueLeads.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueLeads.slice(0, 10).map(lead => (
                <div key={lead.id} className="flex items-center gap-4 p-2 bg-background rounded border border-red-200">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{lead.nome}</p>
                    <p className="text-xs text-muted-foreground">{lead.telefone}</p>
                  </div>
                  <div className="text-xs text-red-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(lead.created_at), { locale: ptBR, addSuffix: true })}
                  </div>
                </div>
              ))}
              {overdueLeads.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">
                  e mais {overdueLeads.length - 10} leads...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statusDistribution.map(({ status, count, label, color, percentage }) => (
              <div key={status} className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${color} flex-shrink-0`} />
                <span className="text-sm flex-1">{label}</span>
                <span className="text-sm font-medium">{count}</span>
                <div className="w-24 bg-muted rounded-full h-2">
                  <div className={`h-2 rounded-full ${color}`} style={{ width: `${percentage}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{percentage}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Taxa de Perda */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100">
              <XCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{lossRate}%</p>
              <p className="text-xs text-muted-foreground">Taxa de Perda</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avgTimeHours.toFixed(0)}h</p>
              <p className="text-xs text-muted-foreground">Tempo Médio na Base</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance por Usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {userBreakdown.map(({ user, total, fechados, rate }) => (
              <div key={user} className="flex items-center gap-3">
                <span className="text-sm flex-1 truncate">{user}</span>
                <span className="text-xs text-muted-foreground">{fechados}/{total} leads</span>
                <div className="w-20 bg-muted rounded-full h-2">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
                </div>
                <span className="text-xs font-medium w-12 text-right">{rate}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
