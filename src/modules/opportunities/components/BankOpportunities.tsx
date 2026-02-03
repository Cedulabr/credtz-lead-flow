import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Building2, 
  TrendingUp, 
  ChevronRight,
  Clock,
  Users
} from 'lucide-react';
import { OpportunityByBank } from '../types';
import { cn } from '@/lib/utils';

interface BankOpportunitiesProps {
  opportunities: OpportunityByBank[];
  onSelectBank: (bankName: string) => void;
  isLoading?: boolean;
}

export function BankOpportunities({ opportunities, onSelectBank, isLoading }: BankOpportunitiesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  // Find the bank with most opportunities for comparison
  const maxEligible = Math.max(...opportunities.map(b => b.eligibleNow), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Building2 className="h-5 w-5 text-primary" />
            Oportunidades por Banco
          </CardTitle>
          <Badge variant="outline" className="hidden md:inline-flex">
            {opportunities.length} bancos
          </Badge>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">
          Comparação de elegibilidade e potencial por instituição
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {opportunities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum contrato monitorado</p>
          </div>
        ) : (
          opportunities.slice(0, 8).map((bank, index) => {
            const eligiblePercent = (bank.eligibleNow / maxEligible) * 100;
            const hasOpportunities = bank.eligibleNow > 0 || bank.eligibleSoon > 0;

            return (
              <div
                key={bank.bankName}
                className={cn(
                  'p-3 md:p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md',
                  hasOpportunities 
                    ? 'bg-card hover:border-primary/50' 
                    : 'bg-muted/30'
                )}
                onClick={() => onSelectBank(bank.bankName)}
              >
                <div className="flex items-start md:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm md:text-base truncate">
                        {bank.bankName}
                      </span>
                      <Badge variant="outline" className="text-[10px] md:text-xs shrink-0">
                        {bank.ruleMonths}m
                      </Badge>
                    </div>

                    {/* Progress bar showing eligible proportion */}
                    <div className="hidden md:block">
                      <Progress 
                        value={eligiblePercent} 
                        className="h-2 mt-2"
                      />
                    </div>

                    {/* Mobile stats */}
                    <div className="flex items-center gap-3 mt-2 text-xs md:text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">{bank.totalContracts}</span>
                      </div>
                      {bank.potentialValue > 0 && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {formatCurrency(bank.potentialValue)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-4 shrink-0">
                    {/* Eligible Now */}
                    <div className="text-center">
                      <p className={cn(
                        'text-lg md:text-xl font-bold',
                        bank.eligibleNow > 0 ? 'text-green-600' : 'text-muted-foreground'
                      )}>
                        {bank.eligibleNow}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Elegíveis</p>
                    </div>

                    {/* Eligible Soon */}
                    <div className="text-center">
                      <p className={cn(
                        'text-lg md:text-xl font-bold',
                        bank.eligibleSoon > 0 ? 'text-amber-600' : 'text-muted-foreground'
                      )}>
                        {bank.eligibleSoon}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Em breve</p>
                    </div>

                    <ChevronRight className="h-5 w-5 text-muted-foreground hidden md:block" />
                  </div>
                </div>
              </div>
            );
          })
        )}

        {opportunities.length > 8 && (
          <Button variant="ghost" className="w-full text-sm">
            Ver todos os {opportunities.length} bancos
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
