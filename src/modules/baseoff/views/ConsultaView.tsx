import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, RefreshCw, AlertCircle, Users, CreditCard, Hash, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BaseOffClient, BaseOffFilters, DEFAULT_FILTERS, DashboardStats, ClientStatus } from '../types';
import { ClienteCard } from '../components/ClienteCard';
import { SummaryCards } from '../components/SummaryCards';
import { FiltersDrawer } from '../components/FiltersDrawer';
import { ConsultaSearch } from '../components/ConsultaSearch';
import { getDateRange } from '../utils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ConsultaViewProps {
  onClientSelect: (client: BaseOffClient) => void;
  filters: BaseOffFilters;
  onFiltersChange: (filters: BaseOffFilters) => void;
}

const RECENT_SEARCHES_KEY = 'baseoff_recent_searches';

export function ConsultaView({ onClientSelect, filters, onFiltersChange }: ConsultaViewProps) {
  const [clients, setClients] = useState<BaseOffClient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [availableUFs, setAvailableUFs] = useState<string[]>([]);
  const [availableBancos, setAvailableBancos] = useState<string[]>([]);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading recent searches:', e);
    }
  }, []);

  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 10);
    setRecentSearches(updated);
    try {
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving recent searches:', e);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const stats = useMemo<DashboardStats>(() => {
    return {
      totalClientes: clients.length,
      ativos: clients.filter(c => c.status === 'ativo').length,
      simulados: clients.filter(c => c.status === 'simulado').length,
      vencendo: clients.filter(c => c.status === 'vencendo').length,
    };
  }, [clients]);

  const handleSearch = useCallback(async (query: string, type: 'cpf' | 'nb' | 'nome') => {
    setIsLoading(true);
    setHasSearched(true);
    saveRecentSearch(query);

    try {
      let queryBuilder = supabase
        .from('baseoff_clients')
        .select(`
          id, nb, cpf, nome, data_nascimento, sexo, nome_mae, esp, mr,
          banco_pagto, status_beneficio, municipio, uf,
          tel_cel_1, tel_cel_2, tel_fixo_1, email_1,
          created_at, updated_at
        `)
        .order('updated_at', { ascending: false })
        .limit(100);

      // Apply search based on type
      switch (type) {
        case 'cpf':
          const cleanCPF = query.replace(/\D/g, '');
          queryBuilder = queryBuilder.eq('cpf', cleanCPF);
          break;
        case 'nb':
          queryBuilder = queryBuilder.ilike('nb', `%${query}%`);
          break;
        case 'nome':
          queryBuilder = queryBuilder.ilike('nome', `%${query}%`);
          break;
      }

      const { data, error } = await queryBuilder;

      if (error) throw error;

      // Enrich clients with contract counts
      const clientsWithCounts = await Promise.all(
        (data || []).map(async (client) => {
          const { count } = await supabase
            .from('baseoff_contracts')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

          // Determine status
          let status: ClientStatus = 'simulado';
          if (client.status_beneficio) {
            const statusLower = client.status_beneficio.toLowerCase();
            if (statusLower.includes('ativo') || statusLower.includes('elegivel')) {
              status = 'ativo';
            } else if (statusLower.includes('finalizado') || statusLower.includes('cessado')) {
              status = 'finalizado';
            } else if (statusLower.includes('analise')) {
              status = 'em_analise';
            }
          }

          return {
            ...client,
            total_contracts: count || 0,
            status,
          } as BaseOffClient;
        })
      );

      setClients(clientsWithCounts);
      
      if (clientsWithCounts.length === 0) {
        toast.info('Nenhum cliente encontrado');
      } else {
        toast.success(`${clientsWithCounts.length} cliente(s) encontrado(s)`);
      }
    } catch (error: any) {
      console.error('Error searching clients:', error);
      toast.error('Erro ao buscar clientes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const { data: ufData } = await supabase
        .from('baseoff_clients')
        .select('uf')
        .not('uf', 'is', null)
        .order('uf');
      
      const uniqueUFs = [...new Set(ufData?.map(d => d.uf).filter(Boolean) || [])];
      setAvailableUFs(uniqueUFs as string[]);

      const { data: bancoData } = await supabase
        .from('baseoff_clients')
        .select('banco_pagto')
        .not('banco_pagto', 'is', null)
        .order('banco_pagto');
      
      const uniqueBancos = [...new Set(bancoData?.map(d => d.banco_pagto).filter(Boolean) || [])];
      setAvailableBancos(uniqueBancos as string[]);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  }, []);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  return (
    <div className="space-y-6">
      {/* Search Block */}
      <ConsultaSearch
        onSearch={handleSearch}
        isLoading={isLoading}
        recentSearches={recentSearches}
        onClearHistory={clearRecentSearches}
      />

      {/* Dashboard Cards */}
      {hasSearched && <SummaryCards stats={stats} isLoading={isLoading} />}

      {/* Filters Bar */}
      {hasSearched && clients.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span>{clients.length.toLocaleString('pt-BR')} cliente(s) encontrado(s)</span>
            </p>
          </div>
          <FiltersDrawer 
            filters={filters} 
            onFiltersChange={onFiltersChange}
            availableUFs={availableUFs}
            availableBancos={availableBancos}
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
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-xl font-medium mb-2">Faça uma busca</h3>
            <p className="text-muted-foreground">
              Digite CPF, NB ou nome do cliente para consultar
            </p>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground">Tente uma busca diferente.</p>
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
