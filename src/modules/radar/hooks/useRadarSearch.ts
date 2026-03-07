import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RadarFilters, RadarSearchResult, RadarStats } from '../types';
import { toast } from 'sonner';

export function useRadarSearch() {
  const [results, setResults] = useState<RadarSearchResult | null>(null);
  const [stats, setStats] = useState<RadarStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [filters, setFilters] = useState<RadarFilters>({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('radar-opportunities', {
        body: { mode: 'stats' },
      });
      if (error) throw error;
      setStats(data.stats);
    } catch (err: any) {
      console.error('Stats error:', err);
      toast.error('Erro ao carregar estatísticas do radar');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const search = useCallback(async (searchFilters?: RadarFilters, searchPage?: number, searchPerPage?: number) => {
    const activeFilters = searchFilters ?? filters;
    const activePage = searchPage ?? page;
    const activePerPage = searchPerPage ?? perPage;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('radar-opportunities', {
        body: {
          filters: activeFilters,
          page: activePage,
          per_page: activePerPage,
          mode: 'search',
        },
      });
      if (error) throw error;
      setResults(data);
      setFilters(activeFilters);
      setPage(activePage);
      setPerPage(activePerPage);
    } catch (err: any) {
      console.error('Search error:', err);
      toast.error('Erro ao buscar oportunidades');
    } finally {
      setLoading(false);
    }
  }, [filters, page, perPage]);

  const applySmartFilter = useCallback((smartFilterId: string) => {
    const newFilters: RadarFilters = { smart_filter: smartFilterId };
    setPage(1);
    search(newFilters, 1);
  }, [search]);

  const clearFilters = useCallback(() => {
    setFilters({});
    setResults(null);
    setPage(1);
  }, []);

  return {
    results,
    stats,
    loading,
    statsLoading,
    filters,
    page,
    perPage,
    setFilters,
    setPage,
    setPerPage,
    fetchStats,
    search,
    applySmartFilter,
    clearFilters,
  };
}
