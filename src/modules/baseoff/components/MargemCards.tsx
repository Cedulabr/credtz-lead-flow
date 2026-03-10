import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Wallet, 
  Calculator, 
  TrendingUp, 
  CreditCard, 
  Gift 
} from 'lucide-react';
import { formatCurrency } from '../utils';
import { BaseOffContract } from '../types';
import { isCardContract } from './CartoesSection';
import { cn } from '@/lib/utils';

export function MargemCards({ 
  mr, 
  baseCalculo, 
  margemCartao, 
  cartaoBeneficio,
  contracts = [],
  esp,
}: MargemCardsProps) {
  const calculations = useMemo(() => {
    const isLOAS = esp === '87' || esp === '88';
    const factor = isLOAS ? 0.30 : 0.35;
    const margemBruta = mr ? mr * factor : null;
    const totalParcelasEmprestimo = contracts
      .filter(c => !isCardContract(c.tipo_emprestimo))
      .reduce((sum, c) => sum + (c.vl_parcela || 0), 0);
    const totalParcelasCartao = contracts
      .filter(c => isCardContract(c.tipo_emprestimo))
      .reduce((sum, c) => sum + (c.vl_parcela || 0), 0);
    const margemLivre = margemBruta !== null ? Math.max(0, margemBruta - totalParcelasEmprestimo) : null;
    const rmcDisponivel = margemCartao ? Math.max(0, margemCartao - totalParcelasCartao) : null;
    const rccDisponivel = cartaoBeneficio ? Math.max(0, cartaoBeneficio - totalParcelasCartao) : null;
    return { margemBruta, margemLivre, rmcDisponivel, rccDisponivel, factor, isLOAS };
  }, [mr, margemCartao, cartaoBeneficio, contracts, esp]);

  const margensConfig = [
    { 
      label: 'MR', 
      icon: Wallet,
      value: mr,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      bgIcon: 'bg-emerald-100 dark:bg-emerald-900/40',
    },
    { 
      label: 'Base de Cálculo', 
      icon: Calculator,
      value: baseCalculo,
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgIcon: 'bg-blue-100 dark:bg-blue-900/40',
    },
    { 
      label: `Margem ${calculations.isLOAS ? '30%' : '35%'} Livre`,
      icon: TrendingUp,
      value: calculations.margemLivre,
      iconColor: 'text-violet-600 dark:text-violet-400',
      bgIcon: 'bg-violet-100 dark:bg-violet-900/40',
    },
    { 
      label: 'RMC Disponível', 
      icon: CreditCard,
      value: calculations.rmcDisponivel,
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      bgIcon: 'bg-indigo-100 dark:bg-indigo-900/40',
    },
    { 
      label: 'RCC Disponível', 
      icon: Gift,
      value: calculations.rccDisponivel,
      iconColor: 'text-pink-600 dark:text-pink-400',
      bgIcon: 'bg-pink-100 dark:bg-pink-900/40',
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        <TrendingUp className="w-4 h-4" />
        Margens e Indicadores
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {margensConfig.map(({ label, icon: Icon, value, iconColor, bgIcon }) => (
          <Card 
            key={label} 
            className={cn(
              "p-4 shadow-sm transition-all hover:shadow-md",
              !value && "opacity-60"
            )}
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", bgIcon)}>
              <Icon className={cn("w-4.5 h-4.5", iconColor)} />
            </div>
            <p className={cn(
              "text-2xl md:text-3xl font-bold mb-1",
              value ? "text-foreground" : "text-muted-foreground"
            )}>
              {value !== null && value !== undefined ? formatCurrency(value) : '---'}
            </p>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
