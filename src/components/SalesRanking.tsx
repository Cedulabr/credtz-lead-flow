import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Trophy, Medal, Crown, TrendingUp, Users } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RankingUser {
  id: string;
  name: string;
  salesCount: number;
}

interface SalesRankingProps {
  companyFilter?: string[] | null;
  selectedMonth: string;
}

export function SalesRanking({ companyFilter, selectedMonth }: SalesRankingProps) {
  const { user, isAdmin } = useAuth();
  const [dailyRanking, setDailyRanking] = useState<RankingUser[]>([]);
  const [monthlyRanking, setMonthlyRanking] = useState<RankingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [effectiveCompanyFilter, setEffectiveCompanyFilter] = useState<string[] | null>(null);

  // Buscar empresas do usuário se não tiver filtro
  useEffect(() => {
    const fetchUserCompanies = async () => {
      if (companyFilter && companyFilter.length > 0) {
        setEffectiveCompanyFilter(companyFilter);
        return;
      }

      if (isAdmin) {
        setEffectiveCompanyFilter(null);
        return;
      }

      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        const companyIds = (data || []).map(uc => uc.company_id);
        setEffectiveCompanyFilter(companyIds.length > 0 ? companyIds : null);
      } catch (error) {
        console.error('Error fetching user companies:', error);
      }
    };

    fetchUserCompanies();
  }, [companyFilter, user?.id, isAdmin]);

  useEffect(() => {
    if (effectiveCompanyFilter !== undefined) {
      fetchRankingData();
    }
  }, [effectiveCompanyFilter, selectedMonth]);

  const fetchRankingData = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const dayStart = startOfDay(today);
      const dayEnd = endOfDay(today);

      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);

      // Formatar datas para comparação (data_venda é string no formato YYYY-MM-DD)
      const todayStr = format(today, 'yyyy-MM-dd');
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

      // Buscar vendas do dia - usando data_venda (data de competência)
      let dailyQuery = supabase
        .from('televendas')
        .select('user_id, company_id, status, data_venda')
        .eq('data_venda', todayStr)
        .eq('status', 'pago');

      if (effectiveCompanyFilter && effectiveCompanyFilter.length > 0) {
        dailyQuery = dailyQuery.in('company_id', effectiveCompanyFilter);
      }

      const { data: dailySales } = await dailyQuery;

      // Buscar vendas do mês - usando data_venda (data de competência)
      let monthlyQuery = supabase
        .from('televendas')
        .select('user_id, company_id, status, data_venda')
        .gte('data_venda', monthStartStr)
        .lte('data_venda', monthEndStr)
        .eq('status', 'pago');

      if (effectiveCompanyFilter && effectiveCompanyFilter.length > 0) {
        monthlyQuery = monthlyQuery.in('company_id', effectiveCompanyFilter);
      }

      const { data: monthlySales } = await monthlyQuery;

      // Coletar todos os user_ids únicos das vendas
      const allUserIds = new Set<string>();
      (dailySales || []).forEach(sale => sale.user_id && allUserIds.add(sale.user_id));
      (monthlySales || []).forEach(sale => sale.user_id && allUserIds.add(sale.user_id));

      // Buscar perfis baseado nos user_ids das vendas (não depende de RLS restritiva)
      let profilesData: { id: string; name: string | null; email: string | null }[] = [];
      
      if (allUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, email')
          .in('id', Array.from(allUserIds));
        profilesData = profiles || [];
      }

      // Criar ranking baseado em quantidade de vendas
      const createRanking = (sales: any[] | null): RankingUser[] => {
        const userMap = new Map<string, RankingUser>();
        
        // Inicializar todos os usuários da empresa com 0 vendas
        profilesData.forEach(p => {
          userMap.set(p.id, {
            id: p.id,
            name: p.name || p.email?.split('@')[0] || 'Usuário',
            salesCount: 0
          });
        });

        // Contar vendas por usuário
        (sales || []).forEach(sale => {
          if (sale.user_id) {
            const existingUser = userMap.get(sale.user_id);
            if (existingUser) {
              existingUser.salesCount++;
            } else {
              // Usuário não encontrado nos perfis, adicionar mesmo assim
              userMap.set(sale.user_id, {
                id: sale.user_id,
                name: 'Usuário',
                salesCount: 1
              });
            }
          }
        });

        // Ordenar por quantidade de vendas (maior para menor)
        return Array.from(userMap.values())
          .filter(u => u.salesCount > 0)
          .sort((a, b) => b.salesCount - a.salesCount);
      };

      setDailyRanking(createRanking(dailySales));
      setMonthlyRanking(createRanking(monthlySales));
    } catch (error) {
      console.error('Error fetching ranking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 0:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">{position + 1}º</span>;
    }
  };

  const getMedalColor = (position: number) => {
    switch (position) {
      case 0:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 1:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 2:
        return 'bg-gradient-to-r from-amber-500 to-amber-700 text-white';
      default:
        return 'bg-muted';
    }
  };

  const RankingCard = ({ 
    title, 
    icon, 
    topUser, 
    ranking,
    emptyMessage 
  }: { 
    title: string; 
    icon: React.ReactNode;
    topUser: RankingUser | null;
    ranking: RankingUser[];
    emptyMessage: string;
  }) => (
    <Card className="border-2 shadow-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {topUser ? (
          <div className="space-y-4">
            {/* Destaque do primeiro lugar */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 border-2 border-primary/20">
              <div className="absolute top-2 right-2">
                <Crown className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-14 w-14 border-2 border-yellow-500 shadow-lg">
                    <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold text-lg">
                      {getInitials(topUser.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full p-1">
                    <Crown className="h-3 w-3 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-foreground truncate">{topUser.name}</p>
                    <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                      🥇 1º Lugar
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium">{topUser.salesCount} {topUser.salesCount === 1 ? 'venda' : 'vendas'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista dos próximos colocados */}
            {ranking.length > 1 && (
              <div className="space-y-2">
                {ranking.slice(1, 5).map((user, index) => (
                  <div 
                    key={user.id} 
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 flex items-center justify-center">
                      {getMedalIcon(index + 1)}
                    </div>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className={`text-xs font-semibold ${getMedalColor(index + 1)}`}>
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{user.salesCount} {user.salesCount === 1 ? 'venda' : 'vendas'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-2 shadow-card">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-20 bg-muted rounded"></div>
              <div className="space-y-2">
                <div className="h-10 bg-muted rounded"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 shadow-card">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-muted rounded w-1/3"></div>
              <div className="h-20 bg-muted rounded"></div>
              <div className="space-y-2">
                <div className="h-10 bg-muted rounded"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const today = format(new Date(), "dd 'de' MMMM", { locale: ptBR });
  const [year, month] = selectedMonth.split('-').map(Number);
  const monthName = format(new Date(year, month - 1), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RankingCard
        title={`🥇 Melhor Vendedor do Dia`}
        icon={<Trophy className="h-5 w-5 text-yellow-500" />}
        topUser={dailyRanking[0] || null}
        ranking={dailyRanking}
        emptyMessage={`Nenhuma venda registrada hoje (${today})`}
      />
      <RankingCard
        title={`🏆 Melhor Vendedor do Mês`}
        icon={<Trophy className="h-5 w-5 text-primary" />}
        topUser={monthlyRanking[0] || null}
        ranking={monthlyRanking}
        emptyMessage={`Nenhuma venda registrada em ${monthName}`}
      />
    </div>
  );
}
