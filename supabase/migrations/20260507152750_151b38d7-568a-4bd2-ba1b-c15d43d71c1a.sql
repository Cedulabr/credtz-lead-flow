-- Fase 3: validação documental do PDF + log de reabertura de fechamento

-- 1) Tabela de validação de PDFs gerados
CREATE TABLE IF NOT EXISTS public.time_clock_pdf_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  company_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_by UUID NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tcpv_user_period ON public.time_clock_pdf_validations(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_tcpv_company ON public.time_clock_pdf_validations(company_id);

ALTER TABLE public.time_clock_pdf_validations ENABLE ROW LEVEL SECURITY;

-- Validação pública por hash (somente SELECT, retorna metadata pública)
DROP POLICY IF EXISTS "tcpv_public_validate" ON public.time_clock_pdf_validations;
CREATE POLICY "tcpv_public_validate" ON public.time_clock_pdf_validations
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tcpv_insert" ON public.time_clock_pdf_validations;
CREATE POLICY "tcpv_insert" ON public.time_clock_pdf_validations
  FOR INSERT WITH CHECK (
    auth.uid() = generated_by
  );

-- 2) Log de reabertura de fechamento de período
CREATE TABLE IF NOT EXISTS public.time_clock_closure_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closure_id UUID,
  company_id UUID NOT NULL,
  period_month DATE NOT NULL,
  action TEXT NOT NULL, -- 'closed' | 'reopened'
  performed_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tccl_company_period ON public.time_clock_closure_logs(company_id, period_month);

ALTER TABLE public.time_clock_closure_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tccl_select" ON public.time_clock_closure_logs;
CREATE POLICY "tccl_select" ON public.time_clock_closure_logs
  FOR SELECT USING (
    public.has_role_safe(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = time_clock_closure_logs.company_id AND uc.is_active = true
    )
  );

DROP POLICY IF EXISTS "tccl_insert" ON public.time_clock_closure_logs;
CREATE POLICY "tccl_insert" ON public.time_clock_closure_logs
  FOR INSERT WITH CHECK (
    auth.uid() = performed_by
  );

-- 3) Índices de performance recomendados na fase 3
CREATE INDEX IF NOT EXISTS idx_time_clock_user_date ON public.time_clock(user_id, clock_date);
CREATE INDEX IF NOT EXISTS idx_time_clock_company_date ON public.time_clock(company_id, clock_date);