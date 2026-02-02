import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  emoji?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
}

const variantStyles = {
  default: {
    card: 'bg-card border-border',
    icon: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
  },
  primary: {
    card: 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20',
    icon: 'bg-primary/20 text-primary',
    value: 'text-primary',
  },
  success: {
    card: 'bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800',
    icon: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400',
    value: 'text-emerald-700 dark:text-emerald-400',
  },
  warning: {
    card: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800',
    icon: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400',
    value: 'text-amber-700 dark:text-amber-400',
  },
  danger: {
    card: 'bg-gradient-to-br from-rose-50 to-red-50 dark:from-rose-950/30 dark:to-red-950/30 border-rose-200 dark:border-rose-800',
    icon: 'bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400',
    value: 'text-rose-700 dark:text-rose-400',
  },
  info: {
    card: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800',
    icon: 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400',
    value: 'text-blue-700 dark:text-blue-400',
  },
};

export function ResponsiveSummaryCard({
  title,
  value,
  subtitle,
  icon: Icon,
  emoji,
  trend,
  variant = 'default',
  isLoading = false,
  onClick,
  className,
}: SummaryCardProps) {
  const styles = variantStyles[variant];

  if (isLoading) {
    return (
      <Card className={cn('p-3 sm:p-4', className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        'p-3 sm:p-4 transition-all duration-200',
        styles.card,
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Icon/Emoji Container */}
        <div 
          className={cn(
            'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0',
            styles.icon
          )}
        >
          {emoji ? (
            <span className="text-lg sm:text-xl">{emoji}</span>
          ) : Icon ? (
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          ) : null}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title - truncates on small screens */}
          <p className="text-xs sm:text-sm text-muted-foreground truncate" title={title}>
            {title}
          </p>
          
          {/* Value */}
          <p className={cn(
            'text-xl sm:text-2xl font-bold tabular-nums',
            styles.value
          )}>
            {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
          </p>
          
          {/* Subtitle/Trend */}
          {(subtitle || trend) && (
            <div className="flex items-center gap-1 mt-0.5">
              {trend ? (
                <span 
                  className={cn(
                    'text-[10px] sm:text-xs font-medium',
                    trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                  )}
                >
                  {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
                </span>
              ) : (
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Grid wrapper for consistent responsive layouts
export function SummaryCardsGrid({ 
  children, 
  columns = 4,
  className 
}: { 
  children: React.ReactNode; 
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-2 sm:gap-3 md:gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}
