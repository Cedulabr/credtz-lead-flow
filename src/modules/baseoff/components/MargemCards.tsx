import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { 
  Wallet, 
  Calculator, 
  Percent, 
  CreditCard, 
  Gift 
} from 'lucide-react';
import { formatCurrency } from '../utils';
import { BaseOffContract } from '../types';
import { cn } from '@/lib/utils';

interface MargemCardsProps {
  mr?: number | null;
  baseCalculo?: number | null;
  margemCartao?: number | null;
  cartaoBeneficio?: number | null;
  contracts?: BaseOffContract[];
  esp?: string | null;
}

// Card types that represent RMC/RCC (tipos de cartão consignado)
const CARD_TYPES = ['4', '5', '6', '7', '12', '13'];

function isCardContract(tipoEmprestimo: string | null): boolean {
  if (!tipoEmprestimo) return false;
  return CARD_TYPES.includes(tipoEmprestimo.trim());
}

export function MargemCards({ 
  mr, 
  baseCalculo, 
  margemCartao, 
  cartaoBeneficio,
  contracts = [],
  esp,
}: MargemCardsProps) {
  const calculations = useMemo(() => {
    // LOAS/BPC (espécies 87, 88) use 30%, others use 35%
    const isLOAS = esp === '87' || esp === '88';
    const factor = isLOAS ? 0.30 : 0.35;
    
    // Gross margin
    const margemBruta = mr ? mr * factor : null;
    
    // Sum installments of regular consignado loans (tipo 98 or non-card types)
    const totalParcelasEmprestimo = contracts
      .filter(c => !isCardContract(c.tipo_emprestimo))
      .reduce((sum, c) => sum + (c.vl_parcela || 0), 0);
    
    // Sum installments of card contracts (RMC/RCC)
    const totalParcelasCartao = contracts
      .filter(c => isCardContract(c.tipo_emprestimo))
      .reduce((sum, c) => sum + (c.vl_parcela || 0), 0);
    
    // Net margin = gross - loan installments
    const margemLivre = margemBruta !== null ? Math.max(0, margemBruta - totalParcelasEmprestimo) : null;
    
    // RMC available = total RMC limit - card installments
    const rmcDisponivel = margemCartao ? Math.max(0, margemCartao - totalParcelasCartao) : null;
    
    // RCC available = total RCC limit - card installments  
    const rccDisponivel = cartaoBeneficio ? Math.max(0, cartaoBeneficio - totalParcelasCartao) : null;
    
    return {
      margemBruta,
      margemLivre,
      rmcDisponivel,
      rccDisponivel,
      factor,
      isLOAS,
      totalParcelasEmprestimo,
    };
  }, [mr, margemCartao, cartaoBeneficio, contracts, esp]);

  const margensConfig = [
    { 
      label: 'MR', 
      emoji: '💰',
      value: mr,
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      textColor: 'text-green-700 dark:text-green-400',
    },
    { 
      label: 'Base de Cálculo', 
      emoji: '💰',
      value: baseCalculo,
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
      textColor: 'text-blue-700 dark:text-blue-400',
    },
    { 
      label: `Margem ${calculations.isLOAS ? '30%' : '35%'} Livre`,
      emoji: '📊',
      value: calculations.margemLivre,
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
      textColor: 'text-purple-700 dark:text-purple-400',
    },
    { 
      label: 'RMC Disponível', 
      emoji: '💳',
      value: calculations.rmcDisponivel,
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
      textColor: 'text-indigo-700 dark:text-indigo-400',
    },
    { 
      label: 'RCC Disponível', 
      emoji: '🎁',
      value: calculations.rccDisponivel,
      bgColor: 'bg-pink-50 dark:bg-pink-950/30',
      textColor: 'text-pink-700 dark:text-pink-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {margensConfig.map(({ label, emoji, value, bgColor, textColor }) => (
        <Card 
          key={label} 
          className={cn(
            "p-4 text-center border-2 transition-all hover:scale-105",
            value ? bgColor : "bg-muted/30"
          )}
        >
          <span className="text-2xl mb-2 block">{emoji}</span>
          <p className={cn(
            "text-2xl font-bold mb-1",
            value ? textColor : "text-muted-foreground"
          )}>
            {value !== null && value !== undefined ? formatCurrency(value) : '---'}
          </p>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </Card>
      ))}
    </div>
  );
}
