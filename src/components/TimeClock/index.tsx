import { useState, useEffect, useMemo } from 'react';
import {
  Clock, History, Settings as SettingsIcon, CalendarClock, FileText, LayoutDashboard,
  Timer, DollarSign, CalendarOff, Calculator, ShieldAlert, Pencil, ClipboardCheck,
  BarChart3, Lock, ScrollText, Menu, ChevronRight, User, Users, Wallet, ShieldCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ClockButton } from './ClockButton';
import { MyHistory } from './MyHistory';
import { ScheduleManager } from './ScheduleManager';
import { JustificationManager } from './JustificationManager';
import { ManagerDashboard } from './ManagerDashboard';
import { HourBank } from './HourBank';
import { SalaryManager } from './SalaryManager';
import { DayOffManager } from './DayOffManager';
import { DiscountCalculator } from './DiscountCalculator';
import { AuditDashboard } from './AuditDashboard';
import { AdjustmentRequest } from './AdjustmentRequest';
import { AdjustmentReview } from './AdjustmentReview';
import { HRDashboard } from './HRDashboard';
import { ClosurePanel } from './ClosurePanel';
import { AuditTrail } from './AuditTrail';
import { BlockedAccess } from '@/components/BlockedAccess';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  badge?: string;
};

type NavGroup = {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  managerOnly?: boolean;
};

export function TimeClock() {
  const { user, profile, isAdmin } = useAuth();
  const [isGestor, setIsGestor] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<string>('clock');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    if (user) checkUserRole();
  }, [user]);

  const checkUserRole = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_companies')
      .select('company_id, company_role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();
    if (data) {
      setCompanyId(data.company_id);
      setIsGestor(data.company_role === 'gestor');
    }
    setLoading(false);
  };

  const canManage = isAdmin || isGestor;

  // load pending adjustments count for managers (badge)
  useEffect(() => {
    if (!canManage || !companyId) return;
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from('time_clock_adjustment_requests' as any)
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('company_id', companyId);
      if (!cancelled) setPendingCount(count || 0);
    })();
    return () => { cancelled = true; };
  }, [canManage, companyId, active]);

  const groups: NavGroup[] = useMemo(() => {
    const base: NavGroup[] = [
      {
        id: 'pessoal',
        label: 'Meu Ponto',
        icon: User,
        items: [
          { id: 'clock', label: 'Registrar Ponto', icon: Clock, description: 'Bata seu ponto agora' },
          { id: 'history', label: 'Meu Histórico', icon: History, description: 'Veja seus registros' },
          { id: 'justifications', label: 'Justificativas', icon: FileText, description: 'Envie justificativas' },
          { id: 'hourbank', label: 'Banco de Horas', icon: Timer, description: 'Saldo e movimentações' },
          { id: 'adjustments', label: 'Solicitar Ajuste', icon: Pencil, description: 'Corrigir registros' },
        ],
      },
    ];

    if (canManage) {
      base.push(
        {
          id: 'rh',
          label: 'RH & Analytics',
          icon: BarChart3,
          managerOnly: true,
          items: [
            { id: 'hr', label: 'Dashboard RH', icon: BarChart3, description: 'Visão geral e KPIs' },
            { id: 'dashboard', label: 'Painel Operacional', icon: LayoutDashboard, description: 'Tempo real do time' },
          ],
        },
        {
          id: 'gestao',
          label: 'Gestão de Pessoas',
          icon: Users,
          managerOnly: true,
          items: [
            {
              id: 'review',
              label: 'Revisar Ajustes',
              icon: ClipboardCheck,
              description: 'Aprovar ou rejeitar',
              badge: pendingCount > 0 ? String(pendingCount) : undefined,
            },
            { id: 'schedules', label: 'Jornadas', icon: CalendarClock, description: 'Configurar horários' },
            { id: 'dayoffs', label: 'Folgas', icon: CalendarOff, description: 'Gerenciar folgas' },
          ],
        },
        {
          id: 'financeiro',
          label: 'Financeiro',
          icon: Wallet,
          managerOnly: true,
          items: [
            { id: 'salaries', label: 'Salários', icon: DollarSign, description: 'Cadastro salarial' },
            { id: 'discounts', label: 'Descontos', icon: Calculator, description: 'Cálculo de descontos' },
          ],
        },
        {
          id: 'compliance',
          label: 'Auditoria & Compliance',
          icon: ShieldCheck,
          managerOnly: true,
          items: [
            { id: 'closure', label: 'Fechamento', icon: Lock, description: 'Travar período' },
            { id: 'trail', label: 'Trilha de Auditoria', icon: ScrollText, description: 'Histórico de mudanças' },
            { id: 'audit', label: 'Painel de Risco', icon: ShieldAlert, description: 'Inconsistências' },
          ],
        },
      );
    }

    return base;
  }, [canManage, pendingCount]);

  const allItems = useMemo(() => groups.flatMap(g => g.items.map(i => ({ ...i, groupLabel: g.label }))), [groups]);
  const activeItem = allItems.find(i => i.id === active) || allItems[0];

  if (!user) return <BlockedAccess />;
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const renderContent = () => {
    switch (active) {
      case 'clock':
        return (
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <ClockButton userId={user.id} companyId={companyId} />
            </div>
          </div>
        );
      case 'history':
        return <MyHistory userId={user.id} userName={profile?.name || profile?.email || 'Usuário'} isAdmin={canManage} />;
      case 'justifications':
        return <JustificationManager isManager={false} />;
      case 'hourbank':
        return <HourBank />;
      case 'adjustments':
        return <AdjustmentRequest companyId={companyId} />;
      case 'hr':
        return canManage ? <HRDashboard /> : null;
      case 'dashboard':
        return canManage ? <ManagerDashboard /> : null;
      case 'review':
        return canManage ? <AdjustmentReview /> : null;
      case 'schedules':
        return canManage ? <ScheduleManager companyId={companyId} /> : null;
      case 'dayoffs':
        return canManage ? <DayOffManager /> : null;
      case 'salaries':
        return canManage ? <SalaryManager /> : null;
      case 'discounts':
        return canManage ? <DiscountCalculator /> : null;
      case 'closure':
        return canManage ? <ClosurePanel /> : null;
      case 'trail':
        return canManage ? <AuditTrail /> : null;
      case 'audit':
        return canManage ? <AuditDashboard /> : null;
      default:
        return null;
    }
  };

  const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="space-y-6">
      {groups.map(group => {
        const GroupIcon = group.icon;
        return (
          <div key={group.id}>
            <div className="flex items-center gap-2 px-3 mb-2">
              <GroupIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </span>
            </div>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActive(item.id); onNavigate?.(); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all group',
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0', isActive ? '' : 'text-muted-foreground group-hover:text-foreground')} />
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge && (
                      <Badge variant={isActive ? 'secondary' : 'destructive'} className="h-5 px-1.5 text-[10px]">
                        {item.badge}
                      </Badge>
                    )}
                    {isActive && <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Controle de Ponto</h1>
          <p className="text-sm text-muted-foreground">
            {canManage ? 'Gerencie jornadas, ajustes e o RH da empresa' : 'Registre seu ponto e acompanhe seu histórico'}
          </p>
        </div>

        {/* Mobile nav trigger */}
        <div className="lg:hidden flex items-center gap-2 w-full sm:w-auto">
          <Select value={active} onValueChange={setActive}>
            <SelectTrigger className="flex-1 sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[70vh]">
              {groups.map(group => (
                <div key={group.id}>
                  <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </div>
                  {group.items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      <div className="flex items-center gap-2">
                        <item.icon className="h-3.5 w-3.5" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <Badge variant="destructive" className="h-4 px-1 text-[10px] ml-1">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Controle de Ponto</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-lg border bg-card p-4">
            <Sidebar />
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 space-y-4">
          {/* Breadcrumb / context bar */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground border-b pb-3">
            <activeItem.icon className="h-4 w-4" />
            <span>{(activeItem as any).groupLabel}</span>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">{activeItem.label}</span>
            {activeItem.description && (
              <span className="hidden sm:inline ml-2">— {activeItem.description}</span>
            )}
          </div>

          <div>{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
