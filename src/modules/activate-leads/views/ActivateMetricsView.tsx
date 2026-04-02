import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivateLead, ActivateLeadStats, ACTIVATE_STATUS_CONFIG } from "../types";
import { BarChart3, TrendingUp, Users, Target } from "lucide-react";

interface ActivateMetricsViewProps {
  leads: ActivateLead[];
  stats: ActivateLeadStats;
}

export function ActivateMetricsView({ leads, stats }: ActivateMetricsViewProps) {
  const conversionRate = useMemo(() => {
    if (stats.total === 0) return 0;
    return ((stats.fechados / stats.total) * 100).toFixed(1);
  }, [stats]);

  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    leads.forEach(l => {
      dist[l.status] = (dist[l.status] || 0) + 1;
    });
    return Object.entries(dist)
      .map(([status, count]) => ({
        status,
        count,
        label: ACTIVATE_STATUS_CONFIG[status]?.label || status,
        color: ACTIVATE_STATUS_CONFIG[status]?.dotColor || 'bg-gray-400',
        percentage: stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.count - a.count);
  }, [leads, stats]);

  return (
    <div className="space-y-6 p-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total de Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.emAndamento}</p>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Users className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.alertas}</p>
                <p className="text-xs text-muted-foreground">Alertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <div
                    className={`h-2 rounded-full ${color}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">{percentage}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
