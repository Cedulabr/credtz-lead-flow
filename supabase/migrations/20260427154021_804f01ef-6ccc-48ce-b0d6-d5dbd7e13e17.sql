-- 1. novavida_credentials
CREATE TABLE public.novavida_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  usuario text NOT NULL,
  senha text NOT NULL,
  cliente text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

ALTER TABLE public.novavida_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "novavida_credentials_select"
  ON public.novavida_credentials FOR SELECT
  USING (
    public.has_role_safe(auth.uid()::text, 'admin')
    OR company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "novavida_credentials_insert"
  ON public.novavida_credentials FOR INSERT
  WITH CHECK (
    public.has_role_safe(auth.uid()::text, 'admin')
    OR company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid() AND is_active = true AND company_role = 'gestor'
    )
  );

CREATE POLICY "novavida_credentials_update"
  ON public.novavida_credentials FOR UPDATE
  USING (
    public.has_role_safe(auth.uid()::text, 'admin')
    OR company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid() AND is_active = true AND company_role = 'gestor'
    )
  );

CREATE POLICY "novavida_credentials_delete"
  ON public.novavida_credentials FOR DELETE
  USING (public.has_role_safe(auth.uid()::text, 'admin'));

CREATE TRIGGER trg_novavida_credentials_updated_at
  BEFORE UPDATE ON public.novavida_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. novavida_token_cache
CREATE TABLE public.novavida_token_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '23 hours 50 minutes'),
  UNIQUE (company_id)
);

ALTER TABLE public.novavida_token_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "novavida_token_cache_select"
  ON public.novavida_token_cache FOR SELECT
  USING (
    public.has_role_safe(auth.uid()::text, 'admin')
    OR company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "novavida_token_cache_all_admin"
  ON public.novavida_token_cache FOR ALL
  USING (public.has_role_safe(auth.uid()::text, 'admin'))
  WITH CHECK (public.has_role_safe(auth.uid()::text, 'admin'));


-- 3. telefonia_consultas
CREATE TABLE public.telefonia_consultas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  cpf text NOT NULL,
  metodo text NOT NULL,
  resultado jsonb,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  credits_used int NOT NULL DEFAULT 1,
  queried_by uuid REFERENCES auth.users(id),
  queried_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_telefonia_consultas_cache
  ON public.telefonia_consultas (company_id, cpf, metodo, queried_at DESC);
CREATE INDEX idx_telefonia_consultas_lead
  ON public.telefonia_consultas (lead_id);

ALTER TABLE public.telefonia_consultas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telefonia_consultas_select"
  ON public.telefonia_consultas FOR SELECT
  USING (
    public.has_role_safe(auth.uid()::text, 'admin')
    OR company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "telefonia_consultas_insert"
  ON public.telefonia_consultas FOR INSERT
  WITH CHECK (
    public.has_role_safe(auth.uid()::text, 'admin')
    OR company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid() AND is_active = true
    )
  );


-- 4. telefonia_numeros
CREATE TABLE public.telefonia_numeros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consulta_id uuid NOT NULL REFERENCES public.telefonia_consultas(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  cpf text NOT NULL,
  ddd text,
  numero text,
  numero_completo text,
  tipo text,
  tem_whatsapp boolean,
  procon boolean,
  operadora text,
  flhot boolean,
  assinante boolean,
  posicao int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_telefonia_numeros_consulta ON public.telefonia_numeros (consulta_id);
CREATE INDEX idx_telefonia_numeros_company_cpf ON public.telefonia_numeros (company_id, cpf);

ALTER TABLE public.telefonia_numeros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "telefonia_numeros_select"
  ON public.telefonia_numeros FOR SELECT
  USING (
    public.has_role_safe(auth.uid()::text, 'admin')
    OR company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "telefonia_numeros_insert"
  ON public.telefonia_numeros FOR INSERT
  WITH CHECK (
    public.has_role_safe(auth.uid()::text, 'admin')
    OR company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid() AND is_active = true
    )
  );