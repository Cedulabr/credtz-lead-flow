
-- 1) Recria o trigger interpretando proposed_time como America/Sao_Paulo
CREATE OR REPLACE FUNCTION public.tg_apply_adjustment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clock_type public.time_clock_type;
  v_new_time timestamptz;
  v_target uuid;
BEGIN
  IF NEW.status <> 'approved' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN RETURN NEW; END IF;

  v_clock_type := CASE NEW.adjustment_type
    WHEN 'add_entry' THEN 'entrada'::public.time_clock_type
    WHEN 'add_exit' THEN 'saida'::public.time_clock_type
    WHEN 'add_break_start' THEN 'pausa_inicio'::public.time_clock_type
    WHEN 'add_break_end' THEN 'pausa_fim'::public.time_clock_type
    WHEN 'edit_entry' THEN 'entrada'::public.time_clock_type
    WHEN 'edit_exit' THEN 'saida'::public.time_clock_type
    WHEN 'edit_break_start' THEN 'pausa_inicio'::public.time_clock_type
    WHEN 'edit_break_end' THEN 'pausa_fim'::public.time_clock_type
    ELSE NULL
  END;

  IF NEW.proposed_time IS NOT NULL THEN
    -- Interpreta o horário informado como America/Sao_Paulo e converte para UTC
    v_new_time := ((NEW.clock_date::text || ' ' || NEW.proposed_time::text)::timestamp
                   AT TIME ZONE 'America/Sao_Paulo');
  END IF;

  IF NEW.adjustment_type IN ('add_entry','add_exit','add_break_start','add_break_end') THEN
    INSERT INTO public.time_clock (user_id, company_id, clock_date, clock_type, clock_time, status, notes)
    VALUES (NEW.user_id, NEW.company_id, NEW.clock_date, v_clock_type, v_new_time, 'ajustado',
            'Inclusão via ajuste #' || NEW.id::text);

  ELSIF NEW.adjustment_type IN ('edit_entry','edit_exit','edit_break_start','edit_break_end') THEN
    v_target := NEW.target_record_id;
    IF v_target IS NULL THEN
      SELECT id INTO v_target
      FROM public.time_clock
      WHERE user_id = NEW.user_id
        AND clock_date = NEW.clock_date
        AND clock_type = v_clock_type
      ORDER BY clock_time ASC
      LIMIT 1;
    END IF;

    IF v_target IS NOT NULL THEN
      UPDATE public.time_clock
      SET clock_time = COALESCE(v_new_time, clock_time),
          status = 'ajustado',
          updated_at = now()
      WHERE id = v_target;

      INSERT INTO public.time_clock_logs (time_clock_id, action, performed_by, reason, new_values)
      VALUES (v_target, 'adjustment_approved', NEW.reviewed_by, NEW.reason,
              jsonb_build_object('clock_time', v_new_time));
    ELSE
      INSERT INTO public.time_clock (user_id, company_id, clock_date, clock_type, clock_time, status, notes)
      VALUES (NEW.user_id, NEW.company_id, NEW.clock_date, v_clock_type, v_new_time, 'ajustado',
              'Inclusão via ajuste #' || NEW.id::text || ' (auto-fallback edit→add)');
    END IF;

  ELSIF NEW.adjustment_type = 'remove_record' THEN
    IF NEW.target_record_id IS NOT NULL THEN
      DELETE FROM public.time_clock WHERE id = NEW.target_record_id;
    END IF;

  ELSIF NEW.adjustment_type = 'other' THEN
    RAISE EXCEPTION 'Ajuste tipo "Outro" não pode ser aprovado diretamente. Converta para add_entry/add_exit/add_break_start/add_break_end (ou edit_*) antes de aprovar.';
  END IF;

  PERFORM public.recalc_user_day(NEW.user_id, NEW.clock_date);

  RETURN NEW;
END;
$$;

-- 2) Corrige as batidas da Jamily em 27/04/2026 que ficaram 3h adiantadas
UPDATE public.time_clock
SET clock_time = clock_time + INTERVAL '3 hours', status = 'ajustado'
WHERE id = '02c53e91-e4af-4e58-a3f3-8c076dec8324'; -- entrada 09:00 UTC -> 12:00 UTC (=09:00 BRT)

UPDATE public.time_clock
SET clock_time = clock_time + INTERVAL '3 hours', status = 'ajustado'
WHERE id = 'e5eb2ee8-000f-4b59-9430-e20596f94027'; -- pausa_inicio 12:00 UTC -> 15:00 UTC (=12:00 BRT)

SELECT public.recalc_user_day('f3edf393-b185-4c85-a317-9b5082a3fd94'::uuid, '2026-04-27'::date);
