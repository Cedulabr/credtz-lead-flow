import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Coins, 
  Building2, 
  AlertTriangle,
  TrendingUp,
  Clock,
  ChevronRight,
  Zap,
  UserMinus,
  Bell,
  ArrowUpRight,
  RefreshCw,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import type { AdminModule } from './AdminLayout';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalCredits: number;
  totalCompanies: number;
  pendingDuplicates: number;
  inactiveAlerts: number;
  recentLeads: number;
}

interface Alert {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
  module: AdminModule;
}

interface AdminDashboardProps {
  onNavigate: (module: AdminModule) => void;
}

export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalCredits: 0,
    totalCompanies: 0,
    pendingDuplicates: 0,
    inactiveAlerts: 0,
    recentLeads: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Parallel fetches for better performance
      const [
        usersResult,
        creditsResult,
        companiesResult,
        duplicatesResult,
        leadsResult
      ] = await Promise.all([
        supabase.from('profiles').select('id, is_active', { count: 'exact' }),
        supabase.from('user_credits').select('credits_balance'),
        supabase.from('companies').select('id', { count: 'exact' }),
        supabase.from('activate_leads_duplicates').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabase.from('activate_leads').select('id', { count: 'exact' }).gte('created_at', subDays(new Date(), 7).toISOString())
      ]);

      const totalUsers = usersResult.count || 0;
      const activeUsers = usersResult.data?.filter(u => u.is_active !== false).length || 0;
      const inactiveUsers = totalUsers - activeUsers;
      const totalCredits = creditsResult.data?.reduce((sum, c) => sum + (c.credits_balance || 0), 0) || 0;
      const totalCompanies = companiesResult.count || 0;
      const pendingDuplicates = duplicatesResult.count || 0;
      const recentLeads = leadsResult.count || 0;

      // Check for inactive users (no lead requests in last 3 days)
      const { count: inactiveCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .eq('is_active', true)
        .not('id', 'in', 
          supabase
            .from('lead_requests')
            .select('user_id')
            .gte('requested_at', subDays(new Date(), 3).toISOString())
        );

      setStats({
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalCredits,
        totalCompanies,
        pendingDuplicates,
        inactiveAlerts: inactiveCount || 0,
        recentLeads,
      });

      // Build alerts
      const newAlerts: Alert[] = [];

      if (pendingDuplicates > 0) {
        newAlerts.push({
          id: 'duplicates',
          type: 'warning',
          title: `${pendingDuplicates} duplicatas pendentes`,
          description: 'Leads duplicados precisam de revisão',
          module: 'operations',
          actionLabel: 'Revisar',
        });
      }

      if (inactiveUsers > 0) {
        newAlerts.push({
          id: 'inactive',
          type: 'danger',
          title: `${inactiveUsers} usuários inativos`,
          description: 'Usuários desativados no sistema',
          module: 'people',
          actionLabel: 'Ver usuários',
        });
      }

      if ((inactiveCount || 0) > 0) {
        newAlerts.push({
          id: 'no-activity',
          type: 'info',
          title: `${inactiveCount} sem atividade`,
          description: 'Usuários não retiraram leads recentemente',
          module: 'people',
          actionLabel: 'Verificar',
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Usuários',
      value: stats.totalUsers,
      subValue: `${stats.activeUsers} ativos`,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      textColor: 'text-blue-700 dark:text-blue-300',
      module: 'people' as AdminModule,
    },
    {
      label: 'Créditos Total',
      value: stats.totalCredits,
      subValue: 'Em circulação',
      icon: Coins,
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      textColor: 'text-emerald-700 dark:text-emerald-300',
      module: 'operations' as AdminModule,
    },
    {
      label: 'Empresas',
      value: stats.totalCompanies,
      subValue: 'Cadastradas',
      icon: Building2,
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-50 dark:bg-violet-950/30',
      textColor: 'text-violet-700 dark:text-violet-300',
      module: 'people' as AdminModule,
    },
    {
      label: 'Leads Recentes',
      value: stats.recentLeads,
      subValue: 'Últimos 7 dias',
      icon: Zap,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
      textColor: 'text-amber-700 dark:text-amber-300',
      module: 'operations' as AdminModule,
    },
  ];

  const quickActions = [
    { label: 'Gerenciar Créditos', icon: Coins, module: 'operations' as AdminModule },
    { label: 'Ver Usuários', icon: Users, module: 'people' as AdminModule },
    { label: 'Configurar Alertas', icon: Bell, module: 'operations' as AdminModule },
    { label: 'Avisos do Sistema', icon: Activity, module: 'system' as AdminModule },
  ];

  return (
    <div className="space-y-6 px-4 md:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do sistema
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchDashboardData}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Atenção Necessária
          </h2>
          <div className="grid gap-3">
            {alerts.map((alert, index) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={cn(
                  "border-l-4 transition-all hover:shadow-md active:shadow-sm",
                  alert.type === 'danger' && "border-l-destructive bg-destructive/5",
                  alert.type === 'warning' && "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
                  alert.type === 'info' && "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                )}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                          alert.type === 'danger' && "bg-destructive/10 text-destructive",
                          alert.type === 'warning' && "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                          alert.type === 'info' && "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                        )}>
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{alert.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{alert.description}</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onNavigate(alert.module)}
                        className="shrink-0"
                      >
                        {alert.actionLabel}
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className={cn(
                "cursor-pointer transition-all hover:shadow-md active:scale-[0.98]",
                stat.bgColor
              )}
              onClick={() => onNavigate(stat.module)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className={cn("text-xs font-medium", stat.textColor)}>
                      {stat.label}
                    </p>
                    <p className={cn("text-2xl md:text-3xl font-bold mt-1", stat.textColor)}>
                      {loading ? '...' : stat.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {stat.subValue}
                    </p>
                  </div>
                  <div className={cn(
                    "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center",
                    stat.color
                  )}>
                    <stat.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ações Rápidas</CardTitle>
          <CardDescription>Acesse os módulos mais usados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickActions.map((action, index) => (
              <motion.button
                key={action.label}
                onClick={() => onNavigate(action.module)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-all active:scale-[0.98]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <action.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-medium text-center">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Resumo de Atividade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Users className="h-4 w-4 text-emerald-600" />
                </div>
                <span className="text-sm">Usuários ativos</span>
              </div>
              <span className="font-semibold">{stats.activeUsers}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-amber-600" />
                </div>
                <span className="text-sm">Leads distribuídos (7d)</span>
              </div>
              <span className="font-semibold">{stats.recentLeads}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm">Empresas ativas</span>
              </div>
              <span className="font-semibold">{stats.totalCompanies}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Última Atualização
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-2xl font-bold">
                {format(new Date(), "HH:mm", { locale: ptBR })}
              </p>
              <p className="text-sm text-muted-foreground">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={fetchDashboardData}
                disabled={loading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
                Atualizar dados
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
