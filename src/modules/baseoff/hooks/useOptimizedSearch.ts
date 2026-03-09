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
          // Flatten beneficios[0] into root if nested structure from API
          const beneficio = row.beneficios?.[0] || {};
          const flat = { ...row, ...beneficio };

          const statusBeneficio = flat.status_beneficio || flat.statusbeneficio || '';
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

          const nb = flat.nb || flat.NB || flat.numero_beneficio || flat.num_beneficio || null;
          const mr = parseFloat(flat.mr) || 0;

          // Normalize contract field names from API (banco→banco_emprestimo, valor→vl_emprestimo, etc.)
          const rawContratos = flat.contratos || [];
          const contratos = rawContratos.map((c: any) => ({
            ...c,
            banco_emprestimo: c.banco_emprestimo || c.banco || '',
            contrato: c.contrato || '',
            vl_emprestimo: Number(c.vl_emprestimo || c.valor_emprestimo || c.valor) || null,
            vl_parcela: Number(c.vl_parcela || c.valor_parcela || c.parcela) || null,
            prazo: c.prazo ? Number(c.prazo) : null,
            taxa: c.taxa ? Number(c.taxa) : null,
            saldo: c.saldo ? Number(c.saldo) : null,
            situacao_emprestimo: c.situacao_emprestimo || c.situacao || null,
            tipo_emprestimo: c.tipo_emprestimo || null,
            data_averbacao: c.data_averbacao || null,
            inicio_desconto: c.inicio_desconto || null,
            competencia: c.competencia || null,
            competencia_final: c.competencia_final || null,
          }));

          // Map telefones array to individual fields
          const tels = (flat.telefones || []).filter(Boolean);

          return {
            ...flat,
            status,
            status_beneficio: statusBeneficio,
            nb,
            mr,
            data_nascimento: flat.data_nascimento || flat.dtnascimento || null,
            banco_pagto: flat.banco_pagto || flat.bancopagto || null,
            agencia_pagto: flat.agencia_pagto || flat.agenciapagto || null,
            orgao_pagador: flat.orgao_pagador || flat.orgaopagador || null,
            conta_corrente: flat.conta_corrente || flat.contacorrente || null,
            meio_pagto: flat.meio_pagto || flat.meiopagto || null,
            banco_rmc: flat.banco_rmc || flat.bancormc || null,
            valor_rmc: parseFloat(flat.valor_rmc || flat.valorrmc) || 0,
            banco_rcc: flat.banco_rcc || flat.bancorcc || null,
            valor_rcc: parseFloat(flat.valor_rcc || flat.valorrcc) || 0,
            tel_cel_1: flat.tel_cel_1 || flat.telcel_1 || tels[0] || null,
            tel_cel_2: flat.tel_cel_2 || flat.telcel_2 || tels[1] || null,
            tel_cel_3: flat.tel_cel_3 || flat.telcel_3 || tels[2] || null,
            tel_fixo_1: flat.tel_fixo_1 || flat.telfixo_1 || tels[3] || null,
            tel_fixo_2: flat.tel_fixo_2 || flat.telfixo_2 || tels[4] || null,
            tel_fixo_3: flat.tel_fixo_3 || flat.telfixo_3 || tels[5] || null,
            total_contracts: contratos.length || flat.total_contracts || 0,
            contracts: flat.contracts || [],
            contratos,
            telefones: tels,
            credit_opportunities: flat.credit_opportunities || null,
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
