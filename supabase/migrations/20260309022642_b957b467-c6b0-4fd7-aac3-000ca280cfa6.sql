
-- Create hour_bank_compensation_requests table
CREATE TABLE public.hour_bank_compensation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  requested_by UUID NOT NULL,
  total_minutes INTEGER NOT NULL,
  compensated_minutes INTEGER DEFAULT 0,
  daily_limit_minutes INTEGER DEFAULT 30,
  compensation_type TEXT NOT NULL DEFAULT 'compensacao',
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hour_bank_compensation_requests ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_full_access_compensation_requests" ON public.hour_bank_compensation_requests
  FOR ALL USING (public.is_gestor_or_admin(auth.uid()));

-- Collaborator can read own requests
CREATE POLICY "user_read_own_compensation_requests" ON public.hour_bank_compensation_requests
  FOR SELECT USING (auth.uid() = user_id);
