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

        // Auto-pad CPF with leading zeros if numeric and < 11 digits
        let searchTerm = query.trim();
        if (/^\d+$/.test(searchTerm) && searchTerm.length < 11) {
          searchTerm = searchTerm.padStart(11, '0');
        }

        const { data, error } = await supabase.functions.invoke('baseoff-external-query', {
          body: {
            search_term: searchTerm,
            search_limit: pageSize,
            search_offset: offset,
          },
        });

        if (error) throw error;

        // Handle both array response and { data: [...] } wrapper
        const results = Array.isArray(data) ? data : (data?.data || data || []);

        // Spread all fields from API, only compute status
        // Resilient: handle both transformed (snake_case) and raw (lowercase) field names
        const transformedClients: BaseOffClient[] = results.map((row: any) => {
          const statusBeneficio = row.status_beneficio || row.statusbeneficio || '';
          let status: ClientStatus = 'simulado';
          if (statusBeneficio) {
            const statusLower = statusBeneficio.toLowerCase();
            if (statusLower.includes('ativo') || statusLower.includes('elegivel')) {
              status = 'ativo';
            } else if (statusLower.includes('finalizado') || statusLower.includes('cessado')) {
              status = 'finalizado';
            } else if (statusLower.includes('analise')) {
              status = 'em_analise';
            }
          }

          // Map raw DB field names to expected names when transformed version is missing
          const nb = row.nb || row.NB || row.numero_beneficio || row.num_beneficio || null;
          const mr = parseFloat(row.mr) || 0;
          const contratos = row.contratos || [];

          return {
            ...row,
            status,
            status_beneficio: statusBeneficio,
            nb,
            mr,
            data_nascimento: row.data_nascimento || row.dtnascimento || null,
            banco_pagto: row.banco_pagto || row.bancopagto || null,
            agencia_pagto: row.agencia_pagto || row.agenciapagto || null,
            orgao_pagador: row.orgao_pagador || row.orgaopagador || null,
            conta_corrente: row.conta_corrente || row.contacorrente || null,
            meio_pagto: row.meio_pagto || row.meiopagto || null,
            banco_rmc: row.banco_rmc || row.bancormc || null,
            valor_rmc: parseFloat(row.valor_rmc || row.valorrmc) || 0,
            banco_rcc: row.banco_rcc || row.bancorcc || null,
            valor_rcc: parseFloat(row.valor_rcc || row.valorrcc) || 0,
            tel_cel_1: row.tel_cel_1 || row.telcel_1 || null,
            tel_cel_2: row.tel_cel_2 || row.telcel_2 || null,
            tel_cel_3: row.tel_cel_3 || row.telcel_3 || null,
            tel_fixo_1: row.tel_fixo_1 || row.telfixo_1 || null,
            tel_fixo_2: row.tel_fixo_2 || row.telfixo_2 || null,
            tel_fixo_3: row.tel_fixo_3 || row.telfixo_3 || null,
            total_contracts: contratos.length || row.total_contracts || 0,
            contracts: row.contracts || [],
            contratos,
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
