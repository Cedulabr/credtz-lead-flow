import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Proposal } from '../types';

export function useDigitacao() {
  const { user } = useAuth();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchProposals = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      let query = supabase
        .from('joinbank_proposals' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setProposals((data as any[]) || []);
    } catch (err: any) {
      toast.error('Erro ao carregar propostas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, statusFilter]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  // Módulo Base OFF removido — busca por CPF desativada.
  const searchClientByCPF = useCallback(async (_cpf: string) => {
    return null as any;
  }, []);

  return {
    proposals,
    loading,
    statusFilter,
    setStatusFilter,
    fetchProposals,
    searchClientByCPF,
  };
}
