import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldCheck, ShieldAlert, ShieldX, AlertCircle } from 'lucide-react';
import type { AuditFlag, AuditStatus } from './types';
import { auditStatusLabels } from './types';

interface TrustScoreBadgeProps {
  score: number | null;
  status: AuditStatus | null;
  flags?: AuditFlag[] | null;
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function TrustScoreBadge({ 
  score, 
  status, 
  flags, 
  showScore = true,
  size = 'md' 
}: TrustScoreBadgeProps) {
  if (score === null || status === null) {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        N/A
      </Badge>
    );
  }

  const getStatusConfig = () => {
    switch (status) {
      case 'normal':
        return {
          icon: ShieldCheck,
          className: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
          iconClass: 'text-green-600',
        };
      case 'suspicious':
        return {
          icon: ShieldAlert,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-200',
          iconClass: 'text-yellow-600',
        };
      case 'irregular':
        return {
          icon: ShieldX,
          className: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
          iconClass: 'text-red-600',
        };
      default:
        return {
          icon: AlertCircle,
          className: 'bg-muted text-muted-foreground',
          iconClass: 'text-muted-foreground',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const content = (
    <Badge 
      variant="outline" 
      className={`${config.className} ${sizeClasses[size]} flex items-center gap-1 cursor-help`}
    >
      <Icon className={`${iconSizes[size]} ${config.iconClass}`} />
      {showScore && <span>{score}</span>}
      <span className="hidden sm:inline">{auditStatusLabels[status]}</span>
    </Badge>
  );

  if (!flags || flags.length === 0) {
    return content;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">Score: {score}/100</p>
            <p className="text-xs text-muted-foreground">Alertas detectados:</p>
            <ul className="text-xs space-y-0.5">
              {flags.map((flag, idx) => (
                <li key={idx} className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  <span>{flag.label}</span>
                  <span className="text-muted-foreground">({flag.scoreDelta})</span>
                </li>
              ))}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
