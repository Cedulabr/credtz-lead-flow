-- =====================================================
-- EVOLUÇÃO DO MÓDULO DE CONTROLE DE PONTO
-- =====================================================

-- 1. TABELA DE JORNADAS DE TRABALHO (por usuário)
CREATE TABLE public.time_clock_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  
  -- Carga horária
  daily_hours NUMERIC(4,2) NOT NULL DEFAULT 8.00,
  monthly_hours NUMERIC(5,2) NOT NULL DEFAULT 176.00,
  
  -- Horários padrão
  entry_time TIME NOT NULL DEFAULT '08:00',
  exit_time TIME NOT NULL DEFAULT '18:00',
  
  -- Pausas
  lunch_start TIME DEFAULT '12:00',
  lunch_end TIME DEFAULT '13:00',
  lunch_duration_minutes INTEGER DEFAULT 60,
  
  -- Tolerância
  tolerance_minutes INTEGER NOT NULL DEFAULT 10,
  
  -- Escala
  schedule_type TEXT NOT NULL DEFAULT 'fixed' CHECK (schedule_type IN ('fixed', 'flexible', 'shift')),
  work_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5], -- 0=Dom, 1=Seg, ..., 6=Sab
  
  -- Configurações adicionais
  allow_overtime BOOLEAN DEFAULT false,
  max_overtime_daily_minutes INTEGER DEFAULT 120,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(user_id)
);

-- 2. TABELA DE JUSTIFICATIVAS
CREATE TABLE public.time_clock_justifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  time_clock_id UUID REFERENCES public.time_clock(id) ON DELETE SET NULL,
  
  -- Data de referência
  reference_date DATE NOT NULL,
  
  -- Tipo de justificativa
  justification_type TEXT NOT NULL CHECK (justification_type IN ('delay', 'absence', 'forgot_clock', 'early_leave', 'medical', 'other')),
  
  -- Detalhes
  description TEXT NOT NULL,
  attachment_url TEXT,
  
  -- Status do workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Revisão pelo gestor
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  
  -- Metadados
  minutes_affected INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE ALERTAS AUTOMÁTICOS
CREATE TABLE public.time_clock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  gestor_id UUID REFERENCES auth.users(id),
  
  -- Referência
  reference_date DATE NOT NULL,
  time_clock_id UUID REFERENCES public.time_clock(id) ON DELETE SET NULL,
  
  -- Tipo de alerta
  alert_type TEXT NOT NULL CHECK (alert_type IN ('delay', 'absence', 'incomplete', 'missing_justification', 'recurrent_delay', 'overtime_exceeded')),
  
  -- Severidade
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Descrição
  description TEXT NOT NULL,
  
  -- Status
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Notificação
  notified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA DE RESUMO MENSAL (para performance)
CREATE TABLE public.time_clock_monthly_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  
  -- Período
  year_month TEXT NOT NULL, -- formato: '2026-02'
  
  -- Totais
  total_worked_minutes INTEGER DEFAULT 0,
  expected_minutes INTEGER DEFAULT 0,
  
  -- Contadores
  total_delays INTEGER DEFAULT 0,
  total_delay_minutes INTEGER DEFAULT 0,
  total_absences INTEGER DEFAULT 0,
  total_overtime_minutes INTEGER DEFAULT 0,
  
  -- Justificativas
  pending_justifications INTEGER DEFAULT 0,
  approved_justifications INTEGER DEFAULT 0,
  rejected_justifications INTEGER DEFAULT 0,
  
  -- Status
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, year_month)
);

-- 5. ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_time_clock_schedules_user ON public.time_clock_schedules(user_id);
CREATE INDEX idx_time_clock_schedules_company ON public.time_clock_schedules(company_id);
CREATE INDEX idx_time_clock_justifications_user ON public.time_clock_justifications(user_id);
CREATE INDEX idx_time_clock_justifications_status ON public.time_clock_justifications(status);
CREATE INDEX idx_time_clock_justifications_date ON public.time_clock_justifications(reference_date);
CREATE INDEX idx_time_clock_alerts_user ON public.time_clock_alerts(user_id);
CREATE INDEX idx_time_clock_alerts_type ON public.time_clock_alerts(alert_type);
CREATE INDEX idx_time_clock_alerts_resolved ON public.time_clock_alerts(is_resolved);
CREATE INDEX idx_time_clock_monthly_summary_user ON public.time_clock_monthly_summary(user_id);
CREATE INDEX idx_time_clock_monthly_summary_month ON public.time_clock_monthly_summary(year_month);

-- 6. RLS POLICIES
ALTER TABLE public.time_clock_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_justifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_monthly_summary ENABLE ROW LEVEL SECURITY;

-- Schedules: usuário vê o próprio, gestor/admin vê da empresa
CREATE POLICY "Users can view own schedule"
ON public.time_clock_schedules FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view company schedules"
ON public.time_clock_schedules FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_company_gestor(auth.uid(), company_id)
);

CREATE POLICY "Managers can manage schedules"
ON public.time_clock_schedules FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_company_gestor(auth.uid(), company_id)
);

-- Justifications: usuário vê as próprias, gestor/admin vê da empresa
CREATE POLICY "Users can view own justifications"
ON public.time_clock_justifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own justifications"
ON public.time_clock_justifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Managers can view company justifications"
ON public.time_clock_justifications FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_company_gestor(auth.uid(), company_id)
);

CREATE POLICY "Managers can update justifications"
ON public.time_clock_justifications FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_company_gestor(auth.uid(), company_id)
);

-- Alerts: gestor/admin vê da empresa
CREATE POLICY "Users can view own alerts"
ON public.time_clock_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can manage alerts"
ON public.time_clock_alerts FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_company_gestor(auth.uid(), company_id)
);

-- Monthly Summary
CREATE POLICY "Users can view own summary"
ON public.time_clock_monthly_summary FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can manage summaries"
ON public.time_clock_monthly_summary FOR ALL
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_company_gestor(auth.uid(), company_id)
);

-- 7. TRIGGERS
CREATE TRIGGER update_time_clock_schedules_updated_at
BEFORE UPDATE ON public.time_clock_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_time_clock_break_types_updated_at();

CREATE TRIGGER update_time_clock_justifications_updated_at
BEFORE UPDATE ON public.time_clock_justifications
FOR EACH ROW EXECUTE FUNCTION public.update_time_clock_break_types_updated_at();

CREATE TRIGGER update_time_clock_monthly_summary_updated_at
BEFORE UPDATE ON public.time_clock_monthly_summary
FOR EACH ROW EXECUTE FUNCTION public.update_time_clock_break_types_updated_at();

-- 8. FUNÇÃO PARA CALCULAR HORAS TRABALHADAS
CREATE OR REPLACE FUNCTION public.calculate_worked_hours(
  p_user_id UUID,
  p_date DATE
)
RETURNS TABLE (
  total_minutes INTEGER,
  worked_minutes INTEGER,
  break_minutes INTEGER,
  delay_minutes INTEGER,
  overtime_minutes INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule RECORD;
  v_records RECORD;
  v_entry_time TIME;
  v_exit_time TIME;
  v_total_worked INTEGER := 0;
  v_total_break INTEGER := 0;
  v_delay INTEGER := 0;
  v_overtime INTEGER := 0;
  v_expected_minutes INTEGER;
  v_status TEXT := 'incompleto';
BEGIN
  -- Buscar jornada do usuário
  SELECT * INTO v_schedule
  FROM public.time_clock_schedules
  WHERE user_id = p_user_id AND is_active = true;
  
  IF v_schedule IS NULL THEN
    v_expected_minutes := 480; -- 8 horas padrão
  ELSE
    v_expected_minutes := (v_schedule.daily_hours * 60)::INTEGER;
  END IF;
  
  -- Buscar registros do dia
  SELECT 
    MIN(CASE WHEN clock_type = 'entrada' THEN clock_time END) as first_entry,
    MAX(CASE WHEN clock_type = 'saida' THEN clock_time END) as last_exit,
    SUM(CASE WHEN clock_type = 'pausa_inicio' THEN 1 ELSE 0 END) as pause_starts,
    SUM(CASE WHEN clock_type = 'pausa_fim' THEN 1 ELSE 0 END) as pause_ends
  INTO v_records
  FROM public.time_clock
  WHERE user_id = p_user_id AND clock_date = p_date;
  
  IF v_records.first_entry IS NOT NULL AND v_records.last_exit IS NOT NULL THEN
    -- Calcular minutos totais
    v_total_worked := EXTRACT(EPOCH FROM (v_records.last_exit - v_records.first_entry)) / 60;
    
    -- Calcular pausas
    SELECT COALESCE(SUM(
      EXTRACT(EPOCH FROM (
        (SELECT MIN(tc2.clock_time) FROM public.time_clock tc2 
         WHERE tc2.user_id = p_user_id 
         AND tc2.clock_date = p_date 
         AND tc2.clock_type = 'pausa_fim'
         AND tc2.clock_time > tc.clock_time)
        - tc.clock_time
      )) / 60
    ), 0)::INTEGER
    INTO v_total_break
    FROM public.time_clock tc
    WHERE tc.user_id = p_user_id 
    AND tc.clock_date = p_date 
    AND tc.clock_type = 'pausa_inicio';
    
    v_total_worked := v_total_worked - COALESCE(v_total_break, 0);
    
    -- Calcular atraso
    IF v_schedule IS NOT NULL AND v_records.first_entry > v_schedule.entry_time THEN
      v_delay := EXTRACT(EPOCH FROM (v_records.first_entry - v_schedule.entry_time)) / 60;
      IF v_delay <= v_schedule.tolerance_minutes THEN
        v_delay := 0;
      END IF;
    END IF;
    
    -- Calcular hora extra
    IF v_total_worked > v_expected_minutes THEN
      v_overtime := v_total_worked - v_expected_minutes;
    END IF;
    
    v_status := 'completo';
  ELSIF v_records.first_entry IS NOT NULL THEN
    v_status := 'incompleto';
  ELSE
    v_status := 'ausente';
  END IF;
  
  RETURN QUERY SELECT 
    v_expected_minutes,
    v_total_worked,
    v_total_break,
    v_delay,
    v_overtime,
    v_status;
END;
$$;

-- 9. FUNÇÃO PARA VERIFICAR PENDÊNCIAS ANTES DE FECHAR MÊS
CREATE OR REPLACE FUNCTION public.check_month_pending_issues(
  p_user_id UUID,
  p_year_month TEXT
)
RETURNS TABLE (
  has_pending BOOLEAN,
  pending_justifications INTEGER,
  incomplete_days INTEGER,
  missing_entries INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_just INTEGER;
  v_incomplete INTEGER;
  v_missing INTEGER;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  v_start_date := (p_year_month || '-01')::DATE;
  v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
  
  -- Contar justificativas pendentes
  SELECT COUNT(*) INTO v_pending_just
  FROM public.time_clock_justifications
  WHERE user_id = p_user_id
  AND reference_date BETWEEN v_start_date AND v_end_date
  AND status = 'pending';
  
  -- Contar dias incompletos
  SELECT COUNT(DISTINCT clock_date) INTO v_incomplete
  FROM public.time_clock
  WHERE user_id = p_user_id
  AND clock_date BETWEEN v_start_date AND v_end_date
  AND status = 'incompleto';
  
  -- Contar alertas não resolvidos
  SELECT COUNT(*) INTO v_missing
  FROM public.time_clock_alerts
  WHERE user_id = p_user_id
  AND reference_date BETWEEN v_start_date AND v_end_date
  AND is_resolved = false;
  
  RETURN QUERY SELECT 
    (v_pending_just > 0 OR v_incomplete > 0 OR v_missing > 0),
    v_pending_just,
    v_incomplete,
    v_missing;
END;
$$;