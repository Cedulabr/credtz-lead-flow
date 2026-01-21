import React, { useState, Suspense, lazy, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { BaseOffFilters, DEFAULT_FILTERS, BaseOffClient } from './types';
import { Database, Upload, Users } from 'lucide-react';

// Lazy load views for performance
const ClientesView = lazy(() => import('./views/ClientesView').then(m => ({ default: m.ClientesView })));
const ClienteTimeline = lazy(() => import('./views/ClienteTimeline').then(m => ({ default: m.ClienteTimeline })));
const ImportEngine = lazy(() => import('./views/ImportEngine').then(m => ({ default: m.ImportEngine })));

function LoadingFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
    </div>
  );
}

export function BaseOffModule() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('clientes');
  const [filters, setFilters] = useState<BaseOffFilters>(DEFAULT_FILTERS);
  const [selectedClient, setSelectedClient] = useState<BaseOffClient | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  const handleClientSelect = useCallback((client: BaseOffClient) => {
    setSelectedClient(client);
    setIsTimelineOpen(true);
  }, []);

  const handleTimelineClose = useCallback(() => {
    setIsTimelineOpen(false);
    setSelectedClient(null);
  }, []);

  const handleImportComplete = useCallback(() => {
    // Refresh client list after import
    setFilters({ ...filters });
  }, [filters]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Database className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Consulta Base OFF</h1>
          <p className="text-muted-foreground">Gestão de clientes e contratos</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-12 p-1 rounded-xl">
          <TabsTrigger value="clientes" className="gap-2 text-base rounded-lg">
            <Users className="w-4 h-4" />
            👤 Clientes
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="importar" className="gap-2 text-base rounded-lg">
              <Upload className="w-4 h-4" />
              ⬆️ Importar
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="clientes" className="mt-4">
          <Suspense fallback={<LoadingFallback />}>
            <ClientesView
              filters={filters}
              onFiltersChange={setFilters}
              onClientSelect={handleClientSelect}
            />
          </Suspense>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="importar" className="mt-4">
            <Suspense fallback={<LoadingFallback />}>
              <ImportEngine onJobComplete={handleImportComplete} />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>

      {/* Client Timeline Modal */}
      <Suspense fallback={null}>
        <ClienteTimeline
          client={selectedClient}
          isOpen={isTimelineOpen}
          onClose={handleTimelineClose}
        />
      </Suspense>
    </div>
  );
}
