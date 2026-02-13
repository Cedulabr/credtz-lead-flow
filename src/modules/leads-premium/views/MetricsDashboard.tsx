import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lead, LeadStats, PIPELINE_STAGES, UserProfile } from "../types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Target,
  Zap,
  BarChart3,
  PieChart,
  ArrowUpRight,
  User,
  CalendarDays
} from "lucide-react";
import { subDays, subMonths, startOfMonth, endOfMonth, isAfter, isBefore, format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MetricsDashboardProps {
  leads: Lead[];
  stats: LeadStats;
  userCredits: number;
  users?: UserProfile[];
}

type DatePreset = "last_day" | "last_3_days" | "last_week" | "last_month" | "custom_month" | "all";

export function MetricsDashboard({ leads, stats, userCredits, users = [] }: MetricsDashboardProps) {
  const [selectedUser, setSelectedUser] = useState("all");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customMonth, setCustomMonth] = useState<string>("");

  // Generate last 12 months for custom month picker
  const monthOptions = useMemo(() => {
    const months: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = subMonths(now, i);
      months.push({
        value: format(d, "yyyy-MM"),
        label: format(d, "MMMM yyyy", { locale: ptBR })
      });
    }
    return months;
  }, []);

  // Filter leads by selected user AND date
  const filteredLeads = useMemo(() => {
    let result = leads;
    
    if (selectedUser !== "all") {
      result = result.filter(l => l.assigned_to === selectedUser || l.created_by === selectedUser);
    }

    if (datePreset !== "all") {
      const now = new Date();
      let start: Date;
      let end: Date | null = null;

      switch (datePreset) {
        case "last_day":
          start = subDays(now, 1);
          break;
        case "last_3_days":
          start = subDays(now, 3);
          break;
        case "last_week":
          start = subDays(now, 7);
          break;
        case "last_month":
          start = subDays(now, 30);
          break;
        case "custom_month":
          if (!customMonth) return result;
          const [y, m] = customMonth.split("-").map(Number);
          start = startOfMonth(new Date(y, m - 1));
          end = endOfMonth(new Date(y, m - 1));
          break;
        default:
          return result;
      }

      result = result.filter(l => {
        const d = new Date(l.created_at);
        if (!isAfter(d, start)) return false;
        if (end && !isBefore(d, end)) return false;
        return true;
      });
    }

    return result;
  }, [leads, selectedUser, datePreset, customMonth]);

  // Calculate metrics from filtered leads
  const metrics = useMemo(() => {
    const now = new Date();
    const last7Days = subDays(now, 7);

    const leadsLast7Days = filteredLeads.filter(l => isAfter(new Date(l.created_at), last7Days));
    const convertedLast7Days = leadsLast7Days.filter(l => l.status === 'cliente_fechado').length;
    const weeklyConversionRate = leadsLast7Days.length > 0 
      ? (convertedLast7Days / leadsLast7Days.length) * 100 : 0;

    const total = filteredLeads.length;
    const fechados = filteredLeads.filter(l => l.status === 'cliente_fechado').length;
    const conversionRate = total > 0 ? (fechados / total) * 100 : 0;

    const statusCounts = filteredLeads.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusDistribution = Object.entries(statusCounts)
      .map(([status, count]) => ({
        status, count,
        label: PIPELINE_STAGES[status]?.label || status,
        color: PIPELINE_STAGES[status]?.textColor || 'text-gray-600',
        bgColor: PIPELINE_STAGES[status]?.bgColor || 'bg-gray-50',
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    const convenioDistribution = filteredLeads.reduce((acc, lead) => {
      const conv = lead.convenio || 'Não informado';
      acc[conv] = (acc[conv] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topConvenios = Object.entries(convenioDistribution)
      .map(([name, count]) => ({ name, count, percentage: total > 0 ? (count / total) * 100 : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total, fechados, conversionRate,
      leadsLast7Days: leadsLast7Days.length,
      convertedLast7Days, weeklyConversionRate,
      novos: statusCounts['new_lead'] || 0,
      emAndamento: (statusCounts['em_andamento'] || 0) + (statusCounts['aguardando_retorno'] || 0),
      pendentes: (statusCounts['agendamento'] || 0) + (statusCounts['contato_futuro'] || 0),
      recusados: (statusCounts['recusou_oferta'] || 0) + (statusCounts['sem_interesse'] || 0),
      statusDistribution, topConvenios
    };
  }, [filteredLeads]);

  // Per-user breakdown (uses date-filtered leads)
  const userBreakdown = useMemo(() => {
    if (users.length === 0) return [];
    const userMap = new Map<string, { total: number; novos: number; fechados: number; emAndamento: number; recusados: number }>();
    
    filteredLeads.forEach(lead => {
      const userId = lead.assigned_to || lead.created_by || 'unassigned';
      if (!userMap.has(userId)) {
        userMap.set(userId, { total: 0, novos: 0, fechados: 0, emAndamento: 0, recusados: 0 });
      }
      const entry = userMap.get(userId)!;
      entry.total++;
      if (lead.status === 'new_lead') entry.novos++;
      if (lead.status === 'cliente_fechado') entry.fechados++;
      if (['em_andamento', 'aguardando_retorno'].includes(lead.status)) entry.emAndamento++;
      if (['recusou_oferta', 'sem_interesse'].includes(lead.status)) entry.recusados++;
    });

    return Array.from(userMap.entries())
      .map(([userId, data]) => {
        const userProfile = users.find(u => u.id === userId);
        return {
          userId,
          name: userProfile?.name || userProfile?.email || 'Sem atribuição',
          ...data,
          conversionRate: data.total > 0 ? ((data.fechados / data.total) * 100) : 0
        };
      })
      .sort((a, b) => b.fechados - a.fechados);
  }, [filteredLeads, users]);

  const avgTime = useMemo(() => {
    const convertedLeads = filteredLeads.filter(l => l.status === 'cliente_fechado' && l.updated_at);
    if (convertedLeads.length === 0) return 0;
    return convertedLeads.reduce((acc, l) => {
      const created = new Date(l.created_at).getTime();
      const updated = new Date(l.updated_at!).getTime();
      return acc + (updated - created) / (1000 * 60 * 60);
    }, 0) / convertedLeads.length;
  }, [filteredLeads]);

  return (
    <div className="p-4 space-y-6">
      {/* Filters Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Date Filter */}
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <Select value={datePreset} onValueChange={(v) => {
          setDatePreset(v as DatePreset);
          if (v !== "custom_month") setCustomMonth("");
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo o período</SelectItem>
            <SelectItem value="last_day">Último dia</SelectItem>
            <SelectItem value="last_3_days">Últimos 3 dias</SelectItem>
            <SelectItem value="last_week">Última semana</SelectItem>
            <SelectItem value="last_month">Último mês</SelectItem>
            <SelectItem value="custom_month">Escolher mês...</SelectItem>
          </SelectContent>
        </Select>

        {datePreset === "custom_month" && (
          <Select value={customMonth} onValueChange={setCustomMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* User Filter */}
        {users.length > 0 && (
          <>
            <div className="w-px h-6 bg-border" />
            <User className="h-5 w-5 text-muted-foreground" />
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Usuários</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name || u.email || 'Sem nome'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {(datePreset !== "all" || selectedUser !== "all") && (
          <Badge variant="secondary" className="text-xs">
            {filteredLeads.length} leads
          </Badge>
        )}
      </div>

      {/* Header KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Leads</p>
                  <p className="text-3xl font-bold">{metrics.total}</p>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Convertidos</p>
                  <p className="text-3xl font-bold">{metrics.fechados}</p>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Taxa Conversão</p>
                  <p className="text-3xl font-bold">{metrics.conversionRate.toFixed(1)}%</p>
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

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Médio</p>
                  <p className="text-3xl font-bold">
                    {avgTime > 24 
                      ? `${(avgTime / 24).toFixed(0)}d`
                      : `${avgTime.toFixed(0)}h`
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

      {/* Per-User Breakdown Table */}
      {users.length > 0 && selectedUser === "all" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Desempenho por Usuário</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                    <TableHead className="text-center">Novos</TableHead>
                    <TableHead className="text-center">Trabalhando</TableHead>
                    <TableHead className="text-center">Fechados</TableHead>
                    <TableHead className="text-center">Perdidos</TableHead>
                    <TableHead className="text-center">Conversão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userBreakdown.map((row) => (
                    <TableRow 
                      key={row.userId} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedUser(row.userId)}
                    >
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-center">{row.total}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-0">
                          {row.novos}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-0">
                          {row.emAndamento}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-0">
                          {row.fechados}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-0">
                          {row.recusados}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={row.conversionRate >= 10 ? "text-emerald-600 font-bold" : "text-muted-foreground"}>
                          {row.conversionRate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Distribuição por Status</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.statusDistribution.slice(0, 6).map((item) => (
                <div key={item.status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant="outline" className={`${item.bgColor} ${item.color} border-0`}>
                      {item.label}
                    </Badge>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Convenios */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Top Convênios</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.topConvenios.map((item) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[200px]">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.percentage.toFixed(0)}%</span>
                      <span className="font-bold">{item.count}</span>
                    </div>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Activity Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
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
                <p className="text-3xl font-bold text-blue-600">{metrics.novos}</p>
                <p className="text-sm text-muted-foreground">Leads Novos</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="text-3xl font-bold text-indigo-600">{metrics.emAndamento}</p>
                <p className="text-sm text-muted-foreground">Em Trabalho</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="text-3xl font-bold text-amber-600">{metrics.pendentes}</p>
                <p className="text-sm text-muted-foreground">Agendados</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-muted/50">
                <p className="text-3xl font-bold text-rose-600">{metrics.recusados}</p>
                <p className="text-sm text-muted-foreground">Perdidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Credits Info */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
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
