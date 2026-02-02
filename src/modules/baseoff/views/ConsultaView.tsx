import React, { useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, AlertCircle, Users } from 'lucide-react';
import { BaseOffClient, BaseOffFilters, DashboardStats } from '../types';
import { ClienteCard } from '../components/ClienteCard';
import { SummaryCards } from '../components/SummaryCards';
import { FiltersDrawer } from '../components/FiltersDrawer';
import { OptimizedSearch } from '../components/OptimizedSearch';
import { useOptimizedSearch } from '../hooks/useOptimizedSearch';

interface ConsultaViewProps {
  onClientSelect: (client: BaseOffClient) => void;
  filters: BaseOffFilters;
  onFiltersChange: (filters: BaseOffFilters) => void;
}

export function ConsultaView({ onClientSelect, filters, onFiltersChange }: ConsultaViewProps) {
  const {
    clients,
    totalCount,
    isLoading,
    hasSearched,
    matchType,
    search,
  } = useOptimizedSearch({ debounceMs: 400, pageSize: 50 });

  // Calculate stats from current results
  const stats: DashboardStats = {
    totalClientes: clients.length,
    ativos: clients.filter(c => c.status === 'ativo').length,
    simulados: clients.filter(c => c.status === 'simulado').length,
    vencendo: clients.filter(c => c.status === 'vencendo').length,
  };

  const handleSearch = useCallback((query: string, immediate: boolean = false) => {
    search(query, 0, immediate);
  }, [search]);

  return (
    <div className="space-y-6">
      {/* Optimized Search Component */}
      <OptimizedSearch
        onSearch={handleSearch}
        isLoading={isLoading}
        matchType={matchType}
        totalCount={totalCount}
      />

      {/* Dashboard Cards */}
      {hasSearched && <SummaryCards stats={stats} isLoading={isLoading} />}

      {/* Results Count & Filters */}
      {hasSearched && clients.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-muted-foreground flex items-center gap-2 text-sm sm:text-base">
              <Users className="w-4 h-4" />
              <span>
                {clients.length.toLocaleString('pt-BR')} de {totalCount.toLocaleString('pt-BR')} cliente(s)
              </span>
            </p>
          </div>
          <FiltersDrawer 
            filters={filters} 
            onFiltersChange={onFiltersChange}
            availableUFs={[]}
            availableBancos={[]}
          />
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))
        ) : !hasSearched ? (
          <div className="text-center py-12 sm:py-16">
            <Search className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg sm:text-xl font-medium mb-2">Faça uma busca</h3>
            <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto px-4">
              Digite CPF, Número do Benefício, Telefone ou Nome do cliente.
              <br className="hidden sm:block" />
              <span className="text-xs">A busca inicia automaticamente após 3 caracteres.</span>
            </p>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-base sm:text-lg font-medium">Nenhum cliente encontrado</h3>
            <p className="text-sm text-muted-foreground">Tente uma busca diferente.</p>
          </div>
        ) : (
          clients.map((client) => (
            <ClienteCard 
              key={client.id} 
              client={client} 
              onClick={() => onClientSelect(client)} 
            />
          ))
        )}
      </div>
    </div>
  );
}
