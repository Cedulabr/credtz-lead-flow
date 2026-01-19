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

  // Complete simulation (gestor)
  const completeSimulation = async (
    simulationId: string,
    leadId: string,
    fileUrl: string,
    fileName: string,
    requestedBy: string,
    leadName: string
  ) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Update simulation
      const { error: simError } = await supabase
        .from('lead_simulations')
        .update({
          completed_by: user.id,
          completed_at: new Date().toISOString(),
          simulation_file_url: fileUrl,
          simulation_file_name: fileName,
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
      await supabase
        .from('simulation_notifications')
        .insert({
          user_id: requestedBy,
          lead_id: leadId,
          simulation_id: simulationId,
          type: 'simulation_completed',
          title: '✅ Simulação Concluída',
          message: `A simulação para ${leadName} foi concluída e está pronta para visualização`
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

  // Get simulation stats
  const getSimulationStats = async () => {
    if (!user) return { pending: 0, completed: 0, awaiting: 0 };

    try {
      const { data, error } = await supabase
        .from('lead_simulations')
        .select('status');

      if (error) throw error;

      const stats = {
        pending: data?.filter(s => s.status === 'solicitada').length || 0,
        completed: data?.filter(s => s.status === 'enviada').length || 0,
        awaiting: data?.filter(s => s.status === 'recebida').length || 0
      };

      return stats;
    } catch (error) {
      console.error('Error fetching simulation stats:', error);
      return { pending: 0, completed: 0, awaiting: 0 };
    }
  };

  // Get pending simulations for gestor
  const getPendingSimulations = async () => {
    if (!user || !isGestorOrAdmin) return [];

    try {
      const { data, error } = await supabase
        .from('lead_simulations')
        .select(`
          *,
          leads:lead_id (
            id,
            name,
            cpf,
            phone,
            convenio
          ),
          requester:requested_by (
            id,
            name,
            email
          )
        `)
        .eq('status', 'solicitada')
        .order('requested_at', { ascending: true });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching pending simulations:', error);
      return [];
    }
  };

  // Get simulations awaiting confirmation (for user)
  const getAwaitingConfirmation = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('lead_simulations')
        .select(`
          *,
          leads:lead_id (
            id,
            name,
            cpf,
            phone,
            convenio
          )
        `)
        .eq('requested_by', user.id)
        .eq('status', 'enviada')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error fetching awaiting simulations:', error);
      return [];
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
    refetch: fetchNotifications,
  };
}
