
-- Table to store SMS provider configurations
CREATE TABLE public.sms_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL, -- 'twilio' or 'yup_chat'
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sms_providers ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can manage SMS providers"
  ON public.sms_providers FOR ALL
  USING (public.is_global_admin(auth.uid()));

-- Seed default providers
INSERT INTO public.sms_providers (name, display_name, is_active) VALUES
  ('twilio', 'Twilio', true),
  ('yup_chat', 'Yup Chat', false);

-- Add provider tracking to sms_history
ALTER TABLE public.sms_history ADD COLUMN IF NOT EXISTS provider text DEFAULT 'twilio';
