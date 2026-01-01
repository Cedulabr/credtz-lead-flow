import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useWhitelabel } from "@/hooks/useWhitelabel";
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
  Wallet,
  RefreshCw,
  Bell,
  Building2,
  ShoppingCart,
  CreditCard,
  FileText,
  ChevronRight,
  Filter,
  XCircle,
  Eye
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
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  FunnelChart,
  Funnel,
  LabelList
} from "recharts";
import { format, startOfMonth, endOfMonth, isBefore, isAfter, addDays, subMonths, eachDayOfInterval, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  commissionTotal: number;
}

interface ProductStats {
  name: string;
  value: number;
  count: number;
}

interface DailySales {
  date: string;
  day: string;
  sales: number;
  value: number;
}

interface FunnelData {
  name: string;
  value: number;
  fill: string;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, profile, isAdmin } = useAuth();
  const { config } = useWhitelabel();
  
  // Period and filters
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartView, setChartView] = useState<'day' | 'week' | 'month'>('day');
  
  // Company data
  const [companies, setCompanies] = useState<{id: string; name: string}[]>([]);
  const [userCompanyIds, setUserCompanyIds] = useState<string[]>([]);
  const [isGestor, setIsGestor] = useState(false);
  
  // Stats data
  const [totalSales, setTotalSales] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [commissionsPreview, setCommissionsPreview] = useState(0);
  const [commissionsPaid, setCommissionsPaid] = useState(0);
  const [previousRevenue, setPreviousRevenue] = useState(0);
  const [averageTicket, setAverageTicket] = useState(0);
  
  // Team performance
  const [vendorStats, setVendorStats] = useState<VendorStats[]>([]);
  
  // Charts data
  const [dailySalesData, setDailySalesData] = useState<DailySales[]>([]);
  const [productStats, setProductStats] = useState<ProductStats[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  
  // Finance
  const [financeAlerts, setFinanceAlerts] = useState<{
    overdue: any[];
    dueSoon: any[];
    totalOverdue: number;
    totalDueSoon: number;
    totalPayable: number;
  }>({ overdue: [], dueSoon: [], totalOverdue: 0, totalDueSoon: 0, totalPayable: 0 });
  
  // Leads
  const [leadsStats, setLeadsStats] = useState({
    premium: 0,
    worked: 0,
    conversionRate: 0,
    activeClients: 0,
    newClients: 0
  });
  
  // Commissions table
  const [commissionsData, setCommissionsData] = useState<any[]>([]);
  
  // Alerts
  const [alerts, setAlerts] = useState<{type: string; message: string; action: string; count?: number}[]>([]);
  
  // Notifications count
  const [notificationsCount, setNotificationsCount] = useState(0);

  const userName = profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const companyName = config?.company_name || 'Credtz';

  // Fetch user companies and check gestor status
  useEffect(() => {
    const fetchUserCompanies = async () => {
      if (!user?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('user_companies')
          .select('company_id, company_role, companies(id, name)')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (error) throw error;
        
        const gestorCompanies = (data || []).filter(uc => uc.company_role === 'gestor');
        setIsGestor(gestorCompanies.length > 0);
        setUserCompanyIds((data || []).map(uc => uc.company_id));
        
        // Get unique companies
        const uniqueCompanies = (data || [])
          .filter(uc => uc.companies)
          .map(uc => ({ id: uc.company_id, name: (uc.companies as any).name }));
        setCompanies(uniqueCompanies);
        
        // If admin, fetch all companies
        if (isAdmin) {
          const { data: allCompanies } = await supabase
            .from('companies')
            .select('id, name')
            .eq('is_active', true)
            .order('name');
          setCompanies(allCompanies || []);
        }
      } catch (error) {
        console.error('Error fetching user companies:', error);
      }
    };
    
    fetchUserCompanies();
  }, [user?.id, isAdmin]);

  // Main data fetch
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, isAdmin, isGestor, selectedMonth, selectedCompany, userCompanyIds]);

  const getDateRange = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const previousStart = subMonths(startDate, 1);
    const previousEnd = new Date(year, month - 1, 0);
    
    return { startDate, endDate, previousStart, previousEnd };
  };

  const getCompanyFilter = () => {
    if (selectedCompany !== 'all') return [selectedCompany];
    if (isAdmin) return null; // No filter for admin when "all" is selected
    return userCompanyIds.length > 0 ? userCompanyIds : null;
  };

  const fetchAllData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchSalesData(),
        fetchCommissionsData(),
        fetchFinanceData(),
        fetchLeadsData(),
        fetchFunnelData(),
        fetchTeamPerformance(),
        fetchAlerts()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Função para calcular valor baseado na regra de comissão flexível
  const calculateSaleValue = (sale: any, commissionRules: any[], companyId?: string | null) => {
    const tipoOperacao = sale.tipo_operacao?.toLowerCase()?.trim() || '';
    const bancoNome = sale.banco?.toLowerCase()?.trim() || '';
    
    // Buscar regra aplicável: priorizar regra específica da empresa, depois regra global
    // 1. Primeiro busca regra específica da empresa + banco + produto
    // 2. Depois busca regra global (company_id = null) + banco + produto
    const applicableRule = commissionRules.find(rule => {
      const ruleBank = rule.bank_name?.toLowerCase()?.trim() || '';
      const ruleProduct = rule.product_name?.toLowerCase()?.trim() || '';
      
      // Match exato do banco
      const bankMatch = ruleBank === bancoNome;
      
      // Match do produto (Portabilidade, Novo, Refinanciamento, etc.)
      const productMatch = ruleProduct === tipoOperacao || 
                          ruleProduct.includes(tipoOperacao) || 
                          tipoOperacao.includes(ruleProduct);
      
      // Verificar empresa (específica ou global)
      const isCompanyRule = rule.company_id === companyId && companyId;
      const isGlobalRule = !rule.company_id;
      
      return bankMatch && productMatch && (isCompanyRule || isGlobalRule);
    }) || commissionRules.find(rule => {
      // Fallback: buscar apenas pelo banco se não encontrou pelo produto
      const ruleBank = rule.bank_name?.toLowerCase()?.trim() || '';
      return ruleBank === bancoNome;
    });
    
    // Se houver regra flexível, usar o modelo de cálculo configurado
    if (applicableRule) {
      const calculationModel = applicableRule.calculation_model?.toLowerCase()?.trim();
      
      console.log(`[Dashboard] Regra encontrada para ${sale.banco} - ${sale.tipo_operacao}:`, {
        ruleId: applicableRule.id,
        calculationModel,
        bankName: applicableRule.bank_name,
        productName: applicableRule.product_name
      });
      
      if (calculationModel === 'saldo_devedor') {
        // Banrisul e outros: apenas saldo devedor
        return sale.saldo_devedor || 0;
      } else if (calculationModel === 'valor_bruto' || calculationModel === 'bruto') {
        // Valor bruto = saldo devedor + troco
        return (sale.saldo_devedor || 0) + (sale.troco || 0);
      } else if (calculationModel === 'troco') {
        // Apenas troco
        return sale.troco || 0;
      } else if (calculationModel === 'ambos') {
        // Para modelo "ambos", calcular conforme configurado
        return (sale.saldo_devedor || 0) + (sale.troco || 0);
      }
    }
    
    // Regra padrão por tipo de operação (quando não há regra cadastrada)
    console.log(`[Dashboard] Nenhuma regra encontrada para ${sale.banco} - ${sale.tipo_operacao}, usando padrão`);
    
    if (tipoOperacao === 'portabilidade') {
      // Portabilidade: considera saldo devedor por padrão
      return sale.saldo_devedor || 0;
    }
    
    // Para outros tipos (Novo, Refinanciamento, Cartão), usar a parcela
    return sale.parcela || 0;
  };

  const fetchSalesData = async () => {
    try {
      const { startDate, endDate, previousStart, previousEnd } = getDateRange();
      const companyFilter = getCompanyFilter();
      
      // Buscar regras de comissão flexíveis
      let rulesQuery = supabase
        .from('commission_rules')
        .select('*')
        .eq('is_active', true);
      
      if (companyFilter) {
        rulesQuery = rulesQuery.or(`company_id.is.null,company_id.in.(${companyFilter.join(',')})`);
      }
      
      const { data: commissionRules } = await rulesQuery;
      const rules = commissionRules || [];
      
      // Current period sales
      let salesQuery = supabase
        .from('televendas')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (!isAdmin && !isGestor) {
        salesQuery = salesQuery.eq('user_id', user?.id);
      } else if (companyFilter) {
        salesQuery = salesQuery.in('company_id', companyFilter);
      }
      
      const { data: salesData } = await salesQuery;
      
      // Apenas propostas PAGAS vão para o dashboard
      const paidSales = salesData?.filter(s => s.status === 'pago') || [];
      
      // Calcular valor total respeitando as regras de comissão flexíveis
      const totalValue = paidSales.reduce((sum, sale) => {
        return sum + calculateSaleValue(sale, rules, sale.company_id);
      }, 0);
      
      setTotalSales(paidSales.length);
      setTotalRevenue(totalValue);
      setAverageTicket(paidSales.length > 0 ? totalValue / paidSales.length : 0);
      
      // Previous period sales
      let prevQuery = supabase
        .from('televendas')
        .select('*')
        .gte('created_at', previousStart.toISOString())
        .lte('created_at', previousEnd.toISOString());
      
      if (!isAdmin && !isGestor) {
        prevQuery = prevQuery.eq('user_id', user?.id);
      } else if (companyFilter) {
        prevQuery = prevQuery.in('company_id', companyFilter);
      }
      
      const { data: prevData } = await prevQuery;
      const prevPaidSales = prevData?.filter(s => s.status === 'pago') || [];
      const prevTotalValue = prevPaidSales.reduce((sum, sale) => {
        return sum + calculateSaleValue(sale, rules, sale.company_id);
      }, 0);
      setPreviousRevenue(prevTotalValue);
      
      // Daily sales for chart - usando valores calculados
      const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyData = daysInMonth.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const daySales = paidSales.filter(s => 
          format(new Date(s.created_at), 'yyyy-MM-dd') === dayStr
        );
        return {
          date: dayStr,
          day: format(day, 'dd', { locale: ptBR }),
          sales: daySales.length,
          value: daySales.reduce((sum, sale) => sum + calculateSaleValue(sale, rules, sale.company_id), 0)
        };
      });
      setDailySalesData(dailyData);
      
      // Product stats - usando valores calculados
      const productMap = new Map<string, { value: number; count: number }>();
      paidSales.forEach(sale => {
        const product = sale.tipo_operacao || 'Outros';
        const existing = productMap.get(product) || { value: 0, count: 0 };
        productMap.set(product, {
          value: existing.value + calculateSaleValue(sale, rules, sale.company_id),
          count: existing.count + 1
        });
      });
      setProductStats(Array.from(productMap.entries()).map(([name, data]) => ({
        name,
        value: data.value,
        count: data.count
      })));
      
    } catch (error) {
      console.error('Error fetching sales data:', error);
    }
  };

  const fetchCommissionsData = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      const companyFilter = getCompanyFilter();
      
      let query = supabase
        .from('commissions')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (!isAdmin && !isGestor) {
        query = query.eq('user_id', user?.id);
      } else if (companyFilter) {
        query = query.in('company_id', companyFilter);
      }
      
      const { data } = await query;
      
      const commissions = data || [];
      const positiveCommissions = commissions.filter(c => Number(c.commission_amount) > 0);
      
      setTotalCommissions(positiveCommissions.reduce((sum, c) => sum + Number(c.commission_amount), 0));
      setCommissionsPreview(positiveCommissions.filter(c => c.status === 'preview').reduce((sum, c) => sum + Number(c.commission_amount), 0));
      setCommissionsPaid(positiveCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + Number(c.commission_amount), 0));
      
      // Get user names for commissions table
      if (commissions.length > 0) {
        const userIds = [...new Set(commissions.map(c => c.user_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name')
          .in('id', userIds);
        
        const profileMap = new Map((profiles || []).map(p => [p.id, p.name]));
        
        setCommissionsData(commissions.slice(0, 10).map(c => ({
          ...c,
          user_name: profileMap.get(c.user_id) || 'N/A'
        })));
      } else {
        setCommissionsData([]);
      }
      
    } catch (error) {
      console.error('Error fetching commissions data:', error);
    }
  };

  const fetchFinanceData = async () => {
    try {
      const today = new Date();
      const threeDaysFromNow = addDays(today, 3);
      const companyFilter = getCompanyFilter();
      
      if (!companyFilter && !isAdmin) {
        setFinanceAlerts({ overdue: [], dueSoon: [], totalOverdue: 0, totalDueSoon: 0, totalPayable: 0 });
        return;
      }
      
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('type', 'despesa')
        .neq('status', 'pago');
      
      if (companyFilter) {
        query = query.in('company_id', companyFilter);
      }
      
      const { data: transactions } = await query;
      
      const overdue = (transactions || []).filter(t => {
        const due = parseDateSafe(t.due_date);
        return due && isBefore(due, today);
      });
      
      const dueSoon = (transactions || []).filter(t => {
        const due = parseDateSafe(t.due_date);
        return due && isAfter(due, today) && isBefore(due, threeDaysFromNow);
      });
      
      setFinanceAlerts({
        overdue,
        dueSoon,
        totalOverdue: overdue.reduce((sum, t) => sum + Number(t.value), 0),
        totalDueSoon: dueSoon.reduce((sum, t) => sum + Number(t.value), 0),
        totalPayable: (transactions || []).reduce((sum, t) => sum + Number(t.value), 0)
      });
      
    } catch (error) {
      console.error('Error fetching finance data:', error);
    }
  };

  const fetchLeadsData = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      const companyFilter = getCompanyFilter();
      
      // Leads indicados
      let leadsQuery = supabase
        .from('leads_indicados')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (!isAdmin && !isGestor) {
        leadsQuery = leadsQuery.eq('created_by', user?.id);
      } else if (companyFilter) {
        leadsQuery = leadsQuery.in('company_id', companyFilter);
      }
      
      const { data: leadsData } = await leadsQuery;
      
      const leads = leadsData || [];
      const worked = leads.filter(l => l.status !== 'lead_digitado').length;
      const converted = leads.filter(l => l.status === 'cliente_fechado').length;
      
      // Active clients (from propostas)
      let propostasQuery = supabase
        .from('propostas')
        .select('id')
        .eq('pipeline_stage', 'aceitou_proposta');
      
      if (!isAdmin && !isGestor) {
        propostasQuery = propostasQuery.eq('created_by_id', user?.id);
      } else if (companyFilter) {
        propostasQuery = propostasQuery.in('company_id', companyFilter);
      }
      
      const { data: activeData, count } = await propostasQuery;
      
      setLeadsStats({
        premium: leads.length,
        worked,
        conversionRate: leads.length > 0 ? (converted / leads.length) * 100 : 0,
        activeClients: activeData?.length || 0,
        newClients: converted
      });
      
    } catch (error) {
      console.error('Error fetching leads data:', error);
    }
  };

  const fetchFunnelData = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      const companyFilter = getCompanyFilter();
      
      let query = supabase
        .from('televendas')
        .select('status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (!isAdmin && !isGestor) {
        query = query.eq('user_id', user?.id);
      } else if (companyFilter) {
        query = query.in('company_id', companyFilter);
      }
      
      const { data } = await query;
      
      const statuses = data || [];
      const created = statuses.length;
      const analyzing = statuses.filter(s => s.status === 'em_analise' || s.status === 'aguardando').length;
      const paid = statuses.filter(s => s.status === 'pago').length;
      const canceled = statuses.filter(s => s.status === 'cancelado').length;
      
      setFunnelData([
        { name: 'Criadas', value: created, fill: 'hsl(var(--primary))' },
        { name: 'Em Análise', value: analyzing, fill: 'hsl(var(--warning))' },
        { name: 'Pagas', value: paid, fill: 'hsl(var(--success))' },
        { name: 'Canceladas', value: canceled, fill: 'hsl(var(--destructive))' }
      ]);
      
    } catch (error) {
      console.error('Error fetching funnel data:', error);
    }
  };

  const fetchTeamPerformance = async () => {
    try {
      if (!isAdmin && !isGestor) return;
      
      const { startDate, endDate } = getDateRange();
      const companyFilter = getCompanyFilter();
      
      // Buscar regras de comissão flexíveis para calcular corretamente
      let rulesQuery = supabase
        .from('commission_rules')
        .select('*')
        .eq('is_active', true);
      
      if (companyFilter) {
        rulesQuery = rulesQuery.or(`company_id.is.null,company_id.in.(${companyFilter.join(',')})`);
      }
      
      const { data: commissionRules } = await rulesQuery;
      const rules = commissionRules || [];
      
      // Get users
      let usersQuery = supabase.from('profiles').select('id, name, email');
      
      if (!isAdmin && companyFilter) {
        const { data: companyUsers } = await supabase
          .from('user_companies')
          .select('user_id')
          .in('company_id', companyFilter)
          .eq('is_active', true);
        
        const userIds = (companyUsers || []).map(u => u.user_id);
        if (userIds.length > 0) {
          usersQuery = usersQuery.in('id', userIds);
        }
      }
      
      const { data: profiles } = await usersQuery;
      
      // Get sales with all fields needed for flexible rule calculation
      let salesQuery = supabase
        .from('televendas')
        .select('user_id, parcela, status, tipo_operacao, banco, saldo_devedor, troco, company_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (companyFilter) {
        salesQuery = salesQuery.in('company_id', companyFilter);
      }
      
      const { data: allSales } = await salesQuery;
      
      // Get commissions
      let commissionsQuery = supabase
        .from('commissions')
        .select('user_id, commission_amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (companyFilter) {
        commissionsQuery = commissionsQuery.in('company_id', companyFilter);
      }
      
      const { data: allCommissions } = await commissionsQuery;
      
      // Build vendor stats
      const vendorMap = new Map<string, VendorStats>();
      
      profiles?.forEach(p => {
        vendorMap.set(p.id, {
          id: p.id,
          name: p.name || p.email?.split('@')[0] || 'Usuário',
          totalSales: 0,
          totalValue: 0,
          leadsCount: 0,
          commissionTotal: 0
        });
      });
      
      // Calcular valor usando as regras flexíveis
      allSales?.forEach(sale => {
        if (sale.status === 'pago' && sale.user_id) {
          const vendor = vendorMap.get(sale.user_id);
          if (vendor) {
            vendor.totalSales++;
            // Usar a função calculateSaleValue que respeita as regras flexíveis
            vendor.totalValue += calculateSaleValue(sale, rules, sale.company_id);
          }
        }
      });
      
      allCommissions?.forEach(comm => {
        if (comm.user_id) {
          const vendor = vendorMap.get(comm.user_id);
          if (vendor) {
            vendor.commissionTotal += Number(comm.commission_amount) || 0;
          }
        }
      });
      
      const sortedVendors = Array.from(vendorMap.values())
        .filter(v => v.totalSales > 0 || v.commissionTotal > 0)
        .sort((a, b) => b.totalValue - a.totalValue);
      
      setVendorStats(sortedVendors.slice(0, 5));
      
    } catch (error) {
      console.error('Error fetching team performance:', error);
    }
  };

  const fetchAlerts = async () => {
    const alertsList: {type: string; message: string; action: string; count?: number}[] = [];
    
    // Finance alerts
    if (financeAlerts.overdue.length > 0) {
      alertsList.push({
        type: 'error',
        message: `${financeAlerts.overdue.length} conta(s) vencida(s)`,
        action: 'finances',
        count: financeAlerts.overdue.length
      });
    }
    
    if (financeAlerts.dueSoon.length > 0) {
      alertsList.push({
        type: 'warning',
        message: `${financeAlerts.dueSoon.length} conta(s) vencendo em breve`,
        action: 'finances',
        count: financeAlerts.dueSoon.length
      });
    }
    
    setAlerts(alertsList);
    setNotificationsCount(alertsList.length);
  };

  useEffect(() => {
    fetchAlerts();
  }, [financeAlerts]);

  const revenueChange = previousRevenue > 0 
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))'];

  // Generate month options
  const monthOptions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const months = [];
    
    const startYear = 2026;
    const startMonth = 0;
    
    for (let y = startYear; y <= currentYear; y++) {
      const mStart = (y === startYear) ? startMonth : 0;
      const mEnd = (y === currentYear) ? currentMonth : 11;
      
      for (let m = mStart; m <= mEnd; m++) {
        const date = new Date(y, m, 1);
        const value = `${y}-${String(m + 1).padStart(2, '0')}`;
        const label = format(date, 'MMMM yyyy', { locale: ptBR });
        months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      }
    }
    
    return months.reverse();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {config?.logo_url ? (
              <img src={config.logo_url} alt={companyName} className="h-8 w-auto" />
            ) : (
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-foreground">{companyName}</h1>
              <p className="text-xs text-muted-foreground">Olá, {userName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Filters */}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {(isAdmin || companies.length > 1) && (
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-32 h-9 text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Refresh */}
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => fetchAllData()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            {/* Notifications */}
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 relative"
              onClick={() => onNavigate('notifications')}
            >
              <Bell className="h-4 w-4" />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {notificationsCount}
                </span>
              )}
            </Button>
          </div>
        </div>
        
        {/* Quick Stats Bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t overflow-x-auto gap-4">
          <div className="flex items-center gap-2 min-w-fit">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Vendas:</span>
            <span className="text-sm font-bold">{totalSales}</span>
          </div>
          <div className="flex items-center gap-2 min-w-fit">
            <DollarSign className="h-4 w-4 text-success" />
            <span className="text-xs text-muted-foreground">Faturamento:</span>
            <span className="text-sm font-bold text-success">{formatCurrency(totalRevenue)}</span>
          </div>
          <div className="flex items-center gap-2 min-w-fit">
            <CreditCard className="h-4 w-4 text-warning" />
            <span className="text-xs text-muted-foreground">Comissão:</span>
            <span className="text-sm font-bold">{formatCurrency(totalCommissions)}</span>
          </div>
          <div className="flex items-center gap-2 min-w-fit">
            {revenueChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-success" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span className="text-xs text-muted-foreground">Crescimento:</span>
            <span className={`text-sm font-bold ${revenueChange >= 0 ? 'text-success' : 'text-destructive'}`}>
              {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 pb-24">
        {/* Main KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vendas do Mês */}
          <Card className="border-2 shadow-card hover:shadow-elevation transition-shadow cursor-pointer" onClick={() => onNavigate('televendas')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="outline" className="text-xs">
                  vs. mês anterior
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">Vendas do Mês</p>
              <p className="text-2xl font-bold text-foreground">{totalSales}</p>
              <div className="flex items-center gap-1 mt-1">
                {revenueChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={`text-xs ${revenueChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {Math.abs(revenueChange).toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Valor Produzido */}
          <Card className="border-2 shadow-card hover:shadow-elevation transition-shadow cursor-pointer" onClick={() => onNavigate('televendas')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 bg-success/10 rounded-xl flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-success" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Valor Produzido</p>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">Ticket médio: {formatCurrency(averageTicket)}</p>
            </CardContent>
          </Card>

          {/* Comissões */}
          <Card className="border-2 shadow-card hover:shadow-elevation transition-shadow cursor-pointer" onClick={() => onNavigate('minhas-comissoes')}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 bg-warning/10 rounded-xl flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-warning" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Comissões Geradas</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(totalCommissions)}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                  Pago: {formatCurrency(commissionsPaid)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Performance Equipe */}
          {(isAdmin || isGestor) && vendorStats.length > 0 ? (
            <Card className="border-2 shadow-card hover:shadow-elevation transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Top Vendedor</p>
                <p className="text-lg font-bold text-foreground truncate">{vendorStats[0]?.name}</p>
                <p className="text-xs text-success">{formatCurrency(vendorStats[0]?.totalValue || 0)}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Percent className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Taxa Conversão</p>
                <p className="text-2xl font-bold text-foreground">{leadsStats.conversionRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-1">{leadsStats.worked} leads trabalhados</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sales Chart */}
        <Card className="border-2 shadow-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-primary" />
                Vendas por Período
              </CardTitle>
              <div className="flex gap-1">
                {['day', 'week', 'month'].map((view) => (
                  <Button
                    key={view}
                    variant={chartView === view ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => setChartView(view as any)}
                  >
                    {view === 'day' ? 'Dia' : view === 'week' ? 'Semana' : 'Mês'}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySalesData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'value' ? formatCurrency(value) : value,
                      name === 'value' ? 'Valor' : 'Vendas'
                    ]}
                    labelFormatter={(label) => `Dia ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Funnel + Finance Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales Funnel */}
          <Card className="border-2 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-5 w-5 text-primary" />
                Funil de Televendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnelData.map((item, index) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-bold">{item.value}</span>
                    </div>
                    <div className="h-8 rounded-lg overflow-hidden bg-muted/30">
                      <div 
                        className="h-full rounded-lg transition-all duration-500 flex items-center justify-center text-xs font-medium text-white"
                        style={{ 
                          width: `${funnelData[0]?.value ? (item.value / funnelData[0].value) * 100 : 0}%`,
                          backgroundColor: item.fill,
                          minWidth: item.value > 0 ? '40px' : '0'
                        }}
                      >
                        {item.value > 0 && `${((item.value / (funnelData[0]?.value || 1)) * 100).toFixed(0)}%`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Finance Summary */}
          <Card className="border-2 shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="h-5 w-5 text-primary" />
                  Resumo Financeiro
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('finances')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">Contas Vencidas</p>
                    <p className="text-xs text-muted-foreground">{financeAlerts.overdue.length} pendência(s)</p>
                  </div>
                </div>
                <span className="font-bold text-destructive">{formatCurrency(financeAlerts.totalOverdue)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-warning/10 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-warning" />
                  <div>
                    <p className="text-sm font-medium">Vencendo em Breve</p>
                    <p className="text-xs text-muted-foreground">Próximos 3 dias</p>
                  </div>
                </div>
                <span className="font-bold text-warning">{formatCurrency(financeAlerts.totalDueSoon)}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Total a Pagar</p>
                    <p className="text-xs text-muted-foreground">Este período</p>
                  </div>
                </div>
                <span className="font-bold">{formatCurrency(financeAlerts.totalPayable)}</span>
              </div>
              
              <Button variant="outline" className="w-full" onClick={() => onNavigate('finances')}>
                Acessar Kanban Financeiro
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Leads + Clients Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Leads Premium */}
          <Card className="border-2 shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-5 w-5 text-warning" />
                  Leads Premium
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('leads')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{leadsStats.premium}</p>
                  <p className="text-xs text-muted-foreground">Disponíveis</p>
                </div>
                <div className="text-center p-3 bg-warning/10 rounded-lg">
                  <p className="text-2xl font-bold text-warning">{leadsStats.worked}</p>
                  <p className="text-xs text-muted-foreground">Trabalhados</p>
                </div>
                <div className="text-center p-3 bg-success/10 rounded-lg">
                  <p className="text-2xl font-bold text-success">{leadsStats.conversionRate.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">Conversão</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Meus Clientes */}
          <Card className="border-2 shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-primary" />
                  Meus Clientes
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => onNavigate('meus-clientes')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{leadsStats.activeClients}</p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
                <div className="text-center p-3 bg-success/10 rounded-lg">
                  <p className="text-2xl font-bold text-success">{leadsStats.newClients}</p>
                  <p className="text-xs text-muted-foreground">Novos</p>
                </div>
                <div className="text-center p-3 bg-muted/30 rounded-lg">
                  <Button variant="ghost" size="sm" className="h-full w-full" onClick={() => onNavigate('indicate')}>
                    <Users className="h-5 w-5 mr-1" />
                    Indicar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Performance - Admin/Gestor Only */}
        {(isAdmin || isGestor) && vendorStats.length > 0 && (
          <Card className="border-2 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-5 w-5 text-warning" />
                Top 3 Vendedores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vendorStats.slice(0, 3).map((vendor, index) => (
                  <div key={vendor.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      'bg-amber-700 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground">{vendor.totalSales} vendas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{formatCurrency(vendor.totalValue)}</p>
                      <p className="text-xs text-muted-foreground">Comissão: {formatCurrency(vendor.commissionTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Commissions Table */}
        {commissionsData.length > 0 && (
          <Card className="border-2 shadow-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Comissões Recentes
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onNavigate('tabela-comissoes')}>
                    Tabela
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onNavigate('minhas-comissoes')}>
                    Minhas
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 text-muted-foreground font-medium">Colaborador</th>
                      <th className="text-left p-2 text-muted-foreground font-medium">Banco</th>
                      <th className="text-left p-2 text-muted-foreground font-medium">Produto</th>
                      <th className="text-right p-2 text-muted-foreground font-medium">%</th>
                      <th className="text-right p-2 text-muted-foreground font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissionsData.slice(0, 5).map((comm) => (
                      <tr key={comm.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-2">{comm.user_name}</td>
                        <td className="p-2">{comm.bank_name}</td>
                        <td className="p-2">{comm.product_type}</td>
                        <td className="p-2 text-right">{comm.commission_percentage}%</td>
                        <td className="p-2 text-right font-medium text-success">{formatCurrency(Number(comm.commission_amount))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <Card className="border-2 border-destructive/30 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Alertas e Notificações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.map((alert, index) => (
                <div 
                  key={index} 
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                    alert.type === 'error' ? 'bg-destructive/10 hover:bg-destructive/20' : 'bg-warning/10 hover:bg-warning/20'
                  }`}
                  onClick={() => onNavigate(alert.action)}
                >
                  <div className="flex items-center gap-2">
                    {alert.type === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    )}
                    <span className="font-medium">{alert.message}</span>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    Ver
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="border-2 shadow-card bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-primary" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
              <Button 
                variant="outline"
                onClick={() => onNavigate("indicate")}
                className="h-16 flex flex-col gap-1 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Users className="h-5 w-5" />
                <span className="text-xs font-medium">Indicar</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => onNavigate("televendas")}
                className="h-16 flex flex-col gap-1 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="text-xs font-medium">Televendas</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => onNavigate("meus-clientes")}
                className="h-16 flex flex-col gap-1 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Star className="h-5 w-5" />
                <span className="text-xs font-medium">Clientes</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => onNavigate("finances")}
                className="h-16 flex flex-col gap-1 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <Wallet className="h-5 w-5" />
                <span className="text-xs font-medium">Finanças</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => onNavigate("minhas-comissoes")}
                className="h-16 flex flex-col gap-1 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <CreditCard className="h-5 w-5" />
                <span className="text-xs font-medium">Comissões</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => onNavigate("tabela-comissoes")}
                className="h-16 flex flex-col gap-1 hover:bg-primary hover:text-primary-foreground transition-all"
              >
                <FileText className="h-5 w-5" />
                <span className="text-xs font-medium">Tabela</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Product Distribution */}
        {productStats.length > 0 && (
          <Card className="border-2 shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
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
      </div>
    </div>
  );
}
