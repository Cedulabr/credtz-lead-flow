
-- 1. Expand time_clock_hour_bank with detail columns
ALTER TABLE public.time_clock_hour_bank 
  ADD COLUMN IF NOT EXISTS overtime_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delay_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS early_exit_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS absence_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS manual_adjustments_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS compensations_minutes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';

-- 2. Create hour_bank_entries table
CREATE TABLE IF NOT EXISTS public.hour_bank_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id),
  entry_date DATE NOT NULL,
  entry_type TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  reason TEXT,
  reference_month TEXT NOT NULL,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  hourly_rate NUMERIC(10,2),
  total_value NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create hour_bank_settings table
CREATE TABLE IF NOT EXISTS public.hour_bank_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID UNIQUE REFERENCES public.companies(id),
  tolerance_delay_minutes INTEGER DEFAULT 10,
  max_overtime_monthly_minutes INTEGER DEFAULT 2400,
  max_bank_balance_minutes INTEGER DEFAULT 7200,
  allow_negative_discount BOOLEAN DEFAULT true,
  overtime_multiplier NUMERIC(3,2) DEFAULT 1.50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.hour_bank_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hour_bank_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLS for hour_bank_entries
CREATE POLICY "Admins and gestors can manage all entries"
  ON public.hour_bank_entries FOR ALL
  TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Users can view own entries"
  ON public.hour_bank_entries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 6. RLS for hour_bank_settings
CREATE POLICY "Admins and gestors can manage settings"
  ON public.hour_bank_settings FOR ALL
  TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Anyone can read settings"
  ON public.hour_bank_settings FOR SELECT
  TO authenticated
  USING (true);
