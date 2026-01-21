import React, { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, RefreshCw, AlertCircle, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BaseOffClient, BaseOffFilters, DEFAULT_FILTERS, DashboardStats, ClientStatus } from '../types';
import { ClienteCard } from '../components/ClienteCard';
import { SummaryCards } from '../components/SummaryCards';
import { FiltersDrawer } from '../components/FiltersDrawer';
import { getDateRange } from '../utils';
import { toast } from 'sonner';

interface ClientesViewProps {
  onClientSelect: (client: BaseOffClient) => void;
  filters: BaseOffFilters;
  onFiltersChange: (filters: BaseOffFilters) => void;
}

export function ClientesView({ onClientSelect, filters, onFiltersChange }: ClientesViewProps) {
  const [clients, setClients] = useState<BaseOffClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [availableUFs, setAvailableUFs] = useState<string[]>([]);
  const [availableBancos, setAvailableBancos] = useState<string[]>([]);

  const stats = useMemo<DashboardStats>(() => {
    return {
      totalClientes: clients.length,
      ativos: clients.filter(c => c.status === 'ativo').length,
      simulados: clients.filter(c => c.status === 'simulado').length,
      vencendo: clients.filter(c => c.status === 'vencendo').length,
    };
  }, [clients]);

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('baseoff_clients')
        .select(`
          id, nb, cpf, nome, data_nascimento, sexo, nome_mae, esp, mr,
          banco_pagto, status_beneficio, municipio, uf,
          tel_cel_1, tel_cel_2, tel_fixo_1, email_1,
          created_at, updated_at
        `)
        .order('updated_at', { ascending: false })
        .limit(500);

      // Apply date filter
      const { start, end } = getDateRange(filters);
      if (start && end) {
        query = query
          .gte('updated_at', start.toISOString())
          .lte('updated_at', end.toISOString());
      }

      // Apply status filter
      if (filters.status !== 'all') {
        query = query.eq('status_beneficio', filters.status);
      }

      // Apply UF filter
      if (filters.uf !== 'all') {
        query = query.eq('uf', filters.uf);
      }

      // Apply banco filter
      if (filters.banco !== 'all') {
        query = query.eq('banco_pagto', filters.banco);
      }

      // Apply text search
      if (filters.cliente) {
        const searchClean = filters.cliente.replace(/\D/g, '');
        if (searchClean.length === 11) {
          query = query.eq('cpf', searchClean);
        } else {
          query = query.ilike('nome', `%${filters.cliente}%`);
        }
      }

      // Apply phone filter
      if (filters.telefone) {
        const phoneClean = filters.telefone.replace(/\D/g, '');
        query = query.or(`tel_cel_1.ilike.%${phoneClean}%,tel_cel_2.ilike.%${phoneClean}%,tel_fixo_1.ilike.%${phoneClean}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get contract counts for each client
      const clientsWithCounts = await Promise.all(
        (data || []).map(async (client) => {
          const { count } = await supabase
            .from('baseoff_contracts')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

          // Determine status based on contracts and status_beneficio
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
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Fetch available UFs
      const { data: ufData } = await supabase
        .from('baseoff_clients')
        .select('uf')
        .not('uf', 'is', null)
        .order('uf');
      
      const uniqueUFs = [...new Set(ufData?.map(d => d.uf).filter(Boolean) || [])];
      setAvailableUFs(uniqueUFs as string[]);

      // Fetch available bancos
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
  };

  useEffect(() => {
    fetchClients();
  }, [filters]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Local search filter
  const filteredClients = useMemo(() => {
    if (!searchTerm) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(c => 
      c.nome.toLowerCase().includes(term) ||
      c.cpf?.includes(term.replace(/\D/g, '')) ||
      c.tel_cel_1?.includes(term.replace(/\D/g, ''))
    );
  }, [clients, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Dashboard Cards */}
      <SummaryCards stats={stats} isLoading={isLoading} />

      {/* Search & Filters Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, CPF ou telefone..."
            className="pl-10 h-12 text-base rounded-xl"
          />
        </div>
        
        <FiltersDrawer 
          filters={filters} 
          onFiltersChange={onFiltersChange}
          availableUFs={availableUFs}
          availableBancos={availableBancos}
        />
        
        <Button 
          variant="outline" 
          size="icon"
          className="h-12 w-12 rounded-xl shrink-0"
          onClick={fetchClients}
        >
          <RefreshCw className={isLoading ? 'animate-spin' : ''} />
        </Button>
      </div>

      {/* Results Count */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Users className="w-4 h-4" />
        <span className="text-sm">
          {filteredClients.length.toLocaleString('pt-BR')} clientes encontrados
        </span>
      </div>

      {/* Client List */}
      <div className="space-y-3">
        {isLoading ? (
          // Skeleton Loading
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))
        ) : filteredClients.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground">Ajuste os filtros ou importe uma base.</p>
          </div>
        ) : (
          // Client Cards
          filteredClients.map((client) => (
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
