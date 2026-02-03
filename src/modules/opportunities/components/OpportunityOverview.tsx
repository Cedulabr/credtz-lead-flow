import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Target, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Eye,
  Calendar
} from 'lucide-react';
import { OpportunityStats, PortabilityBreakdown } from '../types';
import { cn } from '@/lib/utils';

interface OpportunityOverviewProps {
  stats: OpportunityStats;
  portabilityBreakdown: PortabilityBreakdown;
  isLoading?: boolean;
}

export function OpportunityOverview({ stats, portabilityBreakdown, isLoading }: OpportunityOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 md:p-6">
              <div className="h-16 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {/* Eligible Now - Primary Action */}
        <Card className="bg-gradient-to-br from-green-500/15 via-green-500/10 to-green-500/5 border-green-500/30 shadow-lg shadow-green-500/10">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-green-700 dark:text-green-400">
                  Elegíveis Agora
                </p>
                <p className="text-2xl md:text-4xl font-bold text-green-600">
                  {stats.eligibleNow}
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Prontos para ação
                </p>
              </div>
              <div className="p-2 md:p-3 rounded-full bg-green-500/20">
                <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Eligible Soon */}
        <Card className="bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-amber-500/5 border-amber-500/30">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-amber-700 dark:text-amber-400">
                  Em Breve
                </p>
                <p className="text-2xl md:text-4xl font-bold text-amber-600">
                  {stats.eligibleIn5Days}
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Próximos 5 dias
                </p>
              </div>
              <div className="p-2 md:p-3 rounded-full bg-amber-500/20">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today */}
        <Card className="bg-gradient-to-br from-blue-500/15 via-blue-500/10 to-blue-500/5 border-blue-500/30">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-blue-700 dark:text-blue-400">
                  Hoje
                </p>
                <p className="text-2xl md:text-4xl font-bold text-blue-600">
                  {stats.eligibleToday}
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Atingem condição
                </p>
              </div>
              <div className="p-2 md:p-3 rounded-full bg-blue-500/20">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Monitored */}
        <Card className="bg-gradient-to-br from-slate-500/15 via-slate-500/10 to-slate-500/5 border-slate-500/30">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-400">
                  Monitorados
                </p>
                <p className="text-2xl md:text-4xl font-bold text-slate-600">
                  {stats.totalMonitored}
                </p>
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  Total contratos
                </p>
              </div>
              <div className="p-2 md:p-3 rounded-full bg-slate-500/20">
                <Eye className="h-5 w-5 md:h-6 md:w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        {/* Portability Insights */}
        <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm md:text-base">Portabilidade</h3>
                <p className="text-xs text-muted-foreground">Regra fixa: 12 parcelas</p>
              </div>
              <Badge className="ml-auto" variant="default">
                {stats.portabilityEligible} elegíveis
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Com 9 parcelas</span>
                <Badge variant="outline">{portabilityBreakdown.parcelas9}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Com 10 parcelas</span>
                <Badge variant="outline">{portabilityBreakdown.parcelas10}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Com 11 parcelas</span>
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  {portabilityBreakdown.parcelas11}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="text-green-700">12+ parcelas (elegíveis)</span>
                <Badge className="bg-green-500">
                  {portabilityBreakdown.parcelas12Plus}
                </Badge>
              </div>

              {portabilityBreakdown.reachingIn5Days > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-amber-100 dark:bg-amber-950/50 border border-amber-200">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {portabilityBreakdown.reachingIn5Days} contratos atingem 12 parcelas nos próximos 5 dias
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Refinancing Insights */}
        <Card className="border-2 border-dashed border-violet-500/20 bg-violet-500/5">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <Target className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-semibold text-sm md:text-base">Refinanciamento</h3>
                <p className="text-xs text-muted-foreground">Regra varia por banco</p>
              </div>
              <Badge className="ml-auto bg-violet-500">
                {stats.refinancingEligible} elegíveis
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-violet-100/50 dark:bg-violet-950/30 text-sm">
                <p className="text-violet-800 dark:text-violet-300">
                  Cada banco possui regra própria de parcelas mínimas. O sistema aplica automaticamente a regra correta baseada no cadastro administrativo.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-lg font-bold text-violet-600">{stats.eligibleIn3Days}</p>
                  <p className="text-xs text-muted-foreground">Em 3 dias</p>
                </div>
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-lg font-bold text-violet-600">{stats.eligibleIn5Days}</p>
                  <p className="text-xs text-muted-foreground">Em 5 dias</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
