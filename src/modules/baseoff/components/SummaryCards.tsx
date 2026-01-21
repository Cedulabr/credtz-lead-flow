import React from 'react';
import { Card } from '@/components/ui/card';
import { Users, Activity, FileCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { DashboardStats } from '../types';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  stats: DashboardStats;
  isLoading?: boolean;
}

const cards = [
  { 
    key: 'totalClientes' as keyof DashboardStats, 
    label: 'Total Clientes', 
    icon: Users, 
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  { 
    key: 'ativos' as keyof DashboardStats, 
    label: 'Ativos', 
    icon: Activity, 
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  { 
    key: 'simulados' as keyof DashboardStats, 
    label: 'Simulados', 
    icon: FileCheck, 
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  { 
    key: 'vencendo' as keyof DashboardStats, 
    label: 'Vencendo', 
    icon: AlertTriangle, 
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
];

export function SummaryCards({ stats, isLoading }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ key, label, icon: Icon, color, bgColor }) => (
        <Card key={key} className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-xl', bgColor)}>
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{label}</p>
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
              ) : (
                <p className="text-xl font-bold">{stats[key].toLocaleString('pt-BR')}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
