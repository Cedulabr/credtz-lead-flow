
CREATE OR REPLACE FUNCTION public.recalc_user_day(_user_id uuid, _date date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_company_id uuid;
  v_dow smallint;
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
  v_pi_count int := 0;
  v_pf_count int := 0;
  v_entry_count int := 0;
  v_exit_count int := 0;
  v_dups int := 0;
  v_records_count int := 0;
  -- Folgas / justificativas
  v_off_full record;          -- folga full-day (tem prioridade)
  v_off_partial_min int := 0; -- minutos cobertos por folgas parciais
  v_just_full boolean := false;
  v_is_holiday boolean := false;
  v_is_full_off boolean := false;
  v_off_type text := NULL;
BEGIN
  v_dow := EXTRACT(DOW FROM _date)::smallint;

  -- Empresa do usuário
  SELECT uc.company_id INTO v_company_id
  FROM public.user_companies uc
  WHERE uc.user_id = _user_id AND uc.is_active = true
  LIMIT 1;

  -- Jornada vigente
  SELECT * INTO v_schedule FROM public.time_clock_schedules
  WHERE user_id = _user_id AND COALESCE(is_active, true) = true
  ORDER BY created_at DESC NULLS LAST LIMIT 1;

  IF v_schedule.id IS NOT NULL AND v_dow = ANY(COALESCE(v_schedule.work_days, ARRAY[1,2,3,4,5])) THEN
    v_expected_min := COALESCE(v_schedule.daily_hours,0)::numeric::int * 60;
  END IF;

  -- Folgas full-day para o dia (prioridade)
  SELECT off_type INTO v_off_type
  FROM public.time_clock_day_offs
  WHERE user_id = _user_id AND off_date = _date AND COALESCE(is_partial_day, false) = false
  ORDER BY
    CASE off_type::text WHEN 'feriado' THEN 1 WHEN 'ferias' THEN 2 WHEN 'folga' THEN 3 ELSE 4 END
  LIMIT 1;

  IF v_off_type IS NOT NULL THEN
    v_is_full_off := true;
    IF v_off_type = 'feriado' THEN v_is_holiday := true; END IF;
  END IF;

  -- Folgas parciais (somar minutos cobertos)
  SELECT COALESCE(SUM(
    GREATEST(
      (EXTRACT(HOUR FROM end_time)*60 + EXTRACT(MINUTE FROM end_time))
      - (EXTRACT(HOUR FROM start_time)*60 + EXTRACT(MINUTE FROM start_time)),
      0
    )
  ), 0)::int
  INTO v_off_partial_min
  FROM public.time_clock_day_offs
  WHERE user_id = _user_id AND off_date = _date
    AND COALESCE(is_partial_day, false) = true
    AND start_time IS NOT NULL AND end_time IS NOT NULL;

  -- Justificativa aprovada cobrindo o dia
  SELECT EXISTS (
    SELECT 1 FROM public.time_clock_justifications
    WHERE user_id = _user_id AND reference_date = _date AND status = 'approved'
  ) INTO v_just_full;

  -- Reduz expected_min por folga parcial
  IF v_expected_min > 0 AND v_off_partial_min > 0 THEN
    v_expected_min := GREATEST(v_expected_min - v_off_partial_min, 0);
  END IF;

  -- Agrega batidas
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE clock_type = 'entrada'),
    COUNT(*) FILTER (WHERE clock_type = 'saida'),
    COUNT(*) FILTER (WHERE clock_type = 'pausa_inicio'),
    COUNT(*) FILTER (WHERE clock_type = 'pausa_fim')
  INTO v_records_count, v_entry_count, v_exit_count, v_pi_count, v_pf_count
  FROM public.time_clock
  WHERE user_id = _user_id AND clock_date = _date;

  IF v_records_count = 0 THEN
    -- Sem batidas: prioridade folga/feriado > justificado > falta/folga(sem jornada)
    IF v_is_full_off THEN
      v_status := CASE v_off_type
        WHEN 'feriado' THEN 'feriado'::public.day_status
        WHEN 'ferias' THEN 'folga'::public.day_status
        ELSE 'folga'::public.day_status
      END;
      v_expected_min := 0;
      v_bank_balance := 0;
    ELSIF v_just_full THEN
      v_status := 'justificado';
      v_bank_balance := 0;
    ELSIF v_expected_min > 0 THEN
      v_status := 'falta';
      v_bank_balance := -v_expected_min;
    ELSE
      v_status := 'folga';
    END IF;
  ELSE
    -- Inconsistências
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

    SELECT COUNT(*) INTO v_dups FROM (
      SELECT clock_type, date_trunc('minute', clock_time)
      FROM public.time_clock WHERE user_id = _user_id AND clock_date = _date
      GROUP BY 1,2 HAVING COUNT(*) > 1
    ) d;
    IF v_dups > 0 THEN
      v_incons := v_incons || jsonb_build_object('code','BATIDA_DUPLICADA','severity','medium');
    END IF;

    IF v_entry_count = 1 AND v_exit_count = 1 AND v_pi_count = v_pf_count THEN
      SELECT EXTRACT(HOUR FROM clock_time)*60 + EXTRACT(MINUTE FROM clock_time) INTO v_entry_min
      FROM public.time_clock WHERE user_id = _user_id AND clock_date = _date AND clock_type = 'entrada' LIMIT 1;
      SELECT EXTRACT(HOUR FROM clock_time)*60 + EXTRACT(MINUTE FROM clock_time) INTO v_exit_min
      FROM public.time_clock WHERE user_id = _user_id AND clock_date = _date AND clock_type = 'saida' LIMIT 1;

      IF v_exit_min <= v_entry_min THEN
        v_incons := v_incons || jsonb_build_object('code','SAIDA_ANTES_ENTRADA','severity','high');
      ELSE
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

    -- Status final calculado
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

    -- Sobrescreve por folga full-day / feriado / justificativa
    IF v_is_full_off THEN
      v_status := CASE v_off_type
        WHEN 'feriado' THEN 'feriado'::public.day_status
        WHEN 'ferias' THEN 'folga'::public.day_status
        ELSE 'folga'::public.day_status
      END;
      -- Em feriado/folga com batidas, mantemos worked como hora extra; zera delay/early/expected
      v_expected_min := 0;
      v_delay_min := 0;
      v_early_exit_min := 0;
      v_overtime_min := v_worked_min;
      v_bank_balance := v_worked_min;
    ELSIF v_just_full AND v_status IN ('falta','pendente_ajuste','observacao') THEN
      v_status := 'justificado';
      v_bank_balance := GREATEST(v_bank_balance, 0);
    END IF;
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
  RAISE WARNING 'recalc_user_day failed for user=% date=%: % (%)', _user_id, _date, SQLERRM, SQLSTATE;
END;
$function$;

-- Backfill: gera resumo para todos os pares (user, data) com batidas, folgas ou justificativas
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id, clock_date AS d FROM public.time_clock
    UNION
    SELECT DISTINCT user_id, off_date FROM public.time_clock_day_offs
    UNION
    SELECT DISTINCT user_id, reference_date FROM public.time_clock_justifications WHERE status = 'approved'
  LOOP
    PERFORM public.recalc_user_day(r.user_id, r.d);
  END LOOP;
END $$;
