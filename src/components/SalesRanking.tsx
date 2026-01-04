import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Trophy, Medal, Crown, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
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
      const [year, month] = selectedMonth.split('-').map(Number);
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0, 23, 59, 59);

      // Formatar datas para comparação
      const todayStr = format(today, 'yyyy-MM-dd');
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');
      const monthEndStr = format(monthEnd, 'yyyy-MM-dd');

      // Se não temos filtro de empresa, não podemos mostrar ranking
      if (!effectiveCompanyFilter || effectiveCompanyFilter.length === 0) {
        setDailyRanking([]);
        setMonthlyRanking([]);
        setIsLoading(false);
        return;
      }

      // Usar a função RPC segura para buscar o ranking (bypassa RLS e retorna nomes corretamente)
      // A função já retorna user_id, user_name e sales_count ordenados
      const dailyRankingResults: RankingUser[] = [];
      const monthlyRankingResults: RankingUser[] = [];

      // Buscar ranking para cada empresa e combinar
      for (const companyId of effectiveCompanyFilter) {
        // Ranking do dia
        const { data: dailyData, error: dailyError } = await supabase.rpc(
          'get_televendas_sales_ranking',
          {
            p_company_id: companyId,
            p_start_date: todayStr,
            p_end_date: todayStr
          }
        );
        
        if (!dailyError && dailyData) {
          dailyData.forEach((row: { user_id: string; user_name: string; sales_count: number }) => {
            const existing = dailyRankingResults.find(r => r.id === row.user_id);
            if (existing) {
              existing.salesCount += row.sales_count;
            } else {
              dailyRankingResults.push({
                id: row.user_id,
                name: row.user_name || 'Colaborador',
                salesCount: row.sales_count
              });
            }
          });
        }

        // Ranking do mês
        const { data: monthlyData, error: monthlyError } = await supabase.rpc(
          'get_televendas_sales_ranking',
          {
            p_company_id: companyId,
            p_start_date: monthStartStr,
            p_end_date: monthEndStr
          }
        );
        
        if (!monthlyError && monthlyData) {
          monthlyData.forEach((row: { user_id: string; user_name: string; sales_count: number }) => {
            const existing = monthlyRankingResults.find(r => r.id === row.user_id);
            if (existing) {
              existing.salesCount += row.sales_count;
            } else {
              monthlyRankingResults.push({
                id: row.user_id,
                name: row.user_name || 'Colaborador',
                salesCount: row.sales_count
              });
            }
          });
        }
      }

      // Ordenar rankings por quantidade de vendas
      dailyRankingResults.sort((a, b) => b.salesCount - a.salesCount);
      monthlyRankingResults.sort((a, b) => b.salesCount - a.salesCount);

      setDailyRanking(dailyRankingResults);
      setMonthlyRanking(monthlyRankingResults);
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
