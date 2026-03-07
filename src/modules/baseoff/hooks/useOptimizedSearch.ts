import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BaseOffClient, ClientStatus } from '../types';
import { toast } from 'sonner';

export interface SearchResult {
  clients: BaseOffClient[];
  totalCount: number;
  isLoading: boolean;
  hasSearched: boolean;
  matchType: string | null;
}

export interface UseOptimizedSearchOptions {
  debounceMs?: number;
  pageSize?: number;
}

export function useOptimizedSearch(options: UseOptimizedSearchOptions = {}) {
  const { debounceMs = 400, pageSize = 50 } = options;

  const [clients, setClients] = useState<BaseOffClient[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [matchType, setMatchType] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef<string>('');

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const search = useCallback(async (
    query: string,
    page: number = 0,
    immediate: boolean = false
  ) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortControllerRef.current) abortControllerRef.current.abort();

    if (!query.trim()) {
      setClients([]);
      setTotalCount(0);
      setHasSearched(false);
      setMatchType(null);
      return;
    }

    lastQueryRef.current = query;

    const executeSearch = async () => {
      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        const offset = page * pageSize;

        const { data, error } = await supabase.functions.invoke('baseoff-external-query', {
          body: {
            search_term: query.trim(),
            search_limit: pageSize,
            search_offset: offset,
          },
        });

        if (error) throw error;

        const results = data || [];

        // Spread all fields from API, only compute status
        const transformedClients: BaseOffClient[] = results.map((row: any) => {
          let status: ClientStatus = 'simulado';
          if (row.status_beneficio) {
            const statusLower = row.status_beneficio.toLowerCase();
            if (statusLower.includes('ativo') || statusLower.includes('elegivel')) {
              status = 'ativo';
            } else if (statusLower.includes('finalizado') || statusLower.includes('cessado')) {
              status = 'finalizado';
            } else if (statusLower.includes('analise')) {
              status = 'em_analise';
            }
          }

          return {
            ...row,
            status,
            total_contracts: row.contratos?.length || row.contracts?.length || row.total_contracts || 0,
            contracts: row.contracts || [],
            contratos: row.contratos || [],
            telefones: row.telefones || [],
            credit_opportunities: row.credit_opportunities || null,
          };
        });

        setClients(transformedClients);
        setTotalCount(results?.[0]?.total_count || transformedClients.length);
        setCurrentPage(page);
        setHasSearched(true);

        if (results.length > 0) {
          setMatchType(results[0].match_type);
        }

        if (transformedClients.length === 0) {
          toast.info('Nenhum cliente encontrado');
        } else {
          const matchLabel = {
            cpf: 'CPF',
            nb: 'Número do Benefício',
            telefone: 'Telefone',
            nome: 'Nome'
          }[results?.[0]?.match_type] || 'busca';
          toast.success(`${transformedClients.length} cliente(s) encontrado(s) por ${matchLabel}`);
        }

      } catch (error: any) {
        if (error.name === 'AbortError') return;
        console.error('Search error:', error);
        toast.error('Erro ao buscar clientes');
      } finally {
        setIsLoading(false);
      }
    };

    if (immediate) {
      executeSearch();
    } else {
      debounceRef.current = setTimeout(executeSearch, debounceMs);
    }
  }, [debounceMs, pageSize]);

  const nextPage = useCallback(() => {
    if ((currentPage + 1) * pageSize < totalCount && lastQueryRef.current) {
      search(lastQueryRef.current, currentPage + 1, true);
    }
  }, [currentPage, pageSize, totalCount, search]);

  const previousPage = useCallback(() => {
    if (currentPage > 0 && lastQueryRef.current) {
      search(lastQueryRef.current, currentPage - 1, true);
    }
  }, [currentPage, search]);

  const reset = useCallback(() => {
    setClients([]);
    setTotalCount(0);
    setHasSearched(false);
    setMatchType(null);
    setCurrentPage(0);
    lastQueryRef.current = '';
  }, []);

  return {
    clients,
    totalCount,
    isLoading,
    hasSearched,
    matchType,
    currentPage,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
    search,
    nextPage,
    previousPage,
    reset,
  };
}
