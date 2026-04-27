-- Permission flag
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_access_telefonia boolean NOT NULL DEFAULT false;

-- Add UI-friendly columns (lead_id, status already exist)
ALTER TABLE public.telefonia_consultas
  ADD COLUMN IF NOT EXISTS nome_retornado text,
  ADD COLUMN IF NOT EXISTS total_telefones integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS from_cache boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_telefonia_consultas_company_queried
  ON public.telefonia_consultas (company_id, queried_at DESC);

CREATE INDEX IF NOT EXISTS idx_telefonia_consultas_lead
  ON public.telefonia_consultas (lead_id) WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telefonia_consultas_cpf
  ON public.telefonia_consultas (cpf);