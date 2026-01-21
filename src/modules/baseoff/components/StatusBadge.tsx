import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ClientStatus, STATUS_CONFIG } from '../types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ClientStatus;
  size?: 'sm' | 'md' | 'lg';
  showEmoji?: boolean;
}

export function StatusBadge({ status, size = 'md', showEmoji = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.simulado;
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'font-medium border',
        config.color,
        sizeClasses[size]
      )}
    >
      {showEmoji && <span className="mr-1">{config.emoji}</span>}
      {config.label}
    </Badge>
  );
}
