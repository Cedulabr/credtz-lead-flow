
-- Create employee_salaries table
CREATE TABLE public.employee_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES companies(id),
  base_salary numeric(12,2) NOT NULL DEFAULT 0,
  cargo text DEFAULT 'Colaborador',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

ALTER TABLE public.employee_salaries ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "admin_full_access_salaries" ON public.employee_salaries
  FOR ALL TO authenticated
  USING (public.is_global_admin(auth.uid()));

-- Gestor access by company
CREATE POLICY "gestor_company_access_salaries" ON public.employee_salaries
  FOR ALL TO authenticated
  USING (public.is_company_gestor(auth.uid(), company_id));

-- Employee can read own
CREATE POLICY "employee_read_own_salary" ON public.employee_salaries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
