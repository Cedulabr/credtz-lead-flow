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
    v_new_time := (NEW.clock_date::text || ' ' || NEW.proposed_time::text)::timestamptz;
  END IF;

  IF NEW.adjustment_type IN ('add_entry','add_exit','add_break_start','add_break_end') THEN
    INSERT INTO public.time_clock (user_id, company_id, clock_date, clock_type, clock_time, status, notes)
    VALUES (NEW.user_id, NEW.company_id, NEW.clock_date, v_clock_type, v_new_time, 'ajustado', 'Inclusão via ajuste #' || NEW.id::text);

  ELSIF NEW.adjustment_type IN ('edit_entry','edit_exit','edit_break_start','edit_break_end') THEN
    v_target := NEW.target_record_id;

    -- Fallback: locate an existing record by (user, date, type) when target is missing
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
      -- No target found: behave as add_*
      INSERT INTO public.time_clock (user_id, company_id, clock_date, clock_type, clock_time, status, notes)
      VALUES (NEW.user_id, NEW.company_id, NEW.clock_date, v_clock_type, v_new_time, 'ajustado',
              'Inclusão via ajuste #' || NEW.id::text || ' (auto-fallback edit→add)');
    END IF;

  ELSIF NEW.adjustment_type = 'remove_record' THEN
    IF NEW.target_record_id IS NOT NULL THEN
      DELETE FROM public.time_clock WHERE id = NEW.target_record_id;
    END IF;

  ELSIF NEW.adjustment_type = 'other' THEN
    -- Block silent approval; force UI to convert to a concrete type
    RAISE EXCEPTION 'Ajuste tipo "Outro" não pode ser aprovado diretamente. Converta para add_entry/add_exit/add_break_start/add_break_end (ou edit_*) antes de aprovar.';
  END IF;

  PERFORM public.recalc_user_day(NEW.user_id, NEW.clock_date);

  RETURN NEW;
END;
$$;

-- Reapply orphaned approvals (period >= 2026-01-01) by toggling status to trigger the new function.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.time_clock_adjustment_requests
    WHERE status = 'approved'
      AND clock_date >= DATE '2026-01-01'
      AND adjustment_type IN ('edit_entry','edit_exit','edit_break_start','edit_break_end')
      AND target_record_id IS NULL
  LOOP
    BEGIN
      UPDATE public.time_clock_adjustment_requests SET status='pending' WHERE id = r.id;
      UPDATE public.time_clock_adjustment_requests SET status='approved' WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Falha ao reaplicar ajuste %: %', r.id, SQLERRM;
    END;
  END LOOP;
END $$;