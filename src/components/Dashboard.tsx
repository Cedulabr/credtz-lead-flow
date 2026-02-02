import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import { useTelevendasNotifications } from "@/hooks/useTelevendasNotifications";
import { useUserDataNotifications } from "@/hooks/useUserDataNotifications";
import { AnimatedContainer, StaggerContainer, StaggerItem } from "./ui/animated-container";
import { SkeletonCard } from "./ui/skeleton-card";
import { SalesRanking } from "./SalesRanking";
import { ConsultorDashboard } from "./ConsultorDashboard";
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
  Eye,
  Zap,
  UserPlus
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
  AreaChart,
  Area
} from "recharts";
import { format, startOfMonth, endOfMonth, isBefore, isAfter, addDays, subMonths, eachDayOfInterval } from "date-fns";
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
  const { unreadCount: televendasUnreadCount } = useTelevendasNotifications();
  const { unreadCount: userDataUnreadCount } = useUserDataNotifications();
  
  const totalNotificationsCount = televendasUnreadCount + userDataUnreadCount;
  
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
  
  // Leads - SEPARADOS
  const [leadsStats, setLeadsStats] = useState({
    premium: 0,
    premiumWorked: 0,
    activated: 0,
    activatedWorked: 0,
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
  const companyName = config?.company_name || 'Leadyzer';

  // State for showing simplified dashboard
  const [showSimpleDashboard, setShowSimpleDashboard] = useState<boolean | null>(null);

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
        const userIsGestor = gestorCompanies.length > 0;
        setIsGestor(userIsGestor);
        setUserCompanyIds((data || []).map(uc => uc.company_id));
        
        // Show simple dashboard for non-admin, non-gestor users
        setShowSimpleDashboard(!isAdmin && !userIsGestor);
        
        const uniqueCompanies = (data || [])
          .filter(uc => uc.companies)
          .map(uc => ({ id: uc.company_id, name: (uc.companies as any).name }));
        setCompanies(uniqueCompanies);
        
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
        // Default to simple dashboard on error for safety
        if (!isAdmin) {
          setShowSimpleDashboard(true);
        }
      }
    };
    
    fetchUserCompanies();
  }, [user?.id, isAdmin]);

  // Main data fetch
  useEffect(() => {
    if (user && showSimpleDashboard === false) {
      fetchAllData();
    }
  }, [user, isAdmin, isGestor, selectedMonth, selectedCompany, userCompanyIds, showSimpleDashboard]);

  // Early return states are handled in the render section below

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
    if (isAdmin) return null;
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

  const calculateSaleValue = (sale: any, commissionRules: any[], companyId?: string | null) => {
    const tipoOperacao = sale.tipo_operacao?.toLowerCase()?.trim() || '';
    const bancoNome = sale.banco?.toLowerCase()?.trim() || '';
    
    const applicableRule = commissionRules.find(rule => {
      const ruleBank = rule.bank_name?.toLowerCase()?.trim() || '';
      const ruleProduct = rule.product_name?.toLowerCase()?.trim() || '';
      
      const bankMatch = ruleBank === bancoNome;
      const productMatch = ruleProduct === tipoOperacao || 
                          ruleProduct.includes(tipoOperacao) || 
                          tipoOperacao.includes(ruleProduct);
      
      const isCompanyRule = rule.company_id === companyId && companyId;
      const isGlobalRule = !rule.company_id;
      
      return bankMatch && productMatch && (isCompanyRule || isGlobalRule);
    }) || commissionRules.find(rule => {
      const ruleBank = rule.bank_name?.toLowerCase()?.trim() || '';
      return ruleBank === bancoNome;
    });
    
    if (applicableRule) {
      const calculationModel = applicableRule.calculation_model?.toLowerCase()?.trim();
      
      if (calculationModel === 'saldo_devedor') {
        return sale.saldo_devedor || 0;
      } else if (calculationModel === 'valor_bruto' || calculationModel === 'bruto') {
        return (sale.saldo_devedor || 0) + (sale.troco || 0);
      } else if (calculationModel === 'troco') {
        return sale.troco || 0;
      } else if (calculationModel === 'ambos') {
        return (sale.saldo_devedor || 0) + (sale.troco || 0);
      }
    }
    
    if (tipoOperacao === 'portabilidade') {
      return sale.saldo_devedor || 0;
    }
    
    return sale.parcela || 0;
  };

  const fetchSalesData = async () => {
    try {
      const { startDate, endDate, previousStart, previousEnd } = getDateRange();
      const companyFilter = getCompanyFilter();
      
      let rulesQuery = supabase
        .from('commission_rules')
        .select('*')
        .eq('is_active', true);
      
      if (companyFilter) {
        rulesQuery = rulesQuery.or(`company_id.is.null,company_id.in.(${companyFilter.join(',')})`);
      }
      
      const { data: commissionRules } = await rulesQuery;
      const rules = commissionRules || [];
      
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      const prevStartStr = format(previousStart, 'yyyy-MM-dd');
      const prevEndStr = format(previousEnd, 'yyyy-MM-dd');
      
      let salesQuery = supabase
        .from('televendas')
        .select('*')
        .gte('data_venda', startDateStr)
        .lte('data_venda', endDateStr);
      
      if (!isAdmin && !isGestor) {
        salesQuery = salesQuery.eq('user_id', user?.id);
      } else if (companyFilter) {
        salesQuery = salesQuery.in('company_id', companyFilter);
      }
      
      const { data: salesData } = await salesQuery;
      
      const paidSales = salesData?.filter(s => s.status === 'pago') || [];
      
      const totalValue = paidSales.reduce((sum, sale) => {
        return sum + calculateSaleValue(sale, rules, sale.company_id);
      }, 0);
      
      setTotalSales(paidSales.length);
      setTotalRevenue(totalValue);
      setAverageTicket(paidSales.length > 0 ? totalValue / paidSales.length : 0);
      
      let prevQuery = supabase
        .from('televendas')
        .select('*')
        .gte('data_venda', prevStartStr)
        .lte('data_venda', prevEndStr);
      
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
      
      const daysInMonth = eachDayOfInterval({ start: startDate, end: endDate });
      const dailyData = daysInMonth.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const daySales = paidSales.filter(s => s.data_venda === dayStr);
        return {
          date: dayStr,
          day: format(day, 'dd', { locale: ptBR }),
          sales: daySales.length,
          value: daySales.reduce((sum, sale) => sum + calculateSaleValue(sale, rules, sale.company_id), 0)
        };
      });
      setDailySalesData(dailyData);
      
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
      
      const startDateStr = format(startDate, 'yyyy-MM-dd');
      const endDateStr = format(endDate, 'yyyy-MM-dd');
      
      let query = supabase
        .from('commissions')
        .select('*')
        .gte('proposal_date', startDateStr)
        .lte('proposal_date', endDateStr);
      
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
      
      // Leads Premium (tabela leads)
      let premiumQuery = supabase
        .from('leads')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (!isAdmin && !isGestor) {
        premiumQuery = premiumQuery.eq('assigned_to', user?.id);
      } else if (companyFilter) {
        premiumQuery = premiumQuery.in('company_id', companyFilter);
      }
      
      const { data: premiumData } = await premiumQuery;
      const premiumLeads = premiumData || [];
      const premiumWorked = premiumLeads.filter(l => l.status && l.status !== 'novo').length;
      
      // Activate Leads (tabela activate_leads)
      let activateQuery = supabase
        .from('activate_leads')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (!isAdmin && !isGestor) {
        activateQuery = activateQuery.eq('assigned_to', user?.id);
      } else if (companyFilter) {
        activateQuery = activateQuery.in('company_id', companyFilter);
      }
      
      const { data: activateData } = await activateQuery;
      const activateLeads = activateData || [];
      const activatedWorked = activateLeads.filter(l => l.status && l.status !== 'novo').length;
      
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
      
      const { data: activeData } = await propostasQuery;
      
      // Conversões
      const totalLeads = premiumLeads.length + activateLeads.length;
      const converted = premiumLeads.filter(l => l.status === 'convertido' || l.status === 'fechado').length +
                       activateLeads.filter(l => l.status === 'convertido' || l.status === 'fechado').length;
      
      setLeadsStats({
        premium: premiumLeads.length,
        premiumWorked,
        activated: activateLeads.length,
        activatedWorked,
        conversionRate: totalLeads > 0 ? (converted / totalLeads) * 100 : 0,
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
      
      let rulesQuery = supabase
        .from('commission_rules')
        .select('*')
        .eq('is_active', true);
      
      if (companyFilter) {
        rulesQuery = rulesQuery.or(`company_id.is.null,company_id.in.(${companyFilter.join(',')})`);
      }
      
      const { data: commissionRules } = await rulesQuery;
      const rules = commissionRules || [];
      
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
      
      let salesQuery = supabase
        .from('televendas')
        .select('user_id, parcela, status, tipo_operacao, banco, saldo_devedor, troco, company_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (companyFilter) {
        salesQuery = salesQuery.in('company_id', companyFilter);
      }
      
      const { data: allSales } = await salesQuery;
      
      let commissionsQuery = supabase
        .from('commissions')
        .select('user_id, commission_amount')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      
      if (companyFilter) {
        commissionsQuery = commissionsQuery.in('company_id', companyFilter);
      }
      
      const { data: allCommissions } = await commissionsQuery;
      
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
      
      allSales?.forEach(sale => {
        if (sale.status === 'pago' && sale.user_id) {
          const vendor = vendorMap.get(sale.user_id);
          if (vendor) {
            vendor.totalSales++;
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
    setNotificationsCount(alertsList.length + televendasUnreadCount);
  };

  useEffect(() => {
    fetchAlerts();
  }, [financeAlerts, televendasUnreadCount]);

  const revenueChange = previousRevenue > 0 
    ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
    : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`;
    }
    return formatCurrency(value);
  };

  const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))'];

  const monthOptions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const months = [];
    
    const startYear = 2025;
    const startMonth = 11;
    
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

  // Conditional rendering based on user role
  if (showSimpleDashboard === true) {
    return <ConsultorDashboard onNavigate={onNavigate} />;
  }

  if (showSimpleDashboard === null) {
    return (
      <div className="p-6 space-y-6">
        <SkeletonCard />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <AnimatedContainer animation="fade" className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Top Bar Desktop */}
      <div className="hidden md:block sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            {config?.logo_url ? (
              <img src={config.logo_url} alt={companyName} className="h-10 w-auto" />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">{companyName}</h1>
              <p className="text-sm text-muted-foreground">Olá, {userName} 👋</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-44 h-10 bg-muted/50 border-border/50">
                <Calendar className="h-4 w-4 mr-2 text-primary" />
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
                <SelectTrigger className="w-40 h-10 bg-muted/50 border-border/50">
                  <Building2 className="h-4 w-4 mr-2 text-primary" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas Empresas</SelectItem>
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 bg-muted/50 border-border/50"
              onClick={() => fetchAllData()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="h-10 w-10 relative bg-muted/50 border-border/50"
              onClick={() => onNavigate('notifications')}
            >
              <Bell className="h-4 w-4" />
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium animate-pulse">
                  {notificationsCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden px-3 py-2.5 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-muted-foreground">Olá, <span className="font-semibold text-foreground">{userName}</span> 👋</p>
          <div className="flex items-center gap-1.5">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9"
              onClick={() => fetchAllData()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-9 w-9 relative"
              onClick={() => onNavigate('notifications')}
            >
              <Bell className="h-4 w-4" />
              {notificationsCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
                  {notificationsCount}
                </span>
              )}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="h-10 text-xs bg-muted/50">
              <Calendar className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
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
              <SelectTrigger className="h-10 text-xs bg-muted/50">
                <Building2 className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
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
        </div>
      </div>

      <div className="p-3 md:p-6 space-y-4 md:space-y-6 w-full max-w-full overflow-x-hidden">
        {/* Alerts Banner */}
        {alerts.length > 0 && (
          <div className="bg-gradient-to-r from-destructive/10 to-warning/10 border border-destructive/20 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-destructive/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-destructive">Atenção!</p>
                <p className="text-sm text-muted-foreground">{alerts.map(a => a.message).join(' • ')}</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => onNavigate('finances')}>
                Ver
              </Button>
            </div>
          </div>
        )}

        {/* Main KPIs Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
          {/* Vendas */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:border-primary/40 transition-all cursor-pointer hover:shadow-xl hover:shadow-primary/10" onClick={() => onNavigate('televendas')}>
            <div className="absolute top-0 right-0 w-20 md:w-32 h-20 md:h-32 bg-primary/5 rounded-full -translate-y-10 md:-translate-y-16 translate-x-10 md:translate-x-16" />
            <CardContent className="p-3 md:p-5 relative">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="h-9 w-9 md:h-11 md:w-11 bg-primary/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <Badge variant="outline" className={`text-[9px] md:text-[10px] ${revenueChange >= 0 ? 'bg-success/10 text-success border-success/30' : 'bg-destructive/10 text-destructive border-destructive/30'}`}>
                  {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%
                </Badge>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Vendas Pagas</p>
              <p className="text-xl md:text-3xl font-bold text-foreground">{totalSales}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">este mês</p>
            </CardContent>
          </Card>

          {/* Faturamento */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-success/5 to-success/10 border-success/20 hover:border-success/40 transition-all cursor-pointer hover:shadow-xl hover:shadow-success/10" onClick={() => onNavigate('televendas')}>
            <div className="absolute top-0 right-0 w-20 md:w-32 h-20 md:h-32 bg-success/5 rounded-full -translate-y-10 md:-translate-y-16 translate-x-10 md:translate-x-16" />
            <CardContent className="p-3 md:p-5 relative">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="h-9 w-9 md:h-11 md:w-11 bg-success/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-success" />
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Faturamento</p>
              <p className="text-lg md:text-2xl font-bold text-success truncate">{formatCompactCurrency(totalRevenue)}</p>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5 truncate">Ticket: {formatCompactCurrency(averageTicket)}</p>
            </CardContent>
          </Card>

          {/* Comissões */}
          <Card className="group relative overflow-hidden bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20 hover:border-warning/40 transition-all cursor-pointer hover:shadow-xl hover:shadow-warning/10" onClick={() => onNavigate('minhas-comissoes')}>
            <div className="absolute top-0 right-0 w-20 md:w-32 h-20 md:h-32 bg-warning/5 rounded-full -translate-y-10 md:-translate-y-16 translate-x-10 md:translate-x-16" />
            <CardContent className="p-3 md:p-5 relative">
              <div className="flex items-center justify-between mb-2 md:mb-3">
                <div className="h-9 w-9 md:h-11 md:w-11 bg-warning/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CreditCard className="h-4 w-4 md:h-5 md:w-5 text-warning" />
                </div>
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Comissões</p>
              <p className="text-lg md:text-2xl font-bold text-warning truncate">{formatCompactCurrency(totalCommissions)}</p>
              <div className="flex gap-1 mt-0.5">
                <Badge variant="outline" className="text-[8px] md:text-[10px] bg-success/10 text-success border-success/30 px-1 md:px-1.5">
                  Pago: {formatCompactCurrency(commissionsPaid)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Performance / Conversão */}
          {(isAdmin || isGestor) && vendorStats.length > 0 ? (
            <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20 hover:border-purple-500/40 transition-all cursor-pointer hover:shadow-xl hover:shadow-purple-500/10" onClick={() => onNavigate('performance-report')}>
              <div className="absolute top-0 right-0 w-20 md:w-32 h-20 md:h-32 bg-purple-500/5 rounded-full -translate-y-10 md:-translate-y-16 translate-x-10 md:translate-x-16" />
              <CardContent className="p-3 md:p-5 relative">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div className="h-9 w-9 md:h-11 md:w-11 bg-purple-500/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Trophy className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                  </div>
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mb-0.5">Top Vendedor</p>
                <p className="text-sm md:text-base font-bold text-foreground truncate">{vendorStats[0]?.name}</p>
                <p className="text-[10px] md:text-xs text-purple-500 truncate mt-0.5">{formatCompactCurrency(vendorStats[0]?.totalValue || 0)}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="group relative overflow-hidden bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20">
              <div className="absolute top-0 right-0 w-20 md:w-32 h-20 md:h-32 bg-purple-500/5 rounded-full -translate-y-10 md:-translate-y-16 translate-x-10 md:translate-x-16" />
              <CardContent className="p-3 md:p-5 relative">
                <div className="flex items-center justify-between mb-2 md:mb-3">
                  <div className="h-9 w-9 md:h-11 md:w-11 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Percent className="h-4 w-4 md:h-5 md:w-5 text-purple-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Conversão</p>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{leadsStats.conversionRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-1">{leadsStats.premiumWorked + leadsStats.activatedWorked} leads trabalhados</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Leads Section - SEPARADOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Leads Premium */}
          <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-8 w-8 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <Star className="h-4 w-4 text-amber-500" />
                  </div>
                  Leads Premium
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => onNavigate('leads')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-4 bg-amber-500/10 rounded-2xl">
                  <p className="text-3xl font-bold text-amber-500">{leadsStats.premium}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </div>
                <div className="text-center p-4 bg-success/10 rounded-2xl">
                  <p className="text-3xl font-bold text-success">{leadsStats.premiumWorked}</p>
                  <p className="text-xs text-muted-foreground mt-1">Trabalhados</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{leadsStats.premium > 0 ? ((leadsStats.premiumWorked / leadsStats.premium) * 100).toFixed(0) : 0}%</span>
                </div>
                <Progress value={leadsStats.premium > 0 ? (leadsStats.premiumWorked / leadsStats.premium) * 100 : 0} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Activate Leads */}
          <Card className="border-2 border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-8 w-8 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                    <Zap className="h-4 w-4 text-cyan-500" />
                  </div>
                  Activate Leads
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => onNavigate('activate-leads')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-4 bg-cyan-500/10 rounded-2xl">
                  <p className="text-3xl font-bold text-cyan-500">{leadsStats.activated}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </div>
                <div className="text-center p-4 bg-success/10 rounded-2xl">
                  <p className="text-3xl font-bold text-success">{leadsStats.activatedWorked}</p>
                  <p className="text-xs text-muted-foreground mt-1">Trabalhados</p>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Progresso</span>
                  <span>{leadsStats.activated > 0 ? ((leadsStats.activatedWorked / leadsStats.activated) * 100).toFixed(0) : 0}%</span>
                </div>
                <Progress value={leadsStats.activated > 0 ? (leadsStats.activatedWorked / leadsStats.activated) * 100 : 0} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sales Chart */}
        <Card className="border-2 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-8 w-8 bg-primary/20 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                Vendas por Período
              </CardTitle>
              <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
                {['day', 'week', 'month'].map((view) => (
                  <Button
                    key={view}
                    variant={chartView === view ? 'default' : 'ghost'}
                    size="sm"
                    className="h-8 text-xs px-3 rounded-lg"
                    onClick={() => setChartView(view as any)}
                  >
                    {view === 'day' ? 'Dia' : view === 'week' ? 'Semana' : 'Mês'}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailySalesData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'value' ? formatCurrency(value) : value,
                      name === 'value' ? 'Valor' : 'Vendas'
                    ]}
                    labelFormatter={(label) => `Dia ${label}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales Ranking */}
        <SalesRanking 
          companyFilter={getCompanyFilter()} 
          selectedMonth={selectedMonth}
        />

        {/* Funnel + Finance Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sales Funnel */}
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-8 w-8 bg-primary/20 rounded-xl flex items-center justify-center">
                  <Filter className="h-4 w-4 text-primary" />
                </div>
                Funil de Televendas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnelData.map((item, index) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">{item.name}</span>
                      <span className="font-bold text-lg">{item.value}</span>
                    </div>
                    <div className="h-10 rounded-2xl overflow-hidden bg-muted/30">
                      <div 
                        className="h-full rounded-2xl transition-all duration-700 flex items-center justify-center text-xs font-semibold text-white shadow-lg"
                        style={{ 
                          width: `${funnelData[0]?.value ? Math.max((item.value / funnelData[0].value) * 100, item.value > 0 ? 15 : 0) : 0}%`,
                          backgroundColor: item.fill,
                          minWidth: item.value > 0 ? '60px' : '0'
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
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-8 w-8 bg-primary/20 rounded-xl flex items-center justify-center">
                    <Wallet className="h-4 w-4 text-primary" />
                  </div>
                  Resumo Financeiro
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => onNavigate('finances')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-destructive/10 to-destructive/5 rounded-2xl border border-destructive/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-destructive/20 rounded-xl flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <p className="font-semibold">Contas Vencidas</p>
                    <p className="text-xs text-muted-foreground">{financeAlerts.overdue.length} pendência(s)</p>
                  </div>
                </div>
                <span className="font-bold text-destructive text-lg">{formatCompactCurrency(financeAlerts.totalOverdue)}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-warning/10 to-warning/5 rounded-2xl border border-warning/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-warning/20 rounded-xl flex items-center justify-center">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-semibold">Vencendo em Breve</p>
                    <p className="text-xs text-muted-foreground">Próximos 3 dias</p>
                  </div>
                </div>
                <span className="font-bold text-warning text-lg">{formatCompactCurrency(financeAlerts.totalDueSoon)}</span>
              </div>
              
              <Button className="w-full h-11 rounded-xl" onClick={() => onNavigate('finances')}>
                <Wallet className="h-4 w-4 mr-2" />
                Acessar Kanban Financeiro
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Team Performance - Admin/Gestor Only */}
        {(isAdmin || isGestor) && vendorStats.length > 0 && (
          <Card className="border-2 shadow-lg bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="h-8 w-8 bg-amber-500/20 rounded-xl flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-amber-500" />
                  </div>
                  Top Vendedores
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => onNavigate('performance-report')}>
                  Ver Relatório
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {vendorStats.slice(0, 5).map((vendor, index) => (
                  <div key={vendor.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl hover:bg-muted/50 transition-colors">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white' :
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-white' :
                      index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}º
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{vendor.name}</p>
                      <p className="text-sm text-muted-foreground">{vendor.totalSales} vendas</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-success">{formatCompactCurrency(vendor.totalValue)}</p>
                      <p className="text-xs text-muted-foreground">Com: {formatCompactCurrency(vendor.commissionTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="border-2 shadow-lg bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="h-8 w-8 bg-primary/20 rounded-xl flex items-center justify-center">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { icon: UserPlus, label: 'Indicar', action: 'indicate' },
                { icon: ShoppingCart, label: 'Televendas', action: 'televendas' },
                { icon: Star, label: 'Clientes', action: 'meus-clientes' },
                { icon: Wallet, label: 'Finanças', action: 'finances' },
                { icon: CreditCard, label: 'Comissões', action: 'minhas-comissoes' },
                { icon: FileText, label: 'Tabela', action: 'tabela-comissoes' },
              ].map((item) => (
                <Button 
                  key={item.action}
                  variant="outline"
                  onClick={() => onNavigate(item.action)}
                  className="h-20 flex flex-col gap-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all rounded-2xl group"
                >
                  <item.icon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">{item.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Product Distribution */}
        {productStats.length > 0 && (
          <Card className="border-2 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="h-8 w-8 bg-primary/20 rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                Vendas por Produto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productStats}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={40}
                      paddingAngle={2}
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
    </AnimatedContainer>
  );
}
