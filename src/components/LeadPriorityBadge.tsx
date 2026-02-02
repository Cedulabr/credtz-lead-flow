import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Clock, CheckCircle, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadPriority } from '@/hooks/useLeadPriority';

interface LeadPriorityBadgeProps {
  priority: LeadPriority;
  showAction?: boolean;
  compact?: boolean;
}

export function LeadPriorityBadge({ priority, showAction = false, compact = false }: LeadPriorityBadgeProps) {
  const slaConfig = {
    critico: {
      label: 'SLA Crítico',
      icon: AlertTriangle,
      className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
      dotColor: 'bg-red-500',
    },
    atencao: {
      label: 'Atenção',
      icon: Clock,
      className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
      dotColor: 'bg-amber-500',
    },
    ok: {
      label: 'OK',
      icon: CheckCircle,
      className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
      dotColor: 'bg-emerald-500',
    },
  };

  const config = slaConfig[priority.slaStatus];
  const Icon = config.icon;

  const formatHours = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-1.5">
        {/* SLA Badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                'gap-1 text-xs font-medium',
                config.className,
                compact && 'px-1.5 py-0'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', config.dotColor)} />
              {!compact && <Icon className="w-3 h-3" />}
              {compact ? formatHours(priority.inactivityHours) : config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-semibold">{config.label}</p>
              <p>Idade do lead: {formatHours(priority.ageHours)}</p>
              <p>Sem interação: {formatHours(priority.inactivityHours)}</p>
              <p>Score de prioridade: {priority.score}/100</p>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Priority Score */}
        {!compact && (
          <Badge 
            variant="secondary" 
            className={cn(
              'text-[10px] px-1.5 py-0 font-mono',
              priority.score >= 70 && 'bg-primary/10 text-primary',
              priority.score >= 50 && priority.score < 70 && 'bg-amber-100 text-amber-700',
              priority.score < 50 && 'bg-muted text-muted-foreground'
            )}
          >
            {priority.score}pts
          </Badge>
        )}

        {/* Suggested Action */}
        {showAction && priority.suggestedAction && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                variant="outline" 
                className="gap-1 text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 cursor-help"
              >
                <Lightbulb className="w-3 h-3" />
                <span className="truncate max-w-[120px]">{priority.suggestedAction}</span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Próxima ação sugerida</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// Compact inline version for tables
export function LeadPriorityDot({ slaStatus }: { slaStatus: 'ok' | 'atencao' | 'critico' }) {
  const colors = {
    critico: 'bg-red-500',
    atencao: 'bg-amber-500',
    ok: 'bg-emerald-500',
  };

  return (
    <span 
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        colors[slaStatus],
        slaStatus === 'critico' && 'animate-pulse'
      )} 
    />
  );
}
