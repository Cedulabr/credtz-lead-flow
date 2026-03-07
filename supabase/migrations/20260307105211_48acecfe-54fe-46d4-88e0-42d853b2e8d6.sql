
-- Table for day-offs (folgas, feriados, férias, licenças, abonos)
CREATE TABLE public.time_clock_day_offs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  off_date date NOT NULL,
  off_type text NOT NULL CHECK (off_type IN ('folga', 'feriado', 'licenca', 'ferias', 'abono')),
  reason text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id, off_date)
);

ALTER TABLE public.time_clock_day_offs ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins full access on day_offs"
  ON public.time_clock_day_offs
  FOR ALL
  TO authenticated
  USING (public.is_global_admin(auth.uid()))
  WITH CHECK (public.is_global_admin(auth.uid()));

-- Gestors can manage day-offs for users in their company
CREATE POLICY "Gestors manage company day_offs"
  ON public.time_clock_day_offs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = time_clock_day_offs.company_id
        AND uc.company_role = 'gestor'
        AND uc.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = time_clock_day_offs.company_id
        AND uc.company_role = 'gestor'
        AND uc.is_active = true
    )
  );

-- Users can view their own day-offs
CREATE POLICY "Users view own day_offs"
  ON public.time_clock_day_offs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
