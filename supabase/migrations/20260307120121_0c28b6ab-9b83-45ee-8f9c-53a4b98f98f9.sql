
-- Create baseoff_bank_rates table
CREATE TABLE public.baseoff_bank_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  bank_code text,
  default_rate numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  company_id uuid REFERENCES public.companies(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.baseoff_bank_rates ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated users can read active rates
CREATE POLICY "Authenticated users can read bank rates"
  ON public.baseoff_bank_rates FOR SELECT TO authenticated
  USING (is_active = true);

-- RLS: admins/gestors can manage
CREATE POLICY "Admins can manage bank rates"
  ON public.baseoff_bank_rates FOR ALL TO authenticated
  USING (public.is_gestor_or_admin(auth.uid()))
  WITH CHECK (public.is_gestor_or_admin(auth.uid()));

-- Seed initial banks
INSERT INTO public.baseoff_bank_rates (bank_name, bank_code, default_rate) VALUES
  ('BRB', 'BRB', 1.80),
  ('Finanto', 'FINANTO', 1.75),
  ('Pic Pay', 'PICPAY', 1.70),
  ('Digio', 'DIGIO', 1.65);
