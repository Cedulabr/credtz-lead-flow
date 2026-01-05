-- Tabela de notificações do sistema de televendas
CREATE TABLE public.televendas_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  televendas_id UUID NOT NULL REFERENCES televendas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL, -- 'status_pendente', 'portabilidade_reminder', 'portabilidade_urgent'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  reminder_day INTEGER DEFAULT NULL, -- Dia do lembrete (1-5) para portabilidade
  scheduled_date DATE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Índices para performance
CREATE INDEX idx_televendas_notifications_user ON televendas_notifications(user_id);
CREATE INDEX idx_televendas_notifications_unread ON televendas_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_televendas_notifications_scheduled ON televendas_notifications(scheduled_date) WHERE is_dismissed = false;
CREATE INDEX idx_televendas_notifications_type ON televendas_notifications(notification_type);

-- Enable RLS
ALTER TABLE public.televendas_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS - Usuários veem suas próprias notificações
CREATE POLICY "Users can view their own notifications"
ON public.televendas_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem atualizar suas próprias notificações (marcar como lida/descartada)
CREATE POLICY "Users can update their own notifications"
ON public.televendas_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins e sistema podem criar notificações
CREATE POLICY "System can insert notifications"
ON public.televendas_notifications
FOR INSERT
WITH CHECK (true);

-- Tabela para rastrear lembretes de portabilidade enviados
CREATE TABLE public.televendas_portability_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  televendas_id UUID NOT NULL REFERENCES televendas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reminder_day INTEGER NOT NULL, -- 1-5
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_urgent BOOLEAN DEFAULT false, -- true para o 5º dia
  CONSTRAINT unique_portability_reminder UNIQUE (televendas_id, reminder_day)
);

-- Enable RLS
ALTER TABLE public.televendas_portability_reminders ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own reminders"
ON public.televendas_portability_reminders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert reminders"
ON public.televendas_portability_reminders
FOR INSERT
WITH CHECK (true);

-- Índices
CREATE INDEX idx_portability_reminders_televendas ON televendas_portability_reminders(televendas_id);
CREATE INDEX idx_portability_reminders_user ON televendas_portability_reminders(user_id);