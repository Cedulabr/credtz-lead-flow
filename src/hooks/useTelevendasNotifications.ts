import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface TelevendasNotification {
  id: string;
  televendas_id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  is_dismissed: boolean;
  reminder_day: number | null;
  scheduled_date: string | null;
  created_at: string;
  read_at: string | null;
}

// Helper para calcular dias úteis
const addBusinessDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  let addedDays = 0;
  
  while (addedDays < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      addedDays++;
    }
  }
  
  return result;
};

const getBusinessDaysBetween = (startDate: Date, endDate: Date): number => {
  let count = 0;
  const curDate = new Date(startDate);
  
  while (curDate < endDate) {
    curDate.setDate(curDate.getDate() + 1);
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
  }
  
  return count;
};

export function useTelevendasNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<TelevendasNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Buscar notificações do usuário
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("televendas_notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications((data as TelevendasNotification[]) || []);
      setUnreadCount((data || []).filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching televendas notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Criar notificação quando status for alterado para "pendente"
  const createPendingNotification = async (
    televendasId: string,
    userId: string,
    clientName: string,
    changedByName: string
  ) => {
    try {
      const { error } = await supabase
        .from("televendas_notifications")
        .insert({
          televendas_id: televendasId,
          user_id: userId,
          notification_type: "status_pendente",
          title: "⚠️ Proposta marcada como Pendente",
          message: `A proposta de ${clientName} foi marcada como pendente por ${changedByName}. Verifique se há ações necessárias.`,
        });

      if (error) throw error;

      // Exibir toast imediato
      toast({
        title: "⚠️ Nova Pendência",
        description: `Proposta de ${clientName} precisa de atenção!`,
      });
    } catch (error) {
      console.error("Error creating pending notification:", error);
    }
  };

  // Verificar e criar lembretes de portabilidade
  const checkPortabilityReminders = async () => {
    if (!user?.id) return;

    try {
      // Buscar propostas de portabilidade com status "proposta_digitada"
      const { data: proposals, error: proposalsError } = await supabase
        .from("televendas")
        .select("id, nome, user_id, status, tipo_operacao, created_at, status_updated_at")
        .eq("status", "proposta_digitada")
        .ilike("tipo_operacao", "%portabilidade%");

      if (proposalsError) throw proposalsError;

      if (!proposals || proposals.length === 0) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const proposal of proposals) {
        // Calcular dias úteis desde que entrou em "proposta_digitada"
        const statusDate = new Date(proposal.status_updated_at || proposal.created_at);
        statusDate.setHours(0, 0, 0, 0);
        
        const businessDays = getBusinessDaysBetween(statusDate, today);

        if (businessDays >= 1 && businessDays <= 5) {
          // Verificar se já foi enviado lembrete para este dia
          const { data: existingReminder } = await supabase
            .from("televendas_portability_reminders")
            .select("id")
            .eq("televendas_id", proposal.id)
            .eq("reminder_day", businessDays)
            .maybeSingle();

          if (!existingReminder) {
            const isUrgent = businessDays === 5;
            
            // Registrar o lembrete enviado
            await supabase
              .from("televendas_portability_reminders")
              .insert({
                televendas_id: proposal.id,
                user_id: proposal.user_id,
                reminder_day: businessDays,
                is_urgent: isUrgent,
              });

            // Criar notificação
            const title = isUrgent 
              ? "🚨 URGENTE: Possível retorno de saldo!"
              : `📋 Lembrete de Portabilidade (Dia ${businessDays}/5)`;
            
            const message = isUrgent
              ? `A proposta de ${proposal.nome} está em "Proposta Digitada" há 5 dias úteis! Risco de retorno de saldo. Tome ação imediata!`
              : `A proposta de portabilidade de ${proposal.nome} está aguardando há ${businessDays} dia(s) útil(eis). Acompanhe o status no banco.`;

            await supabase
              .from("televendas_notifications")
              .insert({
                televendas_id: proposal.id,
                user_id: proposal.user_id,
                notification_type: isUrgent ? "portabilidade_urgent" : "portabilidade_reminder",
                title,
                message,
                reminder_day: businessDays,
                scheduled_date: today.toISOString().split("T")[0],
              });

            // Se for o usuário atual, mostrar toast
            if (proposal.user_id === user.id) {
              toast({
                title,
                description: message,
                variant: isUrgent ? "destructive" : "default",
              });
            }
          }
        }
      }

      // Recarregar notificações
      await fetchNotifications();
    } catch (error) {
      console.error("Error checking portability reminders:", error);
    }
  };

  // Marcar notificação como lida
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("televendas_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Marcar todas como lidas
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("televendas_notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Dispensar notificação
  const dismissNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("televendas_notifications")
        .update({ is_dismissed: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId);
        return notification && !notification.is_read ? Math.max(0, prev - 1) : prev;
      });
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  // Carregar notificações ao montar
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Verificar lembretes de portabilidade a cada 5 minutos
  useEffect(() => {
    if (!user?.id) return;

    // Verificar imediatamente
    checkPortabilityReminders();

    // Verificar a cada 5 minutos
    const interval = setInterval(checkPortabilityReminders, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    createPendingNotification,
    checkPortabilityReminders,
    markAsRead,
    markAllAsRead,
    dismissNotification,
  };
}
