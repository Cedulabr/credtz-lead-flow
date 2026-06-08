import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface JoinBankResponse<T = any> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

async function callProxy(route: string, payload?: any, method = 'POST') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Usuário não autenticado');

  const { data, error } = await supabase.functions.invoke('joinbank-proxy', {
    body: { route, method, payload },
  });

  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.details?.message || data.error);
  return data;
}

export function useJoinBankAPI() {
  const [loading, setLoading] = useState(false);

  const listProducts = useCallback(async (operationCode?: number) => {
    setLoading(true);
    try {
      const payload: any = { offset: 0, limit: 100 };
      if (operationCode) {
        payload.type = { code: { eq: 20 } }; // INSS
        payload.operation = { code: { eq: operationCode } };
      }
      return await callProxy('/loan-products/search/basic', payload);
    } catch (err: any) {
      toast.error('Erro ao listar produtos: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const listRules = useCallback(async (operationCode?: number) => {
    setLoading(true);
    try {
      const payload: any = { offset: 0, limit: 100 };
      if (operationCode) {
        payload.operation = { code: { eq: operationCode } };
      }
      return await callProxy('/loan-product-rules/search/basic', payload);
    } catch (err: any) {
      toast.error('Erro ao listar tabelas: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculate = useCallback(async (payload: any) => {
    setLoading(true);
    try {
      return await callProxy('/loan-inss-simulations/calculation', payload);
    } catch (err: any) {
      toast.error('Erro na calculadora: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSimulation = useCallback(async (payload: any) => {
    setLoading(true);
    try {
      return await callProxy('/loan-inss-simulations', payload);
    } catch (err: any) {
      toast.error('Erro ao criar simulação: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getSimulation = useCallback(async (simulationId: string) => {
    setLoading(true);
    try {
      return await callProxy(`/loan-inss-simulations/${simulationId}`, undefined, 'GET');
    } catch (err: any) {
      toast.error('Erro ao consultar simulação: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSimulation = useCallback(async (simulationId: string, payload: any) => {
    setLoading(true);
    try {
      return await callProxy(`/loan-inss-simulations/${simulationId}`, payload, 'PUT');
    } catch (err: any) {
      toast.error('Erro ao atualizar simulação: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const createLoans = useCallback(async (simulationId: string) => {
    setLoading(true);
    try {
      return await callProxy(`/loan-inss-simulations/${simulationId}/actions`, { command: 'create_loans' });
    } catch (err: any) {
      toast.error('Erro ao gerar contratos: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const searchLoans = useCallback(async (filters: any) => {
    setLoading(true);
    try {
      return await callProxy('/loans/search', filters);
    } catch (err: any) {
      toast.error('Erro ao buscar empréstimos: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const queryIN100 = useCallback(async (identity: string, benefitNumber: string) => {
    setLoading(true);
    try {
      return await callProxy('/query-inss-balances/finder', {
        identity,
        benefitNumber,
        lastHours: 1,
        timeout: 120,
      });
    } catch (err: any) {
      toast.error('Erro na consulta IN100: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const listRefinanceableContracts = useCallback(async (identity: string, benefit: string, ruleId: string) => {
    setLoading(true);
    try {
      return await callProxy('/loan-inss-simulations/refinanceable-contracts', {
        identity,
        benefit,
        ruleid: ruleId,
        anyUser: true,
      });
    } catch (err: any) {
      toast.error('Erro ao listar contratos refinanciáveis: ' + err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const testConnection = useCallback(async () => {
    setLoading(true);
    try {
      const result = await callProxy('/loan-products/search/basic', { offset: 0, limit: 1 });
      return !!result;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProposal = useCallback(async (proposalData: {
    client_cpf: string;
    client_name: string;
    simulation_id?: string;
    operation_type: string;
    status: string;
    api_response?: any;
    request_payload?: any;
    company_id?: string;
  }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Não autenticado');

    const { data, error } = await supabase
      .from('joinbank_proposals' as any)
      .insert({
        user_id: user.id,
        ...proposalData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }, []);

  return {
    loading,
    listProducts,
    listRules,
    calculate,
    createSimulation,
    getSimulation,
    updateSimulation,
    createLoans,
    searchLoans,
    queryIN100,
    listRefinanceableContracts,
    testConnection,
    saveProposal,
  };
}
