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

  // Cleanup on unmount
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
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!query.trim()) {
      setClients([]);
      setTotalCount(0);
      setHasSearched(false);
      setMatchType(null);
      return;
    }

    const executeSearch = async () => {
      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        const offset = page * pageSize;

        // Call optimized RPC function
        const { data, error } = await supabase
          .rpc('search_baseoff_clients', {
            search_term: query.trim(),
            search_limit: pageSize,
            search_offset: offset
          });

        if (error) throw error;

        // Transform results
        const transformedClients: BaseOffClient[] = (data || []).map((row: any) => {
          // Determine status from status_beneficio
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
            id: row.id,
            nb: row.nb,
            cpf: row.cpf,
            nome: row.nome,
            data_nascimento: row.data_nascimento,
            sexo: row.sexo,
            nome_mae: row.nome_mae,
            esp: row.esp,
            mr: row.mr,
            banco_pagto: row.banco_pagto,
            status_beneficio: row.status_beneficio,
            municipio: row.municipio,
            uf: row.uf,
            tel_cel_1: row.tel_cel_1,
            tel_cel_2: row.tel_cel_2,
            tel_fixo_1: row.tel_fixo_1,
            email_1: row.email_1,
            created_at: row.created_at,
            updated_at: row.updated_at,
            status,
            total_contracts: 0, // Will be fetched on client detail view
          };
        });

        setClients(transformedClients);
        setTotalCount(data?.[0]?.total_count || transformedClients.length);
        setCurrentPage(page);
        setHasSearched(true);

        // Set match type from first result
        if (data && data.length > 0) {
          setMatchType(data[0].match_type);
        }

        if (transformedClients.length === 0) {
          toast.info('Nenhum cliente encontrado');
        } else {
          const matchLabel = {
            cpf: 'CPF',
            nb: 'Número do Benefício',
            telefone: 'Telefone',
            nome: 'Nome'
          }[data?.[0]?.match_type] || 'busca';
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
    if ((currentPage + 1) * pageSize < totalCount) {
      // This would need the last query - you'd store it in a ref
    }
  }, [currentPage, pageSize, totalCount]);

  const previousPage = useCallback(() => {
    if (currentPage > 0) {
      // This would need the last query - you'd store it in a ref
    }
  }, [currentPage]);

  const reset = useCallback(() => {
    setClients([]);
    setTotalCount(0);
    setHasSearched(false);
    setMatchType(null);
    setCurrentPage(0);
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
    reset,
  };
}
