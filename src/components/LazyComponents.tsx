import React, { lazy, Suspense } from 'react';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader } from './ui/card';

// ── Lazy Modules ──────────────────────────────────────────────────────
// Core
export const Dashboard = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
export const Notifications = lazy(() => import('./Notifications').then(m => ({ default: m.Notifications })));
export const SystemStatus = lazy(() => import('./SystemStatus').then(m => ({ default: m.SystemStatus })));

// Leads & Sales
export const LeadsManagement = lazy(() => import('@/modules/leads-premium/LeadsPremiumModule').then(m => ({ default: m.LeadsPremiumModule })));
export const ActivateLeads = lazy(() => import('./ActivateLeads').then(m => ({ default: m.ActivateLeads })));
export const IndicateClient = lazy(() => import('./IndicateClient').then(m => ({ default: m.IndicateClient })));
export const LeadsIndicados = lazy(() => import('./LeadsIndicados'));
export const SalesWizard = lazy(() => import('@/modules/sales-wizard/SalesWizard').then(m => ({ default: m.SalesWizard })));
export const ProposalGenerator = lazy(() => import('./ProposalGenerator').then(m => ({ default: m.ProposalGenerator })));

// Clients
export const MyClientsList = lazy(() => import('./MyClientsList').then(m => ({ default: m.MyClientsList })));
export const ClientDocuments = lazy(() => import('./ClientDocuments').then(m => ({ default: m.ClientDocuments })));

// Televendas
export const TelevendasModule = lazy(() => import('@/modules/televendas/TelevendasModule').then(m => ({ default: m.TelevendasModule })));

// Base OFF
export const BaseOffModule = lazy(() => import('@/modules/baseoff/BaseOffModule').then(m => ({ default: m.BaseOffModule })));

// Opportunities
export const OpportunitiesModule = lazy(() => import('@/modules/opportunities/OpportunitiesModule').then(m => ({ default: m.OpportunitiesModule })));

// Finance & Commissions
export const FinanceKanban = lazy(() => import('./FinanceKanban').then(m => ({ default: m.FinanceKanban })));
export const CommissionTable = lazy(() => import('./CommissionTable').then(m => ({ default: m.CommissionTable })));
export const Commissions = lazy(() => import('./Commissions').then(m => ({ default: m.Commissions })));

// Admin & Tools
export const AdminPanel = lazy(() => import('./AdminPanel').then(m => ({ default: m.AdminPanel })));
export const TestFunctionalities = lazy(() => import('./TestFunctionalities').then(m => ({ default: m.TestFunctionalities })));

// Performance & Collaboration
export const PerformanceReport = lazy(() => import('./PerformanceReport').then(m => ({ default: m.PerformanceReport })));
export const Collaborative = lazy(() => import('./Collaborative').then(m => ({ default: m.Collaborative })));
export const MyData = lazy(() => import('./MyData').then(m => ({ default: m.MyData })));
export const TimeClock = lazy(() => import('./TimeClock').then(m => ({ default: m.TimeClock })));

// Communication
export const SmsModule = lazy(() => import('@/modules/sms/SmsModule').then(m => ({ default: m.SmsModule || m.default })));
export const WhatsAppConfig = lazy(() => import('./WhatsAppConfig').then(m => ({ default: m.WhatsAppConfig })));
export const MeuNumeroModule = lazy(() => import('@/modules/meu-numero/MeuNumeroModule').then(m => ({ default: m.MeuNumeroModule })));

// Client Reuse
export const ClientReuseAlerts = lazy(() => import('./ClientReuseAlerts').then(m => ({ default: m.ClientReuseAlerts })));

// Radar
export const RadarModule = lazy(() => import('@/modules/radar/RadarModule').then(m => ({ default: m.RadarModule })));

// Base OFF legacy
export const BaseOff = lazy(() => import('./BaseOff').then(m => ({ default: m.BaseOff })));
export const BaseOffModern = lazy(() => import('./BaseOffModern').then(m => ({ default: m.BaseOffModern })));
export const MyClientsKanban = lazy(() => import('./MyClientsKanban').then(m => ({ default: m.MyClientsKanban })));

// ── Loading Skeletons ─────────────────────────────────────────────────
const TableSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

const FormSkeleton = () => (
  <Card>
    <CardHeader>
      <Skeleton className="h-6 w-48" />
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </CardContent>
  </Card>
);

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  </div>
);

// ── HOC for wrapping lazy components with loading states ──────────────
export const withLazyLoading = <P extends Record<string, any>>(
  Component: React.LazyExoticComponent<React.ComponentType<P>>,
  LoadingComponent: React.ComponentType = TableSkeleton
) => {
  return React.forwardRef<any, P>((props, ref) => (
    <Suspense fallback={<LoadingComponent />}>
      <Component {...props} ref={ref} />
    </Suspense>
  ));
};

// ── Pre-configured lazy components with loading states ────────────────
export const LazyDashboard = withLazyLoading(Dashboard, DashboardSkeleton);
export const LazyAdminPanel = withLazyLoading(AdminPanel, FormSkeleton);
export const LazyBaseOff = withLazyLoading(BaseOff, TableSkeleton);
export const LazyBaseOffModern = withLazyLoading(BaseOffModern, TableSkeleton);
export const LazyCommissions = withLazyLoading(Commissions, TableSkeleton);
export const LazyLeadsManagement = withLazyLoading(LeadsManagement, TableSkeleton);
export const LazyLeadsIndicados = withLazyLoading(LeadsIndicados, FormSkeleton);
export const LazyTestFunctionalities = withLazyLoading(TestFunctionalities, FormSkeleton);
export const LazyActivateLeads = withLazyLoading(ActivateLeads, TableSkeleton);
export const LazyClientReuseAlerts = withLazyLoading(ClientReuseAlerts, TableSkeleton);
export const LazyTelevendasModule = withLazyLoading(TelevendasModule, TableSkeleton);
export const LazyMyClientsKanban = withLazyLoading(MyClientsKanban, TableSkeleton);
export const LazyNotifications = withLazyLoading(Notifications, FormSkeleton);
export const LazyIndicateClient = withLazyLoading(IndicateClient, FormSkeleton);
export const LazyFinanceKanban = withLazyLoading(FinanceKanban, TableSkeleton);
export const LazyProposalGenerator = withLazyLoading(ProposalGenerator, FormSkeleton);
export const LazyMyClientsList = withLazyLoading(MyClientsList, TableSkeleton);
export const LazyClientDocuments = withLazyLoading(ClientDocuments, TableSkeleton);
export const LazySalesWizard = withLazyLoading(SalesWizard, FormSkeleton);
export const LazyBaseOffModule = withLazyLoading(BaseOffModule, TableSkeleton);
export const LazyOpportunitiesModule = withLazyLoading(OpportunitiesModule, TableSkeleton);
export const LazyCommissionTable = withLazyLoading(CommissionTable, TableSkeleton);
export const LazyPerformanceReport = withLazyLoading(PerformanceReport, TableSkeleton);
export const LazyCollaborative = withLazyLoading(Collaborative, FormSkeleton);
export const LazyMyData = withLazyLoading(MyData, FormSkeleton);
export const LazyTimeClock = withLazyLoading(TimeClock, TableSkeleton);
export const LazySmsModule = withLazyLoading(SmsModule, TableSkeleton);
export const LazyWhatsAppConfig = withLazyLoading(WhatsAppConfig, FormSkeleton);
export const LazyMeuNumeroModule = withLazyLoading(MeuNumeroModule, FormSkeleton);
export const LazySystemStatus = withLazyLoading(SystemStatus, FormSkeleton);
export const LazyRadarModule = withLazyLoading(RadarModule, TableSkeleton);
