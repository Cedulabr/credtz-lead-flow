import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AnimatedContainer, StaggerContainer, StaggerItem } from "@/components/ui/animated-container";
import {
  Phone,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  ArrowRight,
  Zap,
  DollarSign,
  Users,
  ChevronRight,
  Sparkles,
  RefreshCw,
  FileText,
  BarChart3,
  Percent,
  Receipt,
  Star,
  ArrowUpRight,
  UserPlus,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, startOfMonth, endOfMonth, isToday, parseISO, eachDayOfInterval, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

interface ConsultorDashboardProps {
  onNavigate: (tab: string) => void;
}

interface DailyStat {
  day: string;
  leads: number;
  propostas: number;
  aprovadas: number;
  valor: number;
}

export function ConsultorDashboard({ onNavigate }: ConsultorDashboardProps) {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // KPI stats
  const [stats, setStats] = useState({
    totalLeads: 0,
    leadsAtivos: 0,
    leadsPremium: 0,
    propostasGeradas: 0,
    propostasAprovadas: 0,
    taxaConversao: 0,
    valorBruto: 0,
    valorAprovado: 0,
    valorLiberado: 0,
    comissaoPrevista: 0,
    salesToday: 0,
    salesMonth: 0,
    monthGoal: 30,
    pendingCallbacks: 0,
  });

  // Charts
  const [dailyData, setDailyData] = useState<DailyStat[]>([]);

  // Recent lists
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [recentProposals, setRecentProposals] = useState<any[]>([]);
  const [recentContracts, setRecentContracts] = useState<any[]>([]);

  const userName = profile?.name?.split(" ")[0] || "Consultor";
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";

  const monthOptions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const months = [];
    for (let y = 2025; y <= currentYear; y++) {
      const mStart = y === 2025 ? 11 : 0;
      const mEnd = y === currentYear ? currentMonth : 11;
      for (let m = mStart; m <= mEnd; m++) {
        const date = new Date(y, m, 1);
        const value = `${y}-${String(m + 1).padStart(2, "0")}`;
        const label = format(date, "MMMM yyyy", { locale: ptBR });
        months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      }
    }
    return months.reverse();
  }, []);

  const getDateRange = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    return { startDate, endDate };
  };

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user, selectedMonth]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      const today = format(new Date(), "yyyy-MM-dd");

      // Fetch commission rules for calculation
      const { data: commissionRules } = await supabase
        .from("commission_rules")
        .select("*")
        .eq("is_active", true);
      const rules = commissionRules || [];

      // Parallel fetches
      const [
        televendasResult,
        todaySalesResult,
        premiumLeadsResult,
        activateLeadsResult,
        propostasResult,
        commissionsResult,
      ] = await Promise.all([
        // Televendas for the month
        supabase
          .from("televendas")
          .select("id, parcela, troco, saldo_devedor, tipo_operacao, banco, status, data_venda, nome, cpf, data_pagamento, company_id")
          .eq("user_id", user?.id)
          .gte("data_venda", startStr)
          .lte("data_venda", endStr),
        // Sales today
        supabase
          .from("televendas")
          .select("id")
          .eq("user_id", user?.id)
          .eq("data_venda", today),
        // Leads Premium
        supabase
          .from("leads")
          .select("id, status, created_at, name, phone")
          .eq("assigned_to", user?.id)
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        // Activate Leads
        supabase
          .from("activate_leads")
          .select("id, status, created_at, nome, telefone, proxima_acao, data_proxima_operacao")
          .eq("assigned_to", user?.id)
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        // Propostas
        supabase
          .from("propostas")
          .select("id, pipeline_stage, created_at, client_name, total_value")
          .eq("created_by_id", user?.id)
          .gte("created_at", startISO)
          .lte("created_at", endISO),
        // Commissions
        supabase
          .from("commissions")
          .select("commission_amount, status")
          .eq("user_id", user?.id)
          .gte("proposal_date", startStr)
          .lte("proposal_date", endStr),
      ]);

      const televendas = televendasResult.data || [];
      const premiumLeads = premiumLeadsResult.data || [];
      const activateLeads = activateLeadsResult.data || [];
      const propostas = propostasResult.data || [];
      const commissions = commissionsResult.data || [];

      // Calculate values using commission rules
      const calculateValue = (sale: any) => {
        const tipo = sale.tipo_operacao?.toLowerCase()?.trim() || "";
        const banco = sale.banco?.toLowerCase()?.trim() || "";
        const rule = rules.find((r) => {
          const rb = r.bank_name?.toLowerCase()?.trim() || "";
          const rp = r.product_name?.toLowerCase()?.trim() || "";
          return rb === banco && (rp === tipo || rp.includes(tipo) || tipo.includes(rp));
        });
        if (rule) {
          const model = rule.calculation_model?.toLowerCase()?.trim();
          if (model === "saldo_devedor") return sale.saldo_devedor || 0;
          if (model === "valor_bruto" || model === "bruto" || model === "ambos")
            return (sale.saldo_devedor || 0) + (sale.troco || 0);
          if (model === "troco") return sale.troco || 0;
        }
        if (tipo === "portabilidade") return sale.saldo_devedor || 0;
        return sale.parcela || 0;
      };

      const nonCancelled = televendas.filter(
        (t) => t.status !== "proposta_cancelada" && t.status !== "exclusao_aprovada"
      );
      const approved = televendas.filter((t) => t.status === "proposta_paga");

      const valorBruto = nonCancelled.reduce((sum, t) => sum + calculateValue(t), 0);
      const valorAprovado = approved.reduce((sum, t) => sum + calculateValue(t), 0);
      const valorLiberado = approved.reduce((sum, t) => sum + (t.troco || 0), 0);

      const totalLeads = premiumLeads.length + activateLeads.length;
      const leadsAtivos = premiumLeads.filter((l) => l.status !== "novo" && l.status !== "descartado").length +
        activateLeads.filter((l) => l.status !== "novo" && l.status !== "descartado").length;

      const propostasGeradas = televendas.length;
      const propostasAprovadas = approved.length;
      const taxaConversao = propostasGeradas > 0 ? (propostasAprovadas / propostasGeradas) * 100 : 0;

      const comissaoPrevista = commissions
        .filter((c) => Number(c.commission_amount) > 0)
        .reduce((sum, c) => sum + Number(c.commission_amount), 0);

      const pendingCallbacks = activateLeads.filter(
        (l) => l.data_proxima_operacao && isToday(parseISO(l.data_proxima_operacao))
      ).length;

      setStats({
        totalLeads,
        leadsAtivos,
        leadsPremium: premiumLeads.length,
        propostasGeradas,
        propostasAprovadas,
        taxaConversao,
        valorBruto,
        valorAprovado,
        valorLiberado,
        comissaoPrevista,
        salesToday: todaySalesResult.data?.length || 0,
        salesMonth: approved.length,
        monthGoal: 30,
        pendingCallbacks,
      });

      // Daily chart data
      const days = eachDayOfInterval({ start: startDate, end: endDate > new Date() ? new Date() : endDate });
      const daily = days.map((day) => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayISO = day.toISOString().split("T")[0];
        const daySales = televendas.filter((t) => t.data_venda === dayStr);
        const dayApproved = daySales.filter((t) => t.status === "proposta_paga");
        const dayLeads = premiumLeads.filter((l) => l.created_at?.startsWith(dayISO)).length +
          activateLeads.filter((l) => l.created_at?.startsWith(dayISO)).length;
        return {
          day: format(day, "dd"),
          leads: dayLeads,
          propostas: daySales.length,
          aprovadas: dayApproved.length,
          valor: dayApproved.reduce((sum, t) => sum + calculateValue(t), 0),
        };
      });
      setDailyData(daily);

      // Recent lists
      const allLeads = [
        ...premiumLeads.map((l) => ({ id: l.id, nome: l.name, tipo: "Premium", created_at: l.created_at, status: l.status })),
        ...activateLeads.map((l) => ({ id: l.id, nome: l.nome, tipo: "Activate", created_at: l.created_at, status: l.status })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRecentLeads(allLeads.slice(0, 5));

      const sortedProposals = [...televendas]
        .sort((a, b) => new Date(b.data_venda).getTime() - new Date(a.data_venda).getTime());
      setRecentProposals(sortedProposals.slice(0, 5));

      const sortedContracts = approved
        .sort((a, b) => new Date(b.data_pagamento || b.data_venda).getTime() - new Date(a.data_pagamento || a.data_venda).getTime());
      setRecentContracts(sortedContracts.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatCompact = (value: number) => {
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}K`;
    return formatCurrency(value);
  };

  const progressPercentage = Math.min((stats.salesMonth / stats.monthGoal) * 100, 100);

  const kpiCards = [
    { label: "Total Leads", value: String(stats.totalLeads), icon: Users, gradient: "from-blue-500 to-blue-600", bg: "bg-blue-500/10" },
    { label: "Leads Ativos", value: String(stats.leadsAtivos), icon: Zap, gradient: "from-cyan-500 to-cyan-600", bg: "bg-cyan-500/10" },
    { label: "Leads Premium", value: String(stats.leadsPremium), icon: Star, gradient: "from-amber-500 to-amber-600", bg: "bg-amber-500/10" },
    { label: "Propostas", value: String(stats.propostasGeradas), icon: FileText, gradient: "from-indigo-500 to-indigo-600", bg: "bg-indigo-500/10" },
    { label: "Aprovadas", value: String(stats.propostasAprovadas), icon: CheckCircle, gradient: "from-green-500 to-emerald-600", bg: "bg-green-500/10" },
    { label: "Conversão", value: `${stats.taxaConversao.toFixed(0)}%`, icon: Percent, gradient: "from-purple-500 to-purple-600", bg: "bg-purple-500/10" },
    { label: "Valor Bruto", value: formatCompact(stats.valorBruto), icon: DollarSign, gradient: "from-sky-500 to-sky-600", bg: "bg-sky-500/10" },
    { label: "Valor Aprovado", value: formatCompact(stats.valorAprovado), icon: TrendingUp, gradient: "from-emerald-500 to-emerald-600", bg: "bg-emerald-500/10" },
  ];

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <AnimatedContainer animation="slide-up">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">
              {greeting}, {userName}! 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-40 h-9 text-xs bg-muted/50">
                <Calendar className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={fetchDashboardData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </AnimatedContainer>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {kpiCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`rounded-xl p-3 border border-border/50 ${card.bg}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <div className={`p-1 rounded-lg bg-gradient-to-br ${card.gradient}`}>
                  <Icon className="h-3 w-3 text-white" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground truncate">{card.label}</span>
              </div>
              <p className="text-base font-bold tracking-tight truncate">{card.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Financial Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Aprovado</p>
                <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.valorAprovado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-sky-500/10 to-transparent border-sky-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-sky-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor Liberado (Troco)</p>
                <p className="text-lg font-bold text-sky-600">{formatCurrency(stats.valorLiberado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Receipt className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Comissão Prevista</p>
                <p className="text-lg font-bold text-amber-600">{formatCurrency(stats.comissaoPrevista)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meta do Mês */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Meta do Mês
            </CardTitle>
            <Badge variant={progressPercentage >= 100 ? "default" : "secondary"}>
              {stats.salesMonth} / {stats.monthGoal} aprovadas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercentage} className="h-2.5" />
          <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
            <span>{progressPercentage.toFixed(0)}% concluído</span>
            <span>Faltam {Math.max(0, stats.monthGoal - stats.salesMonth)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leads por dia */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Leads por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Leads" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Propostas Geradas vs Aprovadas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              Propostas Geradas vs Aprovadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="propostas" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Geradas" />
                  <Bar dataKey="aprovadas" fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]} name="Aprovadas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Faturamento por período */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Faturamento por Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorValorConsultor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Valor"]}
                  labelFormatter={(l) => `Dia ${l}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="valor"
                  stroke="hsl(142, 76%, 36%)"
                  fillOpacity={1}
                  fill="url(#colorValorConsultor)"
                  strokeWidth={2}
                  name="Valor"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Últimos Leads */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Últimos Leads</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate("leads")}>
                Ver todos <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentLeads.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum lead no período</p>
            ) : (
              recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate text-xs">{lead.nome || "Sem nome"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {lead.tipo} • {format(new Date(lead.created_at), "dd/MM")}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{lead.status || "novo"}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Últimas Propostas */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Últimas Propostas</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate("televendas-manage")}>
                Ver todas <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentProposals.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma proposta no período</p>
            ) : (
              recentProposals.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate text-xs">{p.nome}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.banco} • {format(new Date(p.data_venda + "T12:00:00"), "dd/MM")}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-primary shrink-0">
                    {formatCompact(p.parcela || 0)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Últimos Contratos Aprovados */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Contratos Aprovados</CardTitle>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate("televendas-manage")}>
                Ver todos <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentContracts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum contrato aprovado</p>
            ) : (
              recentContracts.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-green-500/5 border border-green-500/10 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate text-xs">{c.nome}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.banco} • {format(new Date((c.data_pagamento || c.data_venda) + "T12:00:00"), "dd/MM")}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-green-600 shrink-0">
                    {formatCompact(c.parcela || 0)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Nova Venda", icon: Phone, tab: "televendas", color: "text-primary" },
          { label: "Meus Leads", icon: Users, tab: "leads", color: "text-amber-500" },
          { label: "Indicar Cliente", icon: UserPlus, tab: "indicate", color: "text-emerald-500" },
          { label: "Gestão Televendas", icon: BarChart3, tab: "televendas-manage", color: "text-indigo-500" },
        ].map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto py-3 flex-col gap-1.5"
            onClick={() => onNavigate(action.tab)}
          >
            <action.icon className={`h-5 w-5 ${action.color}`} />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}
