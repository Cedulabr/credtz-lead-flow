import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SimulationNotification {
  id: string;
  user_id: string;
  lead_id: string;
  simulation_id: string;
  type: 'simulation_requested' | 'simulation_completed' | 'simulation_confirmed';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface LeadSimulation {
  id: string;
  lead_id: string;
  requested_by: string;
  requested_at: string;
  completed_by: string | null;
  completed_at: string | null;
  simulation_file_url: string | null;
  simulation_file_name: string | null;
  confirmed_by: string | null;
  confirmed_at: string | null;
  status: 'solicitada' | 'em_andamento' | 'concluida' | 'enviada' | 'recebida';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // New fields for simulation form
  produto: string | null;
  parcela: number | null;
  valor_liberado: number | null;
  banco: string | null;
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

export interface SimulationWithDetails extends LeadSimulation {
  lead?: {
    id: string;
    name: string;
    cpf: string;
    phone: string;
    convenio: string;
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

export function useSimulationNotifications() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<SimulationNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isGestor, setIsGestor] = useState(false);

  const isGestorOrAdmin = profile?.role === 'admin' || isGestor;

  // Check if user is gestor via user_companies
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

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('simulation_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifs = (data || []) as SimulationNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching simulation notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();

    if (!user) return;

    const channel = supabase
      .channel('simulation_notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'simulation_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('simulation_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('simulation_notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Create simulation request
  const requestSimulation = async (leadId: string, leadName: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Create simulation request
      const { data: simulation, error: simError } = await supabase
        .from('lead_simulations')
        .insert({
          lead_id: leadId,
          requested_by: user.id,
          status: 'solicitada'
        })
        .select()
        .single();

      if (simError) throw simError;

      // Update lead with simulation status
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          simulation_status: 'solicitada',
          simulation_id: simulation.id
        })
        .eq('id', leadId);

      if (leadError) throw leadError;

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

      // Create notifications for gestors/admins
      if (usersToNotify.length > 0) {
        const notifications = usersToNotify.map(userId => ({
          user_id: userId,
          lead_id: leadId,
          simulation_id: simulation.id,
          type: 'simulation_requested',
          title: '📊 Nova Simulação Solicitada',
          message: `${profile?.name || 'Usuário'} solicitou simulação para ${leadName}`
        }));

        await supabase
          .from('simulation_notifications')
          .insert(notifications);
      }

      return simulation;
    } catch (error) {
      console.error('Error requesting simulation:', error);
      throw error;
    }
  };

  // Complete simulation (gestor) - using multiple contracts
  const completeSimulation = async (
    simulationId: string,
    leadId: string,
    contracts: SimulationContractItem[],
    requestedBy: string,
    leadName: string
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
      // Update simulation with form data
      const { error: simError } = await supabase
        .from('lead_simulations')
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

      // Update lead status
      const { error: leadError } = await supabase
        .from('leads')
        .update({ simulation_status: 'enviada' })
        .eq('id', leadId);

      if (leadError) throw leadError;

      // Notify the requester
      const valorFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor);
      const contractCount = contracts.length > 1 ? ` (${contracts.length} contratos)` : '';
      await supabase
        .from('simulation_notifications')
        .insert({
          user_id: requestedBy,
          lead_id: leadId,
          simulation_id: simulationId,
          type: 'simulation_completed',
          title: '✅ Simulação Concluída',
          message: `Simulação para ${leadName}: ${valorFormatted}${contractCount}`
        });

      return true;
    } catch (error) {
      console.error('Error completing simulation:', error);
      throw error;
    }
  };

  // Confirm simulation received (user)
  const confirmSimulation = async (
    simulationId: string,
    leadId: string,
    completedBy: string,
    leadName: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Update simulation
      const { error: simError } = await supabase
        .from('lead_simulations')
        .update({
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
          status: 'recebida'
        })
        .eq('id', simulationId);

      if (simError) throw simError;

      // Update lead status
      const { error: leadError } = await supabase
        .from('leads')
        .update({ simulation_status: 'recebida' })
        .eq('id', leadId);

      if (leadError) throw leadError;

      // Notify the gestor who completed
      if (completedBy) {
        await supabase
          .from('simulation_notifications')
          .insert({
            user_id: completedBy,
            lead_id: leadId,
            simulation_id: simulationId,
            type: 'simulation_confirmed',
            title: '📬 Simulação Confirmada',
            message: `${profile?.name || 'Usuário'} confirmou o recebimento da simulação para ${leadName}`
          });
      }

      return true;
    } catch (error) {
      console.error('Error confirming simulation:', error);
      throw error;
    }
  };

  // Get simulation stats with detailed metrics
  const getSimulationStats = async (): Promise<SimulationStats> => {
    if (!user) return { pending: 0, inProgress: 0, completed: 0, received: 0, todayRequested: 0, todayCompleted: 0, conversionRate: 0 };

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('lead_simulations')
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

      // Calculate conversion rate (received / total completed * 100)
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

  // Get pending simulations for gestor (using manual joins)
  const getPendingSimulations = async (): Promise<SimulationWithDetails[]> => {
    if (!user || !isGestorOrAdmin) return [];

    try {
      // First get simulations
      const { data: simulations, error: simError } = await supabase
        .from('lead_simulations')
        .select('*')
        .eq('status', 'solicitada')
        .order('requested_at', { ascending: true });

      if (simError) throw simError;
      if (!simulations || simulations.length === 0) return [];

      // Get unique lead IDs and user IDs
      const leadIds = [...new Set(simulations.map(s => s.lead_id).filter(Boolean))];
      const requesterIds = [...new Set(simulations.map(s => s.requested_by).filter(Boolean))];

      // Fetch leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, cpf, phone, convenio')
        .in('id', leadIds);

      // Fetch profiles (requesters)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', requesterIds);

      // Map data
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

  // Get simulations awaiting confirmation (for user)
  const getAwaitingConfirmation = async (): Promise<SimulationWithDetails[]> => {
    if (!user) return [];

    try {
      // First get simulations
      const { data: simulations, error: simError } = await supabase
        .from('lead_simulations')
        .select('*')
        .eq('requested_by', user.id)
        .eq('status', 'enviada')
        .order('completed_at', { ascending: false });

      if (simError) throw simError;
      if (!simulations || simulations.length === 0) return [];

      // Get unique lead IDs
      const leadIds = [...new Set(simulations.map(s => s.lead_id).filter(Boolean))];

      // Fetch leads
      const { data: leads } = await supabase
        .from('leads')
        .select('id, name, cpf, phone, convenio')
        .in('id', leadIds);

      // Map data
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

  // Request digitação (send to Televendas)
  const requestDigitacao = async (
    leadId: string,
    simulationId: string,
    leadData: {
      name: string;
      cpf: string;
      phone: string;
      convenio: string;
    },
    simulationFileUrl?: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Get user's company
      const { data: userCompany } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single();

      // Get simulation data
      const { data: simulation } = await supabase
        .from('lead_simulations')
        .select('*')
        .eq('id', simulationId)
        .single();

      // Create televenda entry with simulation data
      const { error: tvError } = await supabase
        .from('televendas')
        .insert({
          user_id: user.id,
          company_id: userCompany?.company_id || null,
          lead_id: leadId,
          nome: leadData.name,
          cpf: leadData.cpf?.replace(/\D/g, '') || '',
          telefone: leadData.phone?.replace(/\D/g, '') || '',
          banco: leadData.convenio || '',
          data_venda: new Date().toISOString().split('T')[0],
          parcela: 0,
          tipo_operacao: 'Portabilidade',
          status: 'solicitado_digitacao',
          simulation_file_url: simulationFileUrl || simulation?.simulation_file_url || null,
          simulation_data: simulation ? {
            simulation_id: simulationId,
            requested_at: simulation.requested_at,
            completed_at: simulation.completed_at,
            file_url: simulation.simulation_file_url,
            file_name: simulation.simulation_file_name
          } : null
        });

      if (tvError) throw tvError;

      // Update lead status
      await supabase
        .from('leads')
        .update({ 
          status: 'digitacao_solicitada',
          simulation_status: 'digitacao_solicitada'
        })
        .eq('id', leadId);

      // Notify gestors
      const { data: gestors } = await supabase
        .from('user_companies')
        .select('user_id')
        .eq('company_role', 'gestor')
        .eq('is_active', true);

      if (gestors && gestors.length > 0) {
        const notifications = gestors.map(g => ({
          user_id: g.user_id,
          lead_id: leadId,
          simulation_id: simulationId,
          type: 'simulation_confirmed',
          title: '📝 Digitação Solicitada',
          message: `${profile?.name || 'Usuário'} solicitou digitação para ${leadData.name}`
        }));

        await supabase.from('simulation_notifications').insert(notifications);
      }

      return true;
    } catch (error) {
      console.error('Error requesting digitação:', error);
      throw error;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    isGestorOrAdmin,
    markAsRead,
    markAllAsRead,
    requestSimulation,
    completeSimulation,
    confirmSimulation,
    getSimulationStats,
    getPendingSimulations,
    getAwaitingConfirmation,
    requestDigitacao,
    refetch: fetchNotifications,
  };
}
