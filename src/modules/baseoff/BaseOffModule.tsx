import React, { useState, Suspense, lazy, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { BaseOffFilters, DEFAULT_FILTERS, BaseOffClient } from './types';
import { Database, Upload, Search, Users } from 'lucide-react';

// Lazy load views for performance
const ConsultaView = lazy(() => import('./views/ConsultaView').then(m => ({ default: m.ConsultaView })));
const ClientesView = lazy(() => import('./views/ClientesView').then(m => ({ default: m.ClientesView })));
const ClienteDetalheView = lazy(() => import('./views/ClienteDetalheView').then(m => ({ default: m.ClienteDetalheView })));
const ImportEngine = lazy(() => import('./views/ImportEngine').then(m => ({ default: m.ImportEngine })));

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
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('consulta');
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

  const handleImportComplete = useCallback(() => {
    // Refresh client list after import
    setFilters({ ...filters });
  }, [filters]);

  // If showing client detail, render the detail view
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
          <h1 className="text-3xl font-bold">Consulta Base OFF</h1>
          <p className="text-muted-foreground">Centro de Inteligência do Cliente</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-14 p-1.5 rounded-2xl bg-muted/50">
          <TabsTrigger value="consulta" className="gap-2 text-base rounded-xl data-[state=active]:bg-background">
            <Search className="w-5 h-5" />
            🔍 Consulta
          </TabsTrigger>
          <TabsTrigger value="clientes" className="gap-2 text-base rounded-xl data-[state=active]:bg-background">
            <Users className="w-5 h-5" />
            👤 Clientes
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="importar" className="gap-2 text-base rounded-xl data-[state=active]:bg-background">
              <Upload className="w-5 h-5" />
              ⬆️ Importar
            </TabsTrigger>
          )}
        </TabsList>

        {/* Consulta Tab */}
        <TabsContent value="consulta" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <ConsultaView
              filters={filters}
              onFiltersChange={setFilters}
              onClientSelect={handleClientSelect}
            />
          </Suspense>
        </TabsContent>

        {/* Clientes Tab */}
        <TabsContent value="clientes" className="mt-6">
          <Suspense fallback={<LoadingFallback />}>
            <ClientesView
              filters={filters}
              onFiltersChange={setFilters}
              onClientSelect={handleClientSelect}
            />
          </Suspense>
        </TabsContent>

        {/* Import Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="importar" className="mt-6">
            <Suspense fallback={<LoadingFallback />}>
              <ImportEngine onJobComplete={handleImportComplete} />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
