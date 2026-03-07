
-- Add schedule_name to time_clock_schedules
ALTER TABLE public.time_clock_schedules ADD COLUMN IF NOT EXISTS schedule_name text DEFAULT 'Jornada Padrão';

-- Create hour bank table
CREATE TABLE IF NOT EXISTS public.time_clock_hour_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id),
  reference_month text NOT NULL,
  expected_minutes integer NOT NULL DEFAULT 0,
  worked_minutes integer NOT NULL DEFAULT 0,
  balance_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, reference_month)
);

ALTER TABLE public.time_clock_hour_bank ENABLE ROW LEVEL SECURITY;

-- RLS policies for hour bank
CREATE POLICY "Users can view own hour bank" ON public.time_clock_hour_bank
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Admins/gestors can manage hour bank" ON public.time_clock_hour_bank
  FOR ALL TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()));

-- Create storage bucket for time-clock-documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('time-clock-documents', 'time-clock-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for time-clock-documents
CREATE POLICY "Authenticated users can upload time clock docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'time-clock-documents');

CREATE POLICY "Authenticated users can view time clock docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'time-clock-documents');
