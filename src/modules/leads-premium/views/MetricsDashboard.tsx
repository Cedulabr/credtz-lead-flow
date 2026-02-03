import { useMemo } from "react";
import { motion } from "framer-motion";
import { Lead, LeadStats, PIPELINE_STAGES } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Target,
  Zap,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetricsDashboardProps {
  leads: Lead[];
  stats: LeadStats;
  userCredits: number;
}

export function MetricsDashboard({ leads, stats, userCredits }: MetricsDashboardProps) {
  // Calculate additional metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const last7Days = subDays(now, 7);
    const last30Days = subDays(now, 30);

    // Leads by period
    const leadsLast7Days = leads.filter(l => isAfter(new Date(l.created_at), last7Days));
    const leadsLast30Days = leads.filter(l => isAfter(new Date(l.created_at), last30Days));

    // Conversions by period
    const convertedLast7Days = leadsLast7Days.filter(l => l.status === 'cliente_fechado').length;
    const convertedLast30Days = leadsLast30Days.filter(l => l.status === 'cliente_fechado').length;

    // Calculate conversion rates
    const weeklyConversionRate = leadsLast7Days.length > 0 
      ? (convertedLast7Days / leadsLast7Days.length) * 100 
      : 0;

    const monthlyConversionRate = leadsLast30Days.length > 0 
      ? (convertedLast30Days / leadsLast30Days.length) * 100 
      : 0;

    // Status distribution
    const statusDistribution = Object.entries(stats.byStatus || {})
      .map(([status, count]) => ({
        status,
        count,
        label: PIPELINE_STAGES[status]?.label || status,
        color: PIPELINE_STAGES[status]?.textColor || 'text-gray-600',
        bgColor: PIPELINE_STAGES[status]?.bgColor || 'bg-gray-50',
        percentage: (count / stats.total) * 100
      }))
      .sort((a, b) => b.count - a.count);

    // Convenio distribution
    const convenioDistribution = leads.reduce((acc, lead) => {
      const conv = lead.convenio || 'Não informado';
      acc[conv] = (acc[conv] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topConvenios = Object.entries(convenioDistribution)
      .map(([name, count]) => ({ name, count, percentage: (count / leads.length) * 100 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      leadsLast7Days: leadsLast7Days.length,
      leadsLast30Days: leadsLast30Days.length,
      convertedLast7Days,
      convertedLast30Days,
      weeklyConversionRate,
      monthlyConversionRate,
      statusDistribution,
      topConvenios
    };
  }, [leads, stats]);

  return (
    <div className="p-4 space-y-6">
      {/* Header KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Leads</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <span className="text-blue-600 font-medium">+{metrics.leadsLast7Days}</span>
                últimos 7 dias
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Convertidos</p>
                  <p className="text-3xl font-bold">{stats.fechados}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-100">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-600 font-medium">{metrics.convertedLast7Days}</span>
                <span className="text-muted-foreground">esta semana</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Conversão</p>
                  <p className="text-3xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-xl bg-amber-100">
                  <Target className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                Semanal: <span className="font-medium">{metrics.weeklyConversionRate.toFixed(1)}%</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Médio</p>
                  <p className="text-3xl font-bold">
                    {stats.avgTimeToConversion > 24 
                      ? `${(stats.avgTimeToConversion / 24).toFixed(0)}d`
                      : `${stats.avgTimeToConversion.toFixed(0)}h`
                    }
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-purple-100">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Para conversão
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Distribuição por Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.statusDistribution.slice(0, 6).map((item, index) => (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`${item.bgColor} ${item.color} border-0`}>
                        {item.label}
                      </Badge>
                    </div>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <Progress 
                    value={item.percentage} 
                    className="h-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Convenios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Top Convênios</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.topConvenios.map((item, index) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[200px]">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.percentage.toFixed(0)}%</span>
                      <span className="font-bold">{item.count}</span>
                    </div>
                  </div>
                  <Progress 
                    value={item.percentage} 
                    className="h-2"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Activity Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Resumo de Atividade</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="text-3xl font-bold text-blue-600">{stats.novos}</p>
                <p className="text-sm text-muted-foreground">Leads Novos</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="text-3xl font-bold text-indigo-600">{stats.emAndamento}</p>
                <p className="text-sm text-muted-foreground">Em Trabalho</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="text-3xl font-bold text-amber-600">{stats.pendentes}</p>
                <p className="text-sm text-muted-foreground">Agendados</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="text-3xl font-bold text-rose-600">{stats.recusados}</p>
                <p className="text-sm text-muted-foreground">Perdidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Credits Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Créditos Disponíveis</p>
                <p className="text-sm text-muted-foreground">
                  Use seus créditos para solicitar novos leads
                </p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-primary">{userCredits}</p>
                <p className="text-xs text-muted-foreground">créditos restantes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
