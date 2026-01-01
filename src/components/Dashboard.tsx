import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Target, 
  ArrowUpRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Star,
  BarChart3,
  Trophy,
  AlertTriangle,
  TrendingDown,
  Percent,
  Activity,
  Calendar,
  Wallet
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { format, startOfMonth, endOfMonth, isBefore, isAfter, addDays } from "date-fns";
import { parseDateSafe } from "@/lib/date";
interface DashboardProps {
  onNavigate: (tab: string) => void;
}

interface VendorStats {
  id: string;
  name: string;
  totalSales: number;
  totalValue: number;
  leadsCount: number;
}

interface ProductStats {
  name: string;
  value: number;
  count: number;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, profile, isAdmin } = useAuth();
  const [period, setPeriod] = useState<'day' | 'month' | 'year'>('month');
  
  // Stats data
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [revenueMeta, setRevenueMeta] = useState(50000);
  const [salesCount, setSalesCount] = useState(0);
  const [salesValue, setSalesValue] = useState(0);
  const [averageTicket, setAverageTicket] = useState(0);
  
  // Team performance
  const [vendorStats, setVendorStats] = useState<VendorStats[]>([]);
  const [leadsRegistered, setLeadsRegistered] = useState(0);
  const [leadsWorked, setLeadsWorked] = useState(0);
  
  // Analysis
  const [productStats, setProductStats] = useState<ProductStats[]>([]);
  const [winRate, setWinRate] = useState(0);
  const [lossRate, setLossRate] = useState(0);
  const [newLeads, setNewLeads] = useState(0);
  const [convertedLeads, setConvertedLeads] = useState(0);
  
  // Forecast & Alerts
  const [pipelineValue, setPipelineValue] = useState(0);
  const [stalledDeals, setStalledDeals] = useState(0);
  const [atRiskDeals, setAtRiskDeals] = useState(0);
  
  // Previous period comparison
  const [previousRevenue, setPreviousRevenue] = useState(0);
  
  // Recent activities
  const [recentActivities, setRecentActivities] = useState<any[]>([]);

  // Finance alerts data
  const [financeAlerts, setFinanceAlerts] = useState<{
    overdue: any[];
    dueSoon: any[];
    totalOverdue: number;
    totalDueSoon: number;
  }>({ overdue: [], dueSoon: [], totalOverdue: 0, totalDueSoon: 0 });

  // Finance summary (receita vs despesa)
  const [financeSummary, setFinanceSummary] = useState({
    totalReceita: 0,
    totalDespesa: 0,
    saldo: 0
  });

  const userName = profile?.name || user?.email?.split('@')[0] || 'Usuário';

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchFinanceAlerts();
      fetchFinanceSummary();
    }
  }, [user, isAdmin, period]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStart = new Date(startDate);
        previousStart.setDate(previousStart.getDate() - 1);
        previousEnd = new Date(startDate);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStart = new Date(now.getFullYear() - 1, 0, 1);
        previousEnd = new Date(now.getFullYear() - 1, 11, 31);
        break;
    }

    return { startDate, previousStart, previousEnd };
  };

  const fetchDashboardData = async () => {
    try {
      const { startDate, previousStart, previousEnd } = getDateRange();

      // Fetch televendas (sales) for current period
      let salesQuery = supabase
        .from('televendas')
        .select('*')
        .gte('created_at', startDate.toISOString());
      
      if (!isAdmin) {
        salesQuery = salesQuery.eq('user_id', user?.id);
      }

      const { data: salesData } = await salesQuery;
      
      const paidSales = salesData?.filter(s => s.status === 'pago') || [];
      const totalSalesValue = paidSales.reduce((sum, s) => sum + (s.parcela || 0), 0);
      
      setSalesCount(paidSales.length);
      setSalesValue(totalSalesValue);
      setTotalRevenue(totalSalesValue);
      setAverageTicket(paidSales.length > 0 ? totalSalesValue / paidSales.length : 0);

      // Calculate win/loss rate
      const totalSales = salesData?.length || 0;
      const canceledSales = salesData?.filter(s => s.status === 'cancelado').length || 0;
      setWinRate(totalSales > 0 ? (paidSales.length / totalSales) * 100 : 0);
      setLossRate(totalSales > 0 ? (canceledSales / totalSales) * 100 : 0);

      // Product stats (by tipo_operacao)
      const productMap = new Map<string, { value: number; count: number }>();
      paidSales.forEach(sale => {
        const product = sale.tipo_operacao || 'Outros';
        const existing = productMap.get(product) || { value: 0, count: 0 };
        productMap.set(product, {
          value: existing.value + (sale.parcela || 0),
          count: existing.count + 1
        });
      });
      setProductStats(Array.from(productMap.entries()).map(([name, data]) => ({
        name,
        value: data.value,
        count: data.count
      })));

      // Previous period revenue
      let previousSalesQuery = supabase
        .from('televendas')
        .select('parcela, status')
        .gte('created_at', previousStart.toISOString())
        .lt('created_at', previousEnd.toISOString());
      
      if (!isAdmin) {
        previousSalesQuery = previousSalesQuery.eq('user_id', user?.id);
      }

      const { data: previousSalesData } = await previousSalesQuery;
      const previousPaidSales = previousSalesData?.filter(s => s.status === 'pago') || [];
      setPreviousRevenue(previousPaidSales.reduce((sum, s) => sum + (s.parcela || 0), 0));

      // Leads data
      let leadsQuery = supabase
        .from('leads_indicados')
        .select('*')
        .gte('created_at', startDate.toISOString());
      
      if (!isAdmin) {
        leadsQuery = leadsQuery.eq('created_by', user?.id);
      }

      const { data: leadsData } = await leadsQuery;
      setLeadsRegistered(leadsData?.length || 0);
      setNewLeads(leadsData?.filter(l => l.status === 'lead_digitado').length || 0);
      setConvertedLeads(leadsData?.filter(l => l.status === 'cliente_fechado').length || 0);
      setLeadsWorked(leadsData?.filter(l => l.status !== 'lead_digitado').length || 0);

      // Pipeline data (propostas)
      let propostasQuery = supabase
        .from('propostas')
        .select('*');
      
      if (!isAdmin) {
        propostasQuery = propostasQuery.eq('created_by_id', user?.id);
      }

      const { data: propostasData } = await propostasQuery;
      
      const activePropostas = propostasData?.filter(p => 
        p.pipeline_stage !== 'recusou_proposta' && p.pipeline_stage !== 'aceitou_proposta'
      ) || [];
      
      setPipelineValue(activePropostas.reduce((sum, p) => sum + (p.valor_proposta || 0), 0));
      
      // Stalled deals (no update in 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const stalled = activePropostas.filter(p => 
        new Date(p.updated_at || p.created_at) < sevenDaysAgo
      );
      setStalledDeals(stalled.length);
      setAtRiskDeals(stalled.filter(p => p.pipeline_stage === 'proposta_enviada').length);

      // Vendor stats (only for admin)
      if (isAdmin) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email');

        const { data: allSales } = await supabase
          .from('televendas')
          .select('*')
          .gte('created_at', startDate.toISOString());

        const { data: allLeads } = await supabase
          .from('leads_indicados')
          .select('created_by')
          .gte('created_at', startDate.toISOString());

        const vendorMap = new Map<string, VendorStats>();
        
        profiles?.forEach(p => {
          vendorMap.set(p.id, {
            id: p.id,
            name: p.name || p.email?.split('@')[0] || 'Usuário',
            totalSales: 0,
            totalValue: 0,
            leadsCount: 0
          });
        });

        allSales?.forEach(sale => {
          if (sale.status === 'pago' && sale.user_id) {
            const vendor = vendorMap.get(sale.user_id);
            if (vendor) {
              vendor.totalSales++;
              vendor.totalValue += sale.parcela || 0;
            }
          }
        });

        allLeads?.forEach(lead => {
          if (lead.created_by) {
            const vendor = vendorMap.get(lead.created_by);
            if (vendor) {
              vendor.leadsCount++;
            }
          }
        });

        const sortedVendors = Array.from(vendorMap.values())
          .filter(v => v.totalSales > 0 || v.leadsCount > 0)
          .sort((a, b) => b.totalValue - a.totalValue);
        
        setVendorStats(sortedVendors.slice(0, 10));
      }

      // Recent activities
      const { data: activities } = await supabase
        .from('leads_indicados')
        .select('nome, created_at, status')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setRecentActivities(activities || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  // Fetch finance alerts (overdue and due soon)
  const fetchFinanceAlerts = async () => {
    try {
      const today = new Date();
      const startDate = startOfMonth(today);
      const endDate = endOfMonth(today);
      const threeDaysFromNow = addDays(today, 3);

      // For admin, fetch all company transactions; for users, fetch their company transactions
      let companyIds: string[] = [];

      if (isAdmin) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id')
          .eq('is_active', true);
        companyIds = (companies || []).map(c => c.id);
      } else {
        const { data: userCompanies } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', user?.id)
          .eq('is_active', true);
        companyIds = (userCompanies || []).map(uc => uc.company_id);
      }

      if (companyIds.length === 0) {
        setFinanceAlerts({ overdue: [], dueSoon: [], totalOverdue: 0, totalDueSoon: 0 });
        return;
      }

      const { data: transactions, error } = await supabase
        .from('financial_transactions')
        .select('id, description, value, due_date, status, type')
        .in('company_id', companyIds)
        .neq('status', 'pago')
        .gte('due_date', format(startOfMonth(addDays(today, -30)), 'yyyy-MM-dd'))
        .lte('due_date', format(endOfMonth(addDays(today, 30)), 'yyyy-MM-dd'));

      if (error) throw error;

      const overdue = (transactions || []).filter((t) => {
        const due = parseDateSafe(t.due_date);
        if (!due) return false;
        return isBefore(due, today);
      });

      const dueSoon = (transactions || []).filter((t) => {
        const due = parseDateSafe(t.due_date);
        if (!due) return false;
        return isAfter(due, today) && isBefore(due, threeDaysFromNow);
      });

      setFinanceAlerts({
        overdue,
        dueSoon,
        totalOverdue: overdue.reduce((sum, t) => sum + Number(t.value), 0),
        totalDueSoon: dueSoon.reduce((sum, t) => sum + Number(t.value), 0),
      });
    } catch (error) {
      console.error('Error fetching finance alerts:', error);
    }
  };

  // Fetch finance summary (receita vs despesa)
  const fetchFinanceSummary = async () => {
    try {
      const { startDate } = getDateRange();
      
      let companyIds: string[] = [];

      if (isAdmin) {
        const { data: companies } = await supabase
          .from('companies')
          .select('id')
          .eq('is_active', true);
        companyIds = (companies || []).map(c => c.id);
      } else {
        const { data: userCompanies } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', user?.id)
          .eq('is_active', true);
        companyIds = (userCompanies || []).map(uc => uc.company_id);
      }

      if (companyIds.length === 0) {
        setFinanceSummary({ totalReceita: 0, totalDespesa: 0, saldo: 0 });
        return;
      }

      // Buscar transações do período
      const { data: transactions, error } = await supabase
        .from('financial_transactions')
        .select('type, value, status')
        .in('company_id', companyIds)
        .gte('due_date', format(startDate, 'yyyy-MM-dd'));

      if (error) throw error;

      // Calcular totais
      const receitas = (transactions || [])
        .filter(t => t.type === 'receita')
        .reduce((sum, t) => sum + Number(t.value), 0);
      
      const despesas = (transactions || [])
        .filter(t => t.type === 'despesa')
        .reduce((sum, t) => sum + Number(t.value), 0);

      setFinanceSummary({
        totalReceita: receitas,
        totalDespesa: despesas,
        saldo: receitas - despesas
      });
    } catch (error) {
      console.error('Error fetching finance summary:', error);
    }
  };

  const goalProgress = revenueMeta > 0 ? (totalRevenue / revenueMeta) * 100 : 0;
  const revenueChange = previousRevenue > 0 
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
    : 0;

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))'];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatActivities = recentActivities.map((activity, index) => ({
    id: index + 1,
    type: activity.status === 'cliente_fechado' ? 'approval' : 'indication',
    message: activity.status === 'cliente_fechado' ? 
      `Cliente ${activity.nome} fechado` : 
      `Cliente ${activity.nome} indicado`,
    time: new Date(activity.created_at).toLocaleString('pt-BR'),
    icon: activity.status === 'cliente_fechado' ? CheckCircle : Users,
    color: activity.status === 'cliente_fechado' ? 'success' : 'primary'
  }));

  const periodLabel = period === 'day' ? 'Hoje' : period === 'month' ? 'Este Mês' : 'Este Ano';

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 space-y-6 pb-24">
        {/* Header */}
        <div className="text-center space-y-4 py-3">
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {userName}! 👋
          </h1>
          <p className="text-base text-muted-foreground">
            {isAdmin ? 'Visão geral da equipe' : 'Seu painel de desempenho'}
          </p>
          
          {/* Period Selector */}
          <div className="flex justify-center gap-2">
            <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
              <SelectTrigger className="w-40">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Hoje</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="year">Este Ano</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Indicar Cliente Button */}
          <div className="flex justify-center pt-2">
            <Button 
              onClick={() => onNavigate("indicate")}
              className="h-12 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base shadow-elevation rounded-xl"
            >
              <Users className="mr-2 h-5 w-5" />
              Indicar Cliente
            </Button>
          </div>
        </div>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Receita Total */}
          <Card className="border-2 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
                {revenueChange !== 0 && (
                  <Badge variant={revenueChange >= 0 ? "default" : "destructive"} className="text-xs">
                    {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%
                  </Badge>
                )}
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Receita Total</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">Meta: {formatCurrency(revenueMeta)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Vendas Realizadas */}
          <Card className="border-2 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <Badge className="text-xs bg-primary/10 text-primary">{periodLabel}</Badge>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Vendas Realizadas</p>
                <p className="text-xl font-bold text-foreground">{salesCount}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(salesValue)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Progresso da Meta */}
          <Card className="border-2 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
                  <Target className="h-5 w-5 text-warning" />
                </div>
                <span className="text-lg font-bold text-warning">{goalProgress.toFixed(0)}%</span>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Progresso da Meta</p>
                <Progress value={Math.min(goalProgress, 100)} className="h-2 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Faltam {formatCurrency(Math.max(revenueMeta - totalRevenue, 0))}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Médio */}
          <Card className="border-2 shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-secondary-foreground" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">Ticket Médio</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(averageTicket)}</p>
                <p className="text-xs text-muted-foreground">por venda</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Finance Summary - Receita vs Despesa */}
        <Card className="border-2 shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-5 w-5 text-primary" />
              Resultado Financeiro do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-success/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-success mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="text-lg font-bold text-success">{formatCurrency(financeSummary.totalReceita)}</p>
              </div>
              <div className="text-center p-3 bg-destructive/10 rounded-lg">
                <TrendingDown className="h-5 w-5 text-destructive mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="text-lg font-bold text-destructive">{formatCurrency(financeSummary.totalDespesa)}</p>
              </div>
              <div className={`text-center p-3 rounded-lg ${financeSummary.saldo >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <DollarSign className={`h-5 w-5 mx-auto mb-1 ${financeSummary.saldo >= 0 ? 'text-success' : 'text-destructive'}`} />
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-lg font-bold ${financeSummary.saldo >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(financeSummary.saldo)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leads Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-2 shadow-card">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 text-primary mx-auto" />
              <p className="text-2xl font-bold mt-2">{leadsRegistered}</p>
              <p className="text-xs text-muted-foreground">Leads Cadastrados</p>
            </CardContent>
          </Card>
          
          <Card className="border-2 shadow-card">
            <CardContent className="p-4 text-center">
              <Activity className="h-6 w-6 text-warning mx-auto" />
              <p className="text-2xl font-bold mt-2">{leadsWorked}</p>
              <p className="text-xs text-muted-foreground">Leads Trabalhados</p>
            </CardContent>
          </Card>
          
          <Card className="border-2 shadow-card">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-6 w-6 text-success mx-auto" />
              <p className="text-2xl font-bold mt-2">{convertedLeads}</p>
              <p className="text-xs text-muted-foreground">Convertidos</p>
            </CardContent>
          </Card>
          
          <Card className="border-2 shadow-card">
            <CardContent className="p-4 text-center">
              <Percent className="h-6 w-6 text-primary mx-auto" />
              <p className="text-2xl font-bold mt-2">{winRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
            </CardContent>
          </Card>
        </div>

        {/* Team Performance - Admin Only */}
        {isAdmin && vendorStats.length > 0 && (
          <Card className="border-2 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-warning" />
                Ranking de Vendedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vendorStats.slice(0, 5).map((vendor, index) => (
                  <div key={vendor.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground">{vendor.totalSales} vendas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{formatCurrency(vendor.totalValue)}</p>
                      <p className="text-xs text-muted-foreground">{vendor.leadsCount} leads</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sales by User Chart */}
              {vendorStats.length > 0 && (
                <div className="mt-6 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vendorStats.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))' 
                        }}
                      />
                      <Bar dataKey="totalValue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Product Analysis */}
        {productStats.length > 0 && (
          <Card className="border-2 shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Vendas por Produto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productStats}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {productStats.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Win/Loss Rate */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-2 border-success/30 shadow-card">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-success mx-auto" />
              <p className="text-3xl font-bold text-success mt-2">{winRate.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Taxa de Vitória</p>
            </CardContent>
          </Card>
          
          <Card className="border-2 border-destructive/30 shadow-card">
            <CardContent className="p-4 text-center">
              <TrendingDown className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-3xl font-bold text-destructive mt-2">{lossRate.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Taxa de Perda</p>
            </CardContent>
          </Card>
        </div>

        {/* Forecast & Alerts */}
        <Card className="border-2 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Previsão e Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Forecast de Vendas</p>
                  <p className="text-xs text-muted-foreground">Valor no pipeline</p>
                </div>
              </div>
              <p className="font-bold text-primary">{formatCurrency(pipelineValue)}</p>
            </div>

            {stalledDeals > 0 && (
              <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium">Negócios Parados</p>
                    <p className="text-xs text-muted-foreground">Sem atualização há 7+ dias</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-warning text-warning">{stalledDeals}</Badge>
              </div>
            )}

            {atRiskDeals > 0 && (
              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium">Em Risco</p>
                    <p className="text-xs text-muted-foreground">Propostas enviadas paradas</p>
                  </div>
                </div>
                <Badge variant="destructive">{atRiskDeals}</Badge>
              </div>
            )}

            {stalledDeals === 0 && atRiskDeals === 0 && financeAlerts.overdue.length === 0 && financeAlerts.dueSoon.length === 0 && (
              <div className="flex items-center justify-center p-4 text-center">
                <div>
                  <CheckCircle className="h-8 w-8 text-success mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Nenhum alerta no momento</p>
                </div>
              </div>
            )}

            {/* Finance Alerts */}
            {financeAlerts.overdue.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium">Contas Vencidas</p>
                    <p className="text-xs text-muted-foreground">{financeAlerts.overdue.length} conta(s) - {formatCurrency(financeAlerts.totalOverdue)}</p>
                  </div>
                </div>
                <Badge variant="destructive">{financeAlerts.overdue.length}</Badge>
              </div>
            )}

            {financeAlerts.dueSoon.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium">Vencendo em Breve</p>
                    <p className="text-xs text-muted-foreground">{financeAlerts.dueSoon.length} conta(s) - {formatCurrency(financeAlerts.totalDueSoon)}</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-warning text-warning">{financeAlerts.dueSoon.length}</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparison */}
        <Card className="border-2 shadow-card">
          <CardHeader>
            <CardTitle className="text-center">Comparação com Período Anterior</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Período Atual</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Período Anterior</p>
                <p className="text-xl font-bold text-foreground">{formatCurrency(previousRevenue)}</p>
              </div>
            </div>
            {revenueChange !== 0 && (
              <div className={`mt-4 p-3 rounded-lg text-center ${revenueChange >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
                <p className={`font-bold ${revenueChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {revenueChange >= 0 ? '↑' : '↓'} {Math.abs(revenueChange).toFixed(1)}% 
                  {revenueChange >= 0 ? ' de crescimento' : ' de queda'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-2 shadow-card bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-primary" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <Button 
                variant="outline"
                onClick={() => onNavigate("indicate")}
                className="h-20 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Users className="h-6 w-6" />
                <span className="text-xs font-medium">Indicar Cliente</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => onNavigate("leads")}
                className="h-20 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Activity className="h-6 w-6" />
                <span className="text-xs font-medium">Gerenciar Leads</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => onNavigate("meus-clientes")}
                className="h-20 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Star className="h-6 w-6" />
                <span className="text-xs font-medium">Meus Clientes</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => onNavigate("finances")}
                className="h-20 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Wallet className="h-6 w-6" />
                <span className="text-xs font-medium">Finanças</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => onNavigate("minhas-comissoes")}
                className="h-20 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <DollarSign className="h-6 w-6" />
                <span className="text-xs font-medium">Comissões</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Activities Section */}
        <Card className="border-2 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold text-center text-foreground">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formatActivities.length > 0 ? formatActivities.slice(0, 4).map((activity) => {
                const Icon = activity.icon;
                const iconColor = activity.color === 'primary' ? 'text-primary' : 
                               activity.color === 'success' ? 'text-success' : 'text-primary';
                const bgColor = activity.color === 'primary' ? 'bg-primary/10' : 
                             activity.color === 'success' ? 'bg-success/10' : 'bg-primary/10';
                
                return (
                  <div key={activity.id} className="flex items-center space-x-4 p-4 border-2 rounded-xl hover:bg-muted/30 transition-colors">
                    <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-base">
                        {activity.message}
                      </p>
                      <p className="text-muted-foreground text-sm">{activity.time}</p>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-8 space-y-2">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-base text-muted-foreground font-medium">
                    Nenhuma atividade recente
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
