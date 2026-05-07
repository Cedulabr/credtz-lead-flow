
-- 1. Enum status do dia
DO $$ BEGIN
  CREATE TYPE public.day_status AS ENUM ('ok','observacao','pendente_ajuste','justificado','falta','feriado','folga','sem_jornada');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Tabela de resumo diário
CREATE TABLE IF NOT EXISTS public.time_clock_day_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid,
  day_date date NOT NULL,
  day_of_week smallint NOT NULL,
  expected_minutes integer NOT NULL DEFAULT 0,
  worked_minutes integer NOT NULL DEFAULT 0,
  break_minutes integer NOT NULL DEFAULT 0,
  delay_minutes integer NOT NULL DEFAULT 0,
  early_exit_minutes integer NOT NULL DEFAULT 0,
  overtime_minutes integer NOT NULL DEFAULT 0,
  bank_balance_minutes integer NOT NULL DEFAULT 0,
  status public.day_status NOT NULL DEFAULT 'sem_jornada',
  inconsistencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  is_locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  locked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_date)
);
CREATE INDEX IF NOT EXISTS idx_tcds_user_day ON public.time_clock_day_summary(user_id, day_date DESC);
CREATE INDEX IF NOT EXISTS idx_tcds_company_day ON public.time_clock_day_summary(company_id, day_date DESC);
CREATE INDEX IF NOT EXISTS idx_tcds_status ON public.time_clock_day_summary(status);

ALTER TABLE public.time_clock_day_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tcds_user_select" ON public.time_clock_day_summary;
CREATE POLICY "tcds_user_select" ON public.time_clock_day_summary FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role_safe(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid() AND uc.company_id = time_clock_day_summary.company_id
      AND uc.company_role = 'gestor' AND uc.is_active = true
  )
);

DROP POLICY IF EXISTS "tcds_admin_write" ON public.time_clock_day_summary;
CREATE POLICY "tcds_admin_write" ON public.time_clock_day_summary FOR ALL
USING (public.has_role_safe(auth.uid(), 'admin'))
WITH CHECK (public.has_role_safe(auth.uid(), 'admin'));

-- 3. Tabela de fechamento de período
CREATE TABLE IF NOT EXISTS public.time_clock_period_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  period_month text NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now(),
  closed_by uuid NOT NULL,
  reopened_at timestamptz,
  reopened_by uuid,
  reopen_reason text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, period_month, is_active) DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS idx_tcpc_company_period ON public.time_clock_period_closures(company_id, period_month);
ALTER TABLE public.time_clock_period_closures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tcpc_select" ON public.time_clock_period_closures;
CREATE POLICY "tcpc_select" ON public.time_clock_period_closures FOR SELECT
USING (
  public.has_role_safe(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = time_clock_period_closures.company_id AND uc.is_active = true)
);

DROP POLICY IF EXISTS "tcpc_write" ON public.time_clock_period_closures;
CREATE POLICY "tcpc_write" ON public.time_clock_period_closures FOR ALL
USING (
  public.has_role_safe(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = time_clock_period_closures.company_id AND uc.company_role = 'gestor' AND uc.is_active = true)
)
WITH CHECK (
  public.has_role_safe(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = time_clock_period_closures.company_id AND uc.company_role = 'gestor' AND uc.is_active = true)
);

-- 4. Função is_period_closed
CREATE OR REPLACE FUNCTION public.is_period_closed(_company_id uuid, _date date)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.time_clock_period_closures
    WHERE company_id = _company_id
      AND period_month = to_char(_date, 'YYYY-MM')
      AND is_active = true
      AND reopened_at IS NULL
  );
$$;

-- 5. Função recalc_user_day — calcula resumo do dia
CREATE OR REPLACE FUNCTION public.recalc_user_day(_user_id uuid, _date date)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_dow smallint;
  v_records jsonb;
  v_schedule record;
  v_entry_min int;
  v_exit_min int;
  v_break_min int := 0;
  v_worked_min int := 0;
  v_expected_min int := 0;
  v_delay_min int := 0;
  v_early_exit_min int := 0;
  v_overtime_min int := 0;
  v_bank_balance int := 0;
  v_status public.day_status := 'sem_jornada';
  v_incons jsonb := '[]'::jsonb;
  v_pi_count int;
  v_pf_count int;
  v_entry_count int;
  v_exit_count int;
  v_dups int;
BEGIN
  v_dow := EXTRACT(DOW FROM _date)::smallint;

  -- Empresa do usuário
  SELECT uc.company_id INTO v_company_id
  FROM public.user_companies uc
  WHERE uc.user_id = _user_id AND uc.is_active = true
  LIMIT 1;

  -- Jornada vigente
  SELECT * INTO v_schedule FROM public.time_clock_schedules
  WHERE user_id = _user_id LIMIT 1;

  IF v_schedule.id IS NOT NULL AND v_dow = ANY(COALESCE(v_schedule.work_days, ARRAY[1,2,3,4,5])) THEN
    v_expected_min := COALESCE(v_schedule.daily_hours,0)::int * 60;
  END IF;

  -- Agrega batidas
  SELECT
    jsonb_agg(jsonb_build_object('type', clock_type, 'minute', EXTRACT(HOUR FROM clock_time)*60 + EXTRACT(MINUTE FROM clock_time)) ORDER BY clock_time),
    COUNT(*) FILTER (WHERE clock_type = 'entrada'),
    COUNT(*) FILTER (WHERE clock_type = 'saida'),
    COUNT(*) FILTER (WHERE clock_type = 'pausa_inicio'),
    COUNT(*) FILTER (WHERE clock_type = 'pausa_fim')
  INTO v_records, v_entry_count, v_exit_count, v_pi_count, v_pf_count
  FROM public.time_clock
  WHERE user_id = _user_id AND clock_date = _date;

  -- Sem batidas
  IF v_records IS NULL THEN
    IF v_expected_min > 0 THEN
      v_status := 'falta';
      v_bank_balance := -v_expected_min;
    ELSE
      v_status := 'folga';
    END IF;
  ELSE
    -- Detecta inconsistências
    IF v_entry_count > 1 THEN
      v_incons := v_incons || jsonb_build_object('code','ENTRADA_DUPLICADA','severity','high');
    END IF;
    IF v_exit_count > 1 THEN
      v_incons := v_incons || jsonb_build_object('code','SAIDA_DUPLICADA','severity','high');
    END IF;
    IF v_pi_count <> v_pf_count THEN
      v_incons := v_incons || jsonb_build_object('code','PAUSA_INCOMPLETA','severity','high');
    END IF;
    IF v_entry_count = 0 AND v_exit_count > 0 THEN
      v_incons := v_incons || jsonb_build_object('code','SAIDA_SEM_ENTRADA','severity','high');
    END IF;

    -- Duplicatas exatas
    SELECT COUNT(*) INTO v_dups FROM (
      SELECT clock_type, date_trunc('minute', clock_time)
      FROM public.time_clock WHERE user_id = _user_id AND clock_date = _date
      GROUP BY 1,2 HAVING COUNT(*) > 1
    ) d;
    IF v_dups > 0 THEN
      v_incons := v_incons || jsonb_build_object('code','BATIDA_DUPLICADA','severity','medium');
    END IF;

    -- Cálculo só se válido
    IF v_entry_count = 1 AND v_exit_count = 1 AND v_pi_count = v_pf_count THEN
      SELECT EXTRACT(HOUR FROM clock_time)*60 + EXTRACT(MINUTE FROM clock_time) INTO v_entry_min
      FROM public.time_clock WHERE user_id = _user_id AND clock_date = _date AND clock_type = 'entrada' LIMIT 1;
      SELECT EXTRACT(HOUR FROM clock_time)*60 + EXTRACT(MINUTE FROM clock_time) INTO v_exit_min
      FROM public.time_clock WHERE user_id = _user_id AND clock_date = _date AND clock_type = 'saida' LIMIT 1;

      IF v_exit_min <= v_entry_min THEN
        v_incons := v_incons || jsonb_build_object('code','SAIDA_ANTES_ENTRADA','severity','high');
      ELSE
        -- Pausas
        WITH pi AS (
          SELECT row_number() OVER (ORDER BY clock_time) rn,
                 EXTRACT(HOUR FROM clock_time)*60 + EXTRACT(MINUTE FROM clock_time) m
          FROM public.time_clock WHERE user_id = _user_id AND clock_date = _date AND clock_type = 'pausa_inicio'
        ), pf AS (
          SELECT row_number() OVER (ORDER BY clock_time) rn,
                 EXTRACT(HOUR FROM clock_time)*60 + EXTRACT(MINUTE FROM clock_time) m
          FROM public.time_clock WHERE user_id = _user_id AND clock_date = _date AND clock_type = 'pausa_fim'
        )
        SELECT COALESCE(SUM(GREATEST(pf.m - pi.m, 0)), 0)::int INTO v_break_min
        FROM pi JOIN pf ON pi.rn = pf.rn;

        IF v_break_min > 240 THEN
          v_incons := v_incons || jsonb_build_object('code','PAUSA_EXCESSIVA','severity','medium','minutes',v_break_min);
        END IF;

        v_worked_min := GREATEST(v_exit_min - v_entry_min - v_break_min, 0);

        IF v_worked_min > 720 THEN
          v_incons := v_incons || jsonb_build_object('code','JORNADA_EXCESSIVA','severity','high','minutes',v_worked_min);
        END IF;

        -- Atraso/saída antecipada vs jornada
        IF v_schedule.id IS NOT NULL AND v_expected_min > 0 THEN
          DECLARE
            v_sched_entry int := EXTRACT(HOUR FROM v_schedule.entry_time)*60 + EXTRACT(MINUTE FROM v_schedule.entry_time);
            v_sched_exit int := EXTRACT(HOUR FROM v_schedule.exit_time)*60 + EXTRACT(MINUTE FROM v_schedule.exit_time);
            v_tol int := COALESCE(v_schedule.tolerance_minutes,10);
          BEGIN
            v_delay_min := GREATEST(v_entry_min - v_sched_entry - v_tol, 0);
            v_early_exit_min := GREATEST(v_sched_exit - v_exit_min - v_tol, 0);
          END;
          v_overtime_min := GREATEST(v_worked_min - v_expected_min, 0);
          v_bank_balance := v_worked_min - v_expected_min;
        END IF;
      END IF;
    END IF;

    -- Define status final
    IF jsonb_array_length(v_incons) > 0 AND EXISTS (SELECT 1 FROM jsonb_array_elements(v_incons) e WHERE e->>'severity' = 'high') THEN
      v_status := 'pendente_ajuste';
      v_worked_min := 0;
      v_overtime_min := 0;
      v_bank_balance := 0;
    ELSIF v_delay_min > 0 OR v_early_exit_min > 0 OR jsonb_array_length(v_incons) > 0 THEN
      v_status := 'observacao';
    ELSE
      v_status := 'ok';
    END IF;
  END IF;

  -- Verifica feriado
  IF EXISTS (SELECT 1 FROM public.brazilian_holidays WHERE holiday_date = _date) THEN
    IF v_status = 'falta' THEN v_status := 'feriado'; v_bank_balance := 0; END IF;
  END IF;

  INSERT INTO public.time_clock_day_summary (
    user_id, company_id, day_date, day_of_week, expected_minutes, worked_minutes, break_minutes,
    delay_minutes, early_exit_minutes, overtime_minutes, bank_balance_minutes, status, inconsistencies, updated_at
  ) VALUES (
    _user_id, v_company_id, _date, v_dow, v_expected_min, v_worked_min, v_break_min,
    v_delay_min, v_early_exit_min, v_overtime_min, v_bank_balance, v_status, v_incons, now()
  )
  ON CONFLICT (user_id, day_date) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    day_of_week = EXCLUDED.day_of_week,
    expected_minutes = EXCLUDED.expected_minutes,
    worked_minutes = EXCLUDED.worked_minutes,
    break_minutes = EXCLUDED.break_minutes,
    delay_minutes = EXCLUDED.delay_minutes,
    early_exit_minutes = EXCLUDED.early_exit_minutes,
    overtime_minutes = EXCLUDED.overtime_minutes,
    bank_balance_minutes = EXCLUDED.bank_balance_minutes,
    status = EXCLUDED.status,
    inconsistencies = EXCLUDED.inconsistencies,
    updated_at = now();
EXCEPTION WHEN OTHERS THEN
  -- Falha silenciosa não deve quebrar a batida
  RAISE NOTICE 'recalc_user_day failed for % %: %', _user_id, _date, SQLERRM;
END;
$$;

-- 6. Trigger AFTER em time_clock para recalcular
CREATE OR REPLACE FUNCTION public.tg_time_clock_recalc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_user_day(OLD.user_id, OLD.clock_date);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_user_day(NEW.user_id, NEW.clock_date);
    IF TG_OP = 'UPDATE' AND (OLD.clock_date <> NEW.clock_date OR OLD.user_id <> NEW.user_id) THEN
      PERFORM public.recalc_user_day(OLD.user_id, OLD.clock_date);
    END IF;
    RETURN NEW;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS time_clock_recalc_summary ON public.time_clock;
CREATE TRIGGER time_clock_recalc_summary
AFTER INSERT OR UPDATE OR DELETE ON public.time_clock
FOR EACH ROW EXECUTE FUNCTION public.tg_time_clock_recalc();

-- 7. Trigger BEFORE bloqueando edição em período fechado (exceto admin)
CREATE OR REPLACE FUNCTION public.tg_time_clock_block_closed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cid uuid; v_date date;
BEGIN
  IF TG_OP = 'DELETE' THEN v_cid := OLD.company_id; v_date := OLD.clock_date;
  ELSE v_cid := NEW.company_id; v_date := NEW.clock_date; END IF;

  IF v_cid IS NOT NULL AND public.is_period_closed(v_cid, v_date)
     AND NOT public.has_role_safe(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Período fechado para edição (%): solicite reabertura ao gestor.', to_char(v_date, 'YYYY-MM');
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;

DROP TRIGGER IF EXISTS time_clock_block_closed ON public.time_clock;
CREATE TRIGGER time_clock_block_closed
BEFORE INSERT OR UPDATE OR DELETE ON public.time_clock
FOR EACH ROW EXECUTE FUNCTION public.tg_time_clock_block_closed();

-- 8. RPC para reprocessar histórico (chamada manual sob demanda)
CREATE OR REPLACE FUNCTION public.recalc_history(_user_id uuid DEFAULT NULL, _from date DEFAULT NULL, _to date DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id, clock_date FROM public.time_clock
    WHERE (_user_id IS NULL OR user_id = _user_id)
      AND (_from IS NULL OR clock_date >= _from)
      AND (_to IS NULL OR clock_date <= _to)
  LOOP
    PERFORM public.recalc_user_day(r.user_id, r.clock_date);
    n := n + 1;
  END LOOP;
  RETURN n;
END; $$;
