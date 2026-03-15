
-- Table to track JoinBank proposals/simulations
CREATE TABLE public.joinbank_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id),
  client_cpf text NOT NULL,
  client_name text NOT NULL,
  simulation_id text,
  operation_type text NOT NULL DEFAULT 'novo',
  status text NOT NULL DEFAULT 'pendente',
  api_response jsonb,
  request_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.joinbank_proposals ENABLE ROW LEVEL SECURITY;

-- User sees own proposals
CREATE POLICY "Users can view own proposals" ON public.joinbank_proposals
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- User can insert own proposals
CREATE POLICY "Users can insert own proposals" ON public.joinbank_proposals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User can update own proposals
CREATE POLICY "Users can update own proposals" ON public.joinbank_proposals
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Gestor/admin can view all in company
CREATE POLICY "Gestors can view company proposals" ON public.joinbank_proposals
  FOR SELECT TO authenticated
  USING (
    public.is_gestor_or_admin(auth.uid())
    OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  );

-- Admin can view all
CREATE POLICY "Admins can view all proposals" ON public.joinbank_proposals
  FOR SELECT TO authenticated
  USING (public.is_global_admin(auth.uid()));

-- Table for API config per company
CREATE TABLE public.joinbank_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  enabled boolean NOT NULL DEFAULT true,
  default_products jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.joinbank_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage config" ON public.joinbank_config
  FOR ALL TO authenticated
  USING (public.is_global_admin(auth.uid()));

CREATE POLICY "Users can view config" ON public.joinbank_config
  FOR SELECT TO authenticated
  USING (
    company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  );
