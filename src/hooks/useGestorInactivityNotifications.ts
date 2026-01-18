import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InactivityNotification {
  id: string;
  gestor_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  company_id: string | null;
  last_lead_request: string | null;
  days_inactive: number;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

interface InactivitySettings {
  id: string;
  company_id: string | null;
  inactivity_days: number;
  is_active: boolean;
}

export function useGestorInactivityNotifications() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<InactivityNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<InactivitySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is gestor via user_companies table or is admin
  const [isGestorOrAdmin, setIsGestorOrAdmin] = useState(false);

  useEffect(() => {
    const checkGestorStatus = async () => {
      if (!user) {
        setIsGestorOrAdmin(false);
        return;
      }

      // Check if admin
      if (profile?.role === 'admin') {
        setIsGestorOrAdmin(true);
        return;
      }

      // Check if gestor via user_companies
      const { data } = await supabase
        .from('user_companies')
        .select('company_role')
        .eq('user_id', user.id)
        .eq('company_role', 'gestor')
        .eq('is_active', true)
        .limit(1);

      setIsGestorOrAdmin(data && data.length > 0);
    };

    checkGestorStatus();
  }, [user, profile?.role]);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('lead_inactivity_settings')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching inactivity settings:', error);
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user || !isGestorOrAdmin) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gestor_inactivity_notifications')
        .select('*')
        .eq('gestor_id', user.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const notifs = (data || []) as InactivityNotification[];
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (error) {
      console.error('Error fetching inactivity notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isGestorOrAdmin]);

  // Verificar usuários inativos e criar notificações
  const checkInactiveUsers = useCallback(async () => {
    if (!user || !isGestorOrAdmin) return;

    try {
      // Buscar usuários inativos usando a função do banco
      const { data: inactiveUsers, error } = await supabase
        .rpc('check_user_lead_inactivity');

      if (error) {
        console.error('Error checking inactive users:', error);
        return;
      }

      if (!inactiveUsers || inactiveUsers.length === 0) return;

      // Filtrar apenas os usuários que o gestor atual gerencia
      const relevantUsers = inactiveUsers.filter(
        (u: any) => u.gestor_id === user.id || profile?.role === 'admin'
      );

      for (const inactiveUser of relevantUsers) {
        if (!inactiveUser.gestor_id) continue;

        // Verificar se já existe notificação para este usuário hoje
        const today = new Date().toISOString().split('T')[0];
        const { data: existing } = await supabase
          .from('gestor_inactivity_notifications')
          .select('id')
          .eq('gestor_id', inactiveUser.gestor_id)
          .eq('user_id', inactiveUser.user_id)
          .gte('created_at', today)
          .maybeSingle();

        if (!existing) {
          await supabase
            .from('gestor_inactivity_notifications')
            .insert({
              gestor_id: inactiveUser.gestor_id,
              user_id: inactiveUser.user_id,
              user_name: inactiveUser.user_name,
              user_email: inactiveUser.user_email,
              company_id: inactiveUser.company_id,
              last_lead_request: inactiveUser.last_lead_request,
              days_inactive: inactiveUser.days_inactive,
            });
        }
      }

      // Recarregar notificações
      fetchNotifications();
    } catch (error) {
      console.error('Error checking inactive users:', error);
    }
  }, [user, isGestorOrAdmin, profile?.role, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('gestor_inactivity_notifications')
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

  const dismissNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('gestor_inactivity_notifications')
        .update({ is_dismissed: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notif = notifications.find(n => n.id === notificationId);
        return notif && !notif.is_read ? Math.max(0, prev - 1) : prev;
      });
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('gestor_inactivity_notifications')
        .update({ is_read: true })
        .eq('gestor_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const updateSettings = async (inactivityDays: number) => {
    try {
      if (settings) {
        const { error } = await supabase
          .from('lead_inactivity_settings')
          .update({ inactivity_days: inactivityDays, updated_at: new Date().toISOString() })
          .eq('id', settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lead_inactivity_settings')
          .insert({ inactivity_days: inactivityDays, is_active: true });

        if (error) throw error;
      }
      
      fetchSettings();
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchNotifications();
  }, [fetchSettings, fetchNotifications]);

  // Verificar usuários inativos a cada hora
  useEffect(() => {
    if (!isGestorOrAdmin) return;

    // Verificar imediatamente
    checkInactiveUsers();

    // Verificar a cada hora
    const interval = setInterval(checkInactiveUsers, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isGestorOrAdmin, checkInactiveUsers]);

  return {
    notifications,
    unreadCount,
    settings,
    loading,
    isGestorOrAdmin,
    markAsRead,
    dismissNotification,
    markAllAsRead,
    updateSettings,
    refetch: fetchNotifications,
    checkInactiveUsers,
  };
}
