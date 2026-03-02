
-- Add phone_number to whatsapp_instances
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS phone_number text;

-- Create whatsapp_scheduled_messages table
CREATE TABLE public.whatsapp_scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  phone text NOT NULL,
  message text,
  client_name text,
  media_base64 text,
  media_name text,
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  source_module text,
  source_record_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_whatsapp_scheduled_user ON public.whatsapp_scheduled_messages(user_id);
CREATE INDEX idx_whatsapp_scheduled_status ON public.whatsapp_scheduled_messages(status);
CREATE INDEX idx_whatsapp_scheduled_at ON public.whatsapp_scheduled_messages(scheduled_at);
CREATE INDEX idx_whatsapp_scheduled_instance ON public.whatsapp_scheduled_messages(instance_id);

-- Enable RLS
ALTER TABLE public.whatsapp_scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own scheduled messages
CREATE POLICY "Users view own scheduled messages"
ON public.whatsapp_scheduled_messages FOR SELECT
USING (auth.uid() = user_id OR public.is_global_admin(auth.uid()));

-- Users can insert their own scheduled messages
CREATE POLICY "Users insert own scheduled messages"
ON public.whatsapp_scheduled_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own scheduled messages (cancel etc)
CREATE POLICY "Users update own scheduled messages"
ON public.whatsapp_scheduled_messages FOR UPDATE
USING (auth.uid() = user_id OR public.is_global_admin(auth.uid()));

-- Users can delete their own scheduled messages
CREATE POLICY "Users delete own scheduled messages"
ON public.whatsapp_scheduled_messages FOR DELETE
USING (auth.uid() = user_id OR public.is_global_admin(auth.uid()));
