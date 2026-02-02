import React from 'react';
import { Users, Activity, FileCheck, AlertTriangle } from 'lucide-react';
import { DashboardStats } from '../types';
import { ResponsiveSummaryCard, SummaryCardsGrid } from '@/components/ui/responsive-summary-card';

interface SummaryCardsProps {
  stats: DashboardStats;
  isLoading?: boolean;
}

export function SummaryCards({ stats, isLoading }: SummaryCardsProps) {
  return (
    <SummaryCardsGrid columns={4}>
      <ResponsiveSummaryCard
        title="Total Clientes"
        value={stats.totalClientes}
        icon={Users}
        variant="info"
        isLoading={isLoading}
      />
      <ResponsiveSummaryCard
        title="Ativos"
        value={stats.ativos}
        icon={Activity}
        variant="success"
        isLoading={isLoading}
      />
      <ResponsiveSummaryCard
        title="Simulados"
        value={stats.simulados}
        icon={FileCheck}
        variant="warning"
        isLoading={isLoading}
      />
      <ResponsiveSummaryCard
        title="Vencendo"
        value={stats.vencendo}
        icon={AlertTriangle}
        variant="danger"
        isLoading={isLoading}
      />
    </SummaryCardsGrid>
  );
}
