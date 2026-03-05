import React, { useState, Suspense, lazy, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BaseOffFilters, DEFAULT_FILTERS, BaseOffClient } from './types';
import { Database } from 'lucide-react';

const ConsultaView = lazy(() => import('./views/ConsultaView').then(m => ({ default: m.ConsultaView })));
const ClienteDetalheView = lazy(() => import('./views/ClienteDetalheView').then(m => ({ default: m.ClienteDetalheView })));

function LoadingFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
    </div>
  );
}

export function BaseOffModule() {
  const [filters, setFilters] = useState<BaseOffFilters>(DEFAULT_FILTERS);
  const [selectedClient, setSelectedClient] = useState<BaseOffClient | null>(null);
  const [showClientDetail, setShowClientDetail] = useState(false);

  const handleClientSelect = useCallback((client: BaseOffClient) => {
    setSelectedClient(client);
    setShowClientDetail(true);
  }, []);

  const handleBackToList = useCallback(() => {
    setShowClientDetail(false);
    setSelectedClient(null);
  }, []);

  if (showClientDetail && selectedClient) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto px-4">
        <Suspense fallback={<LoadingFallback />}>
          <ClienteDetalheView 
            client={selectedClient} 
            onBack={handleBackToList} 
          />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
          <Database className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Consulta Base OFF</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Centro de Inteligência do Cliente</p>
        </div>
      </div>

      {/* Consulta View directly - no tabs */}
      <Suspense fallback={<LoadingFallback />}>
        <ConsultaView
          filters={filters}
          onFiltersChange={setFilters}
          onClientSelect={handleClientSelect}
        />
      </Suspense>
    </div>
  );
}
