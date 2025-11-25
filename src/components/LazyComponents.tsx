import React, { lazy, Suspense } from 'react';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader } from './ui/card';

// Lazy load heavy components to improve initial bundle size
export const AdminPanel = lazy(() => import('./AdminPanel').then(module => ({ default: module.AdminPanel })));
export const BaseOff = lazy(() => import('./BaseOff').then(module => ({ default: module.BaseOff })));
export const BaseOffModern = lazy(() => import('./BaseOffModern').then(module => ({ default: module.BaseOffModern })));
export const Commissions = lazy(() => import('./Commissions').then(module => ({ default: module.Commissions })));
export const LeadsManagement = lazy(() => import('./LeadsManagement').then(module => ({ default: module.LeadsManagement })));
export const LeadsIndicados = lazy(() => import('./LeadsIndicados'));
export const TestFunctionalities = lazy(() => import('./TestFunctionalities').then(module => ({ default: module.TestFunctionalities })));

// Loading skeleton components for better UX
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

// HOC for wrapping lazy components with appropriate loading states
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

// Pre-configured lazy components with loading states
export const LazyAdminPanel = withLazyLoading(AdminPanel, FormSkeleton);
export const LazyBaseOff = withLazyLoading(BaseOff, TableSkeleton);
export const LazyBaseOffModern = withLazyLoading(BaseOffModern, TableSkeleton);
export const LazyCommissions = withLazyLoading(Commissions, TableSkeleton);
export const LazyLeadsManagement = withLazyLoading(LeadsManagement, TableSkeleton);
export const LazyLeadsIndicados = withLazyLoading(LeadsIndicados, FormSkeleton);
export const LazyTestFunctionalities = withLazyLoading(TestFunctionalities, FormSkeleton);