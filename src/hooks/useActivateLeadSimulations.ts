import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ActivateLeadSimulation {
  id: string;
  lead_id: string;
  requested_by: string;
  requested_at: string;
  completed_by: string | null;
  completed_at: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  status: 'solicitada' | 'em_andamento' | 'enviada' | 'recebida';
  notes: string | null;
  produto: string | null;
  parcela: number | null;
  valor_liberado: number | null;
  banco: string | null;
  created_at: string;
  updated_at: string;
}

export interface SimulationContractItem {
  id: string;
  produto: string;
  parcela: string;
  valor_liberado: string;
  banco: string;
}

export interface SimulationFormData {
  produto: string;
  parcela: string;
  valor_liberado: string;
  banco: string;
}

export interface SimulationWithDetails extends ActivateLeadSimulation {
  lead?: {
    id: string;
    nome: string;
    telefone: string;
    cpf: string | null;
  };
  requester?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SimulationStats {
  pending: number;
  inProgress: number;
  completed: number;
  received: number;
  todayRequested: number;
  todayCompleted: number;
  conversionRate: number;
}

export function useActivateLeadSimulations() {
  const { user, profile } = useAuth();
  const [isGestor, setIsGestor] = useState(false);

  const isGestorOrAdmin = profile?.role === 'admin' || isGestor;

  useEffect(() => {
    const checkGestorRole = async () => {
      if (!user) {
        setIsGestor(false);
        return;
      }
      
      const { data } = await supabase
        .from('user_companies')
        .select('company_role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('company_role', 'gestor')
        .limit(1);
      
      setIsGestor(!!data && data.length > 0);
    };
    
    checkGestorRole();
  }, [user]);

  const requestSimulation = async (leadId: string, leadNome: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data: simulation, error: simError } = await supabase
        .from('activate_leads_simulations')
        .insert({
          lead_id: leadId,
          requested_by: user.id,
          status: 'solicitada'
        })
        .select()
        .single();

      if (simError) throw simError;

      // Update lead with simulation status
      await supabase
        .from('activate_leads')
        .update({
          simulation_status: 'solicitada',
          simulation_id: simulation.id
        })
        .eq('id', leadId);

      // Get gestors to notify
      const { data: gestors } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_role', 'gestor')
        .eq('is_active', true);

      // Get admins to notify
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      const usersToNotify = [
        ...(gestors?.map(g => g.user_id) || []),
        ...(admins?.map(a => a.id) || [])
      ];

      // Create notifications
      if (usersToNotify.length > 0) {
        const notifications = usersToNotify.map(userId => ({
          user_id: userId,
          lead_id: leadId,
          simulation_id: simulation.id,
          type: 'simulation_requested' as const,
          title: '📊 Nova Simulação Solicitada (Activate)',
          message: `${profile?.name || 'Usuário'} solicitou simulação para ${leadNome}`
        }));

        await supabase
          .from('activate_leads_simulation_notifications')
          .insert(notifications);
      }

      return simulation;
    } catch (error) {
      console.error('Error requesting simulation:', error);
      throw error;
    }
  };

  const completeSimulation = async (
    simulationId: string,
    leadId: string,
    contracts: SimulationContractItem[],
    requestedBy: string,
    leadNome: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    if (!contracts || contracts.length === 0) {
      throw new Error('Adicione pelo menos um contrato');
    }

    // Validate all contracts
    for (const contract of contracts) {
      if (!contract.produto?.trim()) throw new Error('Produto é obrigatório em todos os contratos');
      if (!contract.parcela?.trim()) throw new Error('Parcela é obrigatória em todos os contratos');
      if (!contract.valor_liberado?.trim()) throw new Error('Valor liberado é obrigatório em todos os contratos');
    }

    // Parse contracts for storage
    const parsedContracts = contracts.map(c => ({
      produto: c.produto,
      parcela: parseFloat(c.parcela.replace(/\D/g, '')) / 100,
      valor_liberado: parseFloat(c.valor_liberado.replace(/\D/g, '')) / 100,
      banco: c.banco || null
    }));

    // Calculate totals
    const totalValor = parsedContracts.reduce((sum, c) => sum + c.valor_liberado, 0);
    const totalParcela = parsedContracts.reduce((sum, c) => sum + c.parcela, 0);
    const primaryContract = parsedContracts[0];

    try {
      const { error: simError } = await supabase
        .from('activate_leads_simulations')
        .update({
          completed_by: user.id,
          completed_at: new Date().toISOString(),
          produto: primaryContract.produto,
          parcela: totalParcela,
          valor_liberado: totalValor,
          banco: primaryContract.banco,
          notes: contracts.length > 1 ? JSON.stringify(parsedContracts) : null,
          status: 'enviada'
        })
        .eq('id', simulationId);

      if (simError) throw simError;

      await supabase
        .from('activate_leads')
        .update({ simulation_status: 'enviada' })
        .eq('id', leadId);

      // Notify the requester
      const valorFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor);
      const contractCount = contracts.length > 1 ? ` (${contracts.length} contratos)` : '';
      await supabase
        .from('activate_leads_simulation_notifications')
        .insert({
          user_id: requestedBy,
          lead_id: leadId,
          simulation_id: simulationId,
          type: 'simulation_completed',
          title: '✅ Simulação Concluída',
          message: `Simulação para ${leadNome}: ${valorFormatted}${contractCount}`
        });

      return true;
    } catch (error) {
      console.error('Error completing simulation:', error);
      throw error;
    }
  };

  const confirmSimulation = async (
    simulationId: string,
    leadId: string,
    completedBy: string,
    leadNome: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { error: simError } = await supabase
        .from('activate_leads_simulations')
        .update({
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
          status: 'recebida'
        })
        .eq('id', simulationId);

      if (simError) throw simError;

      await supabase
        .from('activate_leads')
        .update({ simulation_status: 'recebida' })
        .eq('id', leadId);

      // Notify the gestor who completed
      if (completedBy) {
        await supabase
          .from('activate_leads_simulation_notifications')
          .insert({
            user_id: completedBy,
            lead_id: leadId,
            simulation_id: simulationId,
            type: 'simulation_confirmed',
            title: '📬 Simulação Confirmada',
            message: `${profile?.name || 'Usuário'} confirmou o recebimento da simulação para ${leadNome}`
          });
      }

      return true;
    } catch (error) {
      console.error('Error confirming simulation:', error);
      throw error;
    }
  };

  const getSimulationStats = async (): Promise<SimulationStats> => {
    if (!user) return { pending: 0, inProgress: 0, completed: 0, received: 0, todayRequested: 0, todayCompleted: 0, conversionRate: 0 };

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('activate_leads_simulations')
        .select('status, requested_at, completed_at');

      if (error) throw error;

      const todayStr = today.toISOString();
      
      const stats: SimulationStats = {
        pending: data?.filter(s => s.status === 'solicitada').length || 0,
        inProgress: data?.filter(s => s.status === 'em_andamento').length || 0,
        completed: data?.filter(s => s.status === 'enviada').length || 0,
        received: data?.filter(s => s.status === 'recebida').length || 0,
        todayRequested: data?.filter(s => s.requested_at && s.requested_at >= todayStr).length || 0,
        todayCompleted: data?.filter(s => s.completed_at && s.completed_at >= todayStr).length || 0,
        conversionRate: 0
      };

      const totalProcessed = stats.completed + stats.received;
      if (totalProcessed > 0) {
        stats.conversionRate = Math.round((stats.received / totalProcessed) * 100);
      }

      return stats;
    } catch (error) {
      console.error('Error fetching simulation stats:', error);
      return { pending: 0, inProgress: 0, completed: 0, received: 0, todayRequested: 0, todayCompleted: 0, conversionRate: 0 };
    }
  };

  const getPendingSimulations = async (): Promise<SimulationWithDetails[]> => {
    if (!user || !isGestorOrAdmin) return [];

    try {
      const { data: simulations, error: simError } = await supabase
        .from('activate_leads_simulations')
        .select('*')
        .eq('status', 'solicitada')
        .order('requested_at', { ascending: true });

      if (simError) throw simError;
      if (!simulations || simulations.length === 0) return [];

      const leadIds = [...new Set(simulations.map(s => s.lead_id).filter(Boolean))];
      const requesterIds = [...new Set(simulations.map(s => s.requested_by).filter(Boolean))];

      const { data: leads } = await supabase
        .from('activate_leads')
        .select('id, nome, telefone, cpf')
        .in('id', leadIds);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', requesterIds);

      const leadsMap = new Map(leads?.map(l => [l.id, l]) || []);
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return simulations.map(sim => ({
        ...sim,
        lead: leadsMap.get(sim.lead_id) || undefined,
        requester: profilesMap.get(sim.requested_by) || undefined
      })) as SimulationWithDetails[];
    } catch (error) {
      console.error('Error fetching pending simulations:', error);
      return [];
    }
  };

  const getAwaitingConfirmation = async (): Promise<SimulationWithDetails[]> => {
    if (!user) return [];

    try {
      const { data: simulations, error: simError } = await supabase
        .from('activate_leads_simulations')
        .select('*')
        .eq('requested_by', user.id)
        .eq('status', 'enviada')
        .order('completed_at', { ascending: false });

      if (simError) throw simError;
      if (!simulations || simulations.length === 0) return [];

      const leadIds = [...new Set(simulations.map(s => s.lead_id).filter(Boolean))];

      const { data: leads } = await supabase
        .from('activate_leads')
        .select('id, nome, telefone, cpf')
        .in('id', leadIds);

      const leadsMap = new Map(leads?.map(l => [l.id, l]) || []);

      return simulations.map(sim => ({
        ...sim,
        lead: leadsMap.get(sim.lead_id) || undefined
      })) as SimulationWithDetails[];
    } catch (error) {
      console.error('Error fetching awaiting simulations:', error);
      return [];
    }
  };

  return {
    isGestorOrAdmin,
    requestSimulation,
    completeSimulation,
    confirmSimulation,
    getSimulationStats,
    getPendingSimulations,
    getAwaitingConfirmation,
  };
}
