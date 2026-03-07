import React from 'react';
import { Card } from '@/components/ui/card';
import { 
  Wallet, 
  Calculator, 
  Percent, 
  CreditCard, 
  Gift 
} from 'lucide-react';
import { formatCurrency } from '../utils';
import { cn } from '@/lib/utils';

interface MargemCardsProps {
  mr?: number | null;
  baseCalculo?: number | null;
  margem35?: number | null;
  margemCartao?: number | null;
  cartaoBeneficio?: number | null;
}

interface MargemItem {
  key: keyof MargemCardsProps;
  label: string;
  icon: React.ElementType;
  emoji: string;
  bgColor: string;
  textColor: string;
}

const margensConfig: MargemItem[] = [
  { 
    key: 'mr', 
    label: 'MR', 
    icon: Wallet, 
    emoji: '💰',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    textColor: 'text-green-700 dark:text-green-400',
  },
  { 
    key: 'baseCalculo', 
    label: 'Base de Cálculo', 
    icon: Calculator, 
    emoji: '💰',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    textColor: 'text-blue-700 dark:text-blue-400',
  },
  { 
    key: 'margem35', 
    label: 'Margem 35%', 
    icon: Percent, 
    emoji: '📊',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    textColor: 'text-purple-700 dark:text-purple-400',
  },
  { 
    key: 'margemCartao', 
    label: 'Margem Cartão (RMC)', 
    icon: CreditCard, 
    emoji: '💳',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    textColor: 'text-indigo-700 dark:text-indigo-400',
  },
  { 
    key: 'cartaoBeneficio', 
    label: 'Cartão Benefício (RCC)', 
    icon: Gift, 
    emoji: '🎁',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    textColor: 'text-pink-700 dark:text-pink-400',
  },
];

export function MargemCards({ 
  mr, 
  baseCalculo, 
  margem35, 
  margemCartao, 
  cartaoBeneficio 
}: MargemCardsProps) {
  const values: MargemCardsProps = { mr, baseCalculo, margem35, margemCartao, cartaoBeneficio };
  
  const calculatedMargem35 = margem35 ?? (mr ? mr * 0.35 : null);
  const displayValues = { ...values, margem35: calculatedMargem35 };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {margensConfig.map(({ key, label, icon: Icon, emoji, bgColor, textColor }) => {
        const value = displayValues[key];
        return (
          <Card 
            key={key} 
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
              {value ? formatCurrency(value) : '---'}
            </p>
            <p className="text-xs text-muted-foreground font-medium">{label}</p>
          </Card>
        );
      })}
    </div>
  );
}
