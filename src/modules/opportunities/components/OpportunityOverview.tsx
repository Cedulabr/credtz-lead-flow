import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Target, TrendingUp, Clock, AlertTriangle, CheckCircle2, Eye, Calendar,
  FileText, Zap, ArrowRight
} from 'lucide-react';
import { UnifiedStats, OpportunityStats, PortabilityBreakdown } from '../types';
import { cn } from '@/lib/utils';

interface OpportunityOverviewProps {
  stats: OpportunityStats;
  unifiedStats: UnifiedStats;
  portabilityBreakdown: PortabilityBreakdown;
  isLoading?: boolean;
  onNavigateSource?: (source: 'televendas' | 'propostas' | 'leads') => void;
}

export function OpportunityOverview({ stats, unifiedStats, portabilityBreakdown, isLoading, onNavigateSource }: OpportunityOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 md:p-6"><div className="h-16 bg-muted rounded" /></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Unified KPI Cards */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border-primary/30 shadow-lg shadow-primary/10">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-primary">Total Oportunidades</p>
                <p className="text-2xl md:text-4xl font-bold text-primary">{unifiedStats.totalOpportunities}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Todas as fontes</p>
              </div>
              <div className="p-2 md:p-3 rounded-full bg-primary/20">
                <Eye className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/15 via-green-500/10 to-green-500/5 border-green-500/30 shadow-lg shadow-green-500/10">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-green-700 dark:text-green-400">Ação Hoje</p>
                <p className="text-2xl md:text-4xl font-bold text-green-600">{unifiedStats.actionToday}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Prontos + vencidos</p>
              </div>
              <div className="p-2 md:p-3 rounded-full bg-green-500/20">
                <CheckCircle2 className="h-5 w-5 md:h-6 md:w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/15 via-amber-500/10 to-amber-500/5 border-amber-500/30">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-amber-700 dark:text-amber-400">Próximos 5 dias</p>
                <p className="text-2xl md:text-4xl font-bold text-amber-600">{unifiedStats.actionSoon}</p>
                <p className="text-[10px] md:text-xs text-muted-foreground">Em breve</p>
              </div>
              <div className="p-2 md:p-3 rounded-full bg-amber-500/20">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3 Source Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* Block 1: Refinanciamento (Televendas) */}
        <Card className="border-2 border-dashed border-violet-500/30 bg-violet-500/5 hover:border-violet-500/50 transition-colors">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-violet-500/10">
                <TrendingUp className="h-5 w-5 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-base">Refinanciamento</h3>
                <p className="text-xs text-muted-foreground">Televendas pagas</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-lg font-bold text-violet-600">{unifiedStats.televendasTotal}</p>
                  <p className="text-[10px] text-muted-foreground">Monitorados</p>
                </div>
                <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 text-center">
                  <p className="text-lg font-bold text-green-600">{unifiedStats.televendasEligible}</p>
                  <p className="text-[10px] text-muted-foreground">Elegíveis</p>
                </div>
              </div>

              {unifiedStats.televendasSoon > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{unifiedStats.televendasSoon} em breve (5 dias)</span>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Portabilidade elegível</span>
                  <Badge variant="outline" className="text-[10px] h-5">{stats.portabilityEligible}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Refinanciamento elegível</span>
                  <Badge variant="outline" className="text-[10px] h-5">{stats.refinancingEligible}</Badge>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                onClick={() => onNavigateSource?.('televendas')}
              >
                Ver clientes <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Block 2: Contatos Agendados (Propostas) */}
        <Card className="border-2 border-dashed border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50 transition-colors">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-base">Contatos Agendados</h3>
                <p className="text-xs text-muted-foreground">Meus Clientes</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-lg font-bold text-blue-600">{unifiedStats.propostasTotal}</p>
                  <p className="text-[10px] text-muted-foreground">Agendados</p>
                </div>
                <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 text-center">
                  <p className="text-lg font-bold text-green-600">{unifiedStats.propostasToday + unifiedStats.propostasOverdue}</p>
                  <p className="text-[10px] text-muted-foreground">Hoje/Vencidos</p>
                </div>
              </div>

              {unifiedStats.propostasOverdue > 0 && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{unifiedStats.propostasOverdue} contatos vencidos!</span>
                </div>
              )}

              {unifiedStats.propostasSoon > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{unifiedStats.propostasSoon} nos próximos 5 dias</span>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                onClick={() => onNavigateSource?.('propostas')}
              >
                Ver clientes <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Block 3: Leads Quentes */}
        <Card className="border-2 border-dashed border-orange-500/30 bg-orange-500/5 hover:border-orange-500/50 transition-colors">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Zap className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm md:text-base">Leads Quentes</h3>
                <p className="text-xs text-muted-foreground">Leads Premium</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded bg-muted/50 text-center">
                  <p className="text-lg font-bold text-orange-600">{unifiedStats.leadsTotal}</p>
                  <p className="text-[10px] text-muted-foreground">Agendados</p>
                </div>
                <div className="p-2 rounded bg-green-50 dark:bg-green-950/30 text-center">
                  <p className="text-lg font-bold text-green-600">{unifiedStats.leadsToday + unifiedStats.leadsOverdue}</p>
                  <p className="text-[10px] text-muted-foreground">Hoje/Vencidos</p>
                </div>
              </div>

              {unifiedStats.leadsOverdue > 0 && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 p-2 rounded">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>{unifiedStats.leadsOverdue} contatos vencidos!</span>
                </div>
              )}

              {unifiedStats.leadsSoon > 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{unifiedStats.leadsSoon} nos próximos 5 dias</span>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                onClick={() => onNavigateSource?.('leads')}
              >
                Ver clientes <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
