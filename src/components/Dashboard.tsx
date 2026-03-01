import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { useWhitelabel } from "@/hooks/useWhitelabel";
import { AnimatedContainer } from "./ui/animated-container";
import { SkeletonCard } from "./ui/skeleton-card";
import { ConsultorDashboard } from "./ConsultorDashboard";
import {
  Calendar,
  RefreshCw,
  Building2,
  Zap,
  Phone,
  ShoppingCart,
  FileText,
  MessageSquare,
  Users,
  ClipboardList,
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

interface UserActivity {
  userId: string;
  userName: string;
  leadsPremium: number;
  activateLeads: number;
  televendasPagas: number;
  gestaoTelevendas: number;
  geradorProposta: number;
  smsEnviados: number;
}

interface CompanyActivity {
  companyId: string;
  companyName: string;
  users: UserActivity[];
  totals: Omit<UserActivity, 'userId' | 'userName'>;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { user, profile, isAdmin } = useAuth();
  const { config } = useWhitelabel();
  const isMobile = useIsMobile();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedCompany, setSelectedCompany] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [userCompanyIds, setUserCompanyIds] = useState<string[]>([]);
  const [isGestor, setIsGestor] = useState(false);
  const [showSimpleDashboard, setShowSimpleDashboard] = useState<boolean | null>(null);

  const [companyActivities, setCompanyActivities] = useState<CompanyActivity[]>([]);

  const userName = profile?.name || user?.email?.split('@')[0] || 'Usuário';
  const companyName = config?.company_name || 'Easyn';

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
        setShowSimpleDashboard(!isAdmin && !userIsGestor);

        let companyList = (data || [])
          .filter(uc => uc.companies)
          .map(uc => ({ id: uc.company_id, name: (uc.companies as any).name }));

        if (isAdmin) {
          const { data: allCompanies } = await supabase
            .from('companies')
            .select('id, name')
            .eq('is_active', true)
            .order('name');
          companyList = allCompanies || [];
        }
        setCompanies(companyList);
      } catch (error) {
        console.error('Error fetching user companies:', error);
        if (!isAdmin) setShowSimpleDashboard(true);
      }
    };
    fetchUserCompanies();
  }, [user?.id, isAdmin]);

  // Main data fetch
  useEffect(() => {
    if (user && showSimpleDashboard === false) {
      fetchActivityData();
    }
  }, [user, isAdmin, isGestor, selectedMonth, selectedCompany, userCompanyIds, showSimpleDashboard]);

  const getDateRange = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    return { startDate, endDate };
  };

  const getVisibleCompanyIds = (): string[] => {
    if (selectedCompany !== 'all') return [selectedCompany];
    if (isAdmin) return companies.map(c => c.id);
    return userCompanyIds;
  };

  const fetchActivityData = async () => {
    setIsRefreshing(true);
    try {
      const { startDate, endDate } = getDateRange();
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      const visibleCompanyIds = getVisibleCompanyIds();

      if (visibleCompanyIds.length === 0) {
        setCompanyActivities([]);
        setIsRefreshing(false);
        return;
      }

      // 1. Get all users from visible companies
      const { data: companyUsers } = await supabase
        .from('user_companies')
        .select('user_id, company_id')
        .in('company_id', visibleCompanyIds)
        .eq('is_active', true);

      const allUserIds = [...new Set((companyUsers || []).map(cu => cu.user_id))];
      if (allUserIds.length === 0) {
        setCompanyActivities([]);
        setIsRefreshing(false);
        return;
      }

      // 2. Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', allUserIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p.name || p.email?.split('@')[0] || 'Usuário']));

      // 3. Parallel queries for all modules
      // Build queries separately to avoid TS2589 deep instantiation
      const leadsQuery = supabase.from('leads').select('assigned_to')
        .in('assigned_to', allUserIds).neq('status', 'new_lead')
        .gte('created_at', startISO).lte('created_at', endISO);
      const activateQuery = supabase.from('activate_leads').select('assigned_to')
        .in('assigned_to', allUserIds).neq('status', 'novo')
        .gte('created_at', startISO).lte('created_at', endISO);
      const tvPagasQuery = supabase.from('televendas').select('user_id')
        .in('user_id', allUserIds).eq('status', 'pago')
        .gte('created_at', startISO).lte('created_at', endISO);
      const tvTotalQuery = supabase.from('televendas').select('user_id')
        .in('user_id', allUserIds)
        .gte('created_at', startISO).lte('created_at', endISO);
      const propostasQuery = supabase.from('propostas').select('created_by_id')
        .in('created_by_id', allUserIds)
        .gte('created_at', startISO).lte('created_at', endISO);
      const smsQuery = (supabase.from('sms_history').select('user_id') as any)
        .in('user_id', allUserIds).eq('status', 'sent')
        .gte('created_at', startISO).lte('created_at', endISO);

      const [leadsRes, activateRes, tvPagasRes, tvTotalRes, propostasRes, smsRes] = await Promise.all([
        leadsQuery, activateQuery, tvPagasQuery, tvTotalQuery, propostasQuery, smsQuery,
      ]);

      // 4. Count per user using Maps
      const countByUser = (data: any[] | null, field: string) => {
        const map = new Map<string, number>();
        (data || []).forEach(row => {
          const uid = row[field];
          if (uid) map.set(uid, (map.get(uid) || 0) + 1);
        });
        return map;
      };

      const leadsMap = countByUser(leadsRes.data, 'assigned_to');
      const activateMap = countByUser(activateRes.data, 'assigned_to');
      const tvPagasMap = countByUser(tvPagasRes.data, 'user_id');
      const tvTotalMap = countByUser(tvTotalRes.data, 'user_id');
      const propostasMap = countByUser(propostasRes.data, 'created_by_id');
      const smsMap = countByUser(smsRes.data, 'user_id');

      // 5. Build company activities
      const companyMap = new Map<string, string>();
      companies.forEach(c => companyMap.set(c.id, c.name));

      const activitiesByCompany = new Map<string, UserActivity[]>();

      (companyUsers || []).forEach(cu => {
        const uid = cu.user_id;
        const cid = cu.company_id;
        if (!activitiesByCompany.has(cid)) activitiesByCompany.set(cid, []);

        // Avoid duplicates
        const existing = activitiesByCompany.get(cid)!;
        if (existing.find(u => u.userId === uid)) return;

        existing.push({
          userId: uid,
          userName: profileMap.get(uid) || 'Usuário',
          leadsPremium: leadsMap.get(uid) || 0,
          activateLeads: activateMap.get(uid) || 0,
          televendasPagas: tvPagasMap.get(uid) || 0,
          gestaoTelevendas: tvTotalMap.get(uid) || 0,
          geradorProposta: propostasMap.get(uid) || 0,
          smsEnviados: smsMap.get(uid) || 0,
        });
      });

      const result: CompanyActivity[] = [];
      for (const [cid, users] of activitiesByCompany) {
        const totals = users.reduce(
          (acc, u) => ({
            leadsPremium: acc.leadsPremium + u.leadsPremium,
            activateLeads: acc.activateLeads + u.activateLeads,
            televendasPagas: acc.televendasPagas + u.televendasPagas,
            gestaoTelevendas: acc.gestaoTelevendas + u.gestaoTelevendas,
            geradorProposta: acc.geradorProposta + u.geradorProposta,
            smsEnviados: acc.smsEnviados + u.smsEnviados,
          }),
          { leadsPremium: 0, activateLeads: 0, televendasPagas: 0, gestaoTelevendas: 0, geradorProposta: 0, smsEnviados: 0 }
        );
        result.push({
          companyId: cid,
          companyName: companyMap.get(cid) || 'Empresa',
          users: users.sort((a, b) => {
            const totalA = a.leadsPremium + a.activateLeads + a.televendasPagas + a.gestaoTelevendas + a.geradorProposta + a.smsEnviados;
            const totalB = b.leadsPremium + b.activateLeads + b.televendasPagas + b.gestaoTelevendas + b.geradorProposta + b.smsEnviados;
            return totalB - totalA;
          }),
          totals,
        });
      }

      setCompanyActivities(result.sort((a, b) => a.companyName.localeCompare(b.companyName)));
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const monthOptions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const months = [];
    const startYear = 2025;
    const startMonth = 11;
    for (let y = startYear; y <= currentYear; y++) {
      const mStart = y === startYear ? startMonth : 0;
      const mEnd = y === currentYear ? currentMonth : 11;
      for (let m = mStart; m <= mEnd; m++) {
        const date = new Date(y, m, 1);
        const value = `${y}-${String(m + 1).padStart(2, '0')}`;
        const label = format(date, 'MMMM yyyy', { locale: ptBR });
        months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
      }
    }
    return months.reverse();
  }, []);

  // Global totals
  const globalTotals = useMemo(() => {
    return companyActivities.reduce(
      (acc, ca) => ({
        leadsPremium: acc.leadsPremium + ca.totals.leadsPremium,
        activateLeads: acc.activateLeads + ca.totals.activateLeads,
        televendasPagas: acc.televendasPagas + ca.totals.televendasPagas,
        gestaoTelevendas: acc.gestaoTelevendas + ca.totals.gestaoTelevendas,
        geradorProposta: acc.geradorProposta + ca.totals.geradorProposta,
        smsEnviados: acc.smsEnviados + ca.totals.smsEnviados,
      }),
      { leadsPremium: 0, activateLeads: 0, televendasPagas: 0, gestaoTelevendas: 0, geradorProposta: 0, smsEnviados: 0 }
    );
  }, [companyActivities]);

  // Conditional rendering
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

  const summaryCards = [
    { label: 'Leads Premium', value: globalTotals.leadsPremium, icon: Zap, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Activate Leads', value: globalTotals.activateLeads, icon: Phone, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Televendas Pagas', value: globalTotals.televendasPagas, icon: ShoppingCart, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Gestão Televendas', value: globalTotals.gestaoTelevendas, icon: ClipboardList, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30' },
    { label: 'Propostas Geradas', value: globalTotals.geradorProposta, icon: FileText, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' },
    { label: 'SMS Enviados', value: globalTotals.smsEnviados, icon: MessageSquare, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30' },
  ];

  return (
    <AnimatedContainer animation="fade" className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4">
          <div className="flex items-center gap-3">
            {config?.logo_url ? (
              <img src={config.logo_url} alt={companyName} className="h-8 md:h-10 w-auto" />
            ) : (
              <div className="h-8 w-8 md:h-10 md:w-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="h-4 w-4 md:h-6 md:w-6 text-primary-foreground" />
              </div>
            )}
            <div>
              <h1 className="text-base md:text-xl font-bold">{companyName}</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Olá, {userName} 👋</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32 md:w-44 h-9 md:h-10 text-xs md:text-sm bg-muted/50 border-border/50">
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
                <SelectTrigger className="w-28 md:w-40 h-9 md:h-10 text-xs md:text-sm bg-muted/50 border-border/50">
                  <Building2 className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value="all">Todas Empresas</SelectItem>}
                  {companies.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 md:h-10 md:w-10 bg-muted/50 border-border/50"
              onClick={() => fetchActivityData()}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4 md:py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {summaryCards.map((card) => (
            <Card key={card.label} className={`${card.bg} border-none shadow-sm`}>
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                  <span className={`text-xs font-medium ${card.color}`}>{card.label}</span>
                </div>
                <p className={`text-xl md:text-2xl font-bold ${card.color}`}>
                  {isRefreshing ? '...' : card.value.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Activity Tables by Company */}
        {companyActivities.length === 0 && !isRefreshing && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma atividade encontrada no período selecionado.</p>
            </CardContent>
          </Card>
        )}

        {companyActivities.map((company) => (
          <Card key={company.companyId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {company.companyName}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {company.users.length} colaborador{company.users.length !== 1 ? 'es' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 md:p-2">
              {isMobile ? (
                // Mobile: Cards layout
                <div className="space-y-3 p-3">
                  {company.users.map((u) => {
                    const total = u.leadsPremium + u.activateLeads + u.televendasPagas + u.gestaoTelevendas + u.geradorProposta + u.smsEnviados;
                    if (total === 0) return null;
                    return (
                      <div key={u.userId} className="p-3 rounded-lg bg-muted/40 space-y-2">
                        <p className="font-semibold text-sm">{u.userName}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Premium</span><p className="font-bold text-amber-600">{u.leadsPremium}</p></div>
                          <div><span className="text-muted-foreground">Activate</span><p className="font-bold text-blue-600">{u.activateLeads}</p></div>
                          <div><span className="text-muted-foreground">TV Pagas</span><p className="font-bold text-emerald-600">{u.televendasPagas}</p></div>
                          <div><span className="text-muted-foreground">Gestão TV</span><p className="font-bold text-violet-600">{u.gestaoTelevendas}</p></div>
                          <div><span className="text-muted-foreground">Propostas</span><p className="font-bold text-rose-600">{u.geradorProposta}</p></div>
                          <div><span className="text-muted-foreground">SMS</span><p className="font-bold text-sky-600">{u.smsEnviados}</p></div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Company Totals */}
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                    <p className="font-semibold text-sm text-primary">Total</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Premium</span><p className="font-bold">{company.totals.leadsPremium}</p></div>
                      <div><span className="text-muted-foreground">Activate</span><p className="font-bold">{company.totals.activateLeads}</p></div>
                      <div><span className="text-muted-foreground">TV Pagas</span><p className="font-bold">{company.totals.televendasPagas}</p></div>
                      <div><span className="text-muted-foreground">Gestão TV</span><p className="font-bold">{company.totals.gestaoTelevendas}</p></div>
                      <div><span className="text-muted-foreground">Propostas</span><p className="font-bold">{company.totals.geradorProposta}</p></div>
                      <div><span className="text-muted-foreground">SMS</span><p className="font-bold">{company.totals.smsEnviados}</p></div>
                    </div>
                  </div>
                </div>
              ) : (
                // Desktop: Table layout
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Colaborador</TableHead>
                      <TableHead className="text-center">Leads Premium</TableHead>
                      <TableHead className="text-center">Activate Leads</TableHead>
                      <TableHead className="text-center">TV Pagas</TableHead>
                      <TableHead className="text-center">Gestão TV</TableHead>
                      <TableHead className="text-center">Propostas</TableHead>
                      <TableHead className="text-center">SMS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {company.users.map((u) => {
                      const total = u.leadsPremium + u.activateLeads + u.televendasPagas + u.gestaoTelevendas + u.geradorProposta + u.smsEnviados;
                      if (total === 0) return null;
                      return (
                        <TableRow key={u.userId}>
                          <TableCell className="font-medium">{u.userName}</TableCell>
                          <TableCell className="text-center font-semibold text-amber-600">{u.leadsPremium}</TableCell>
                          <TableCell className="text-center font-semibold text-blue-600">{u.activateLeads}</TableCell>
                          <TableCell className="text-center font-semibold text-emerald-600">{u.televendasPagas}</TableCell>
                          <TableCell className="text-center font-semibold text-violet-600">{u.gestaoTelevendas}</TableCell>
                          <TableCell className="text-center font-semibold text-rose-600">{u.geradorProposta}</TableCell>
                          <TableCell className="text-center font-semibold text-sky-600">{u.smsEnviados}</TableCell>
                        </TableRow>
                      );
                    })}
                    {/* Totals row */}
                    <TableRow className="bg-primary/5 font-bold border-t-2">
                      <TableCell>Total</TableCell>
                      <TableCell className="text-center">{company.totals.leadsPremium}</TableCell>
                      <TableCell className="text-center">{company.totals.activateLeads}</TableCell>
                      <TableCell className="text-center">{company.totals.televendasPagas}</TableCell>
                      <TableCell className="text-center">{company.totals.gestaoTelevendas}</TableCell>
                      <TableCell className="text-center">{company.totals.geradorProposta}</TableCell>
                      <TableCell className="text-center">{company.totals.smsEnviados}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AnimatedContainer>
  );
}
