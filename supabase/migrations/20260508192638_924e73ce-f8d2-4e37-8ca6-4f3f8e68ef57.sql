
-- Trigger generic for time_clock changes
CREATE OR REPLACE FUNCTION public.tg_time_clock_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_user_day(OLD.user_id, OLD.clock_date);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_user_day(NEW.user_id, NEW.clock_date);
    IF TG_OP = 'UPDATE' AND (OLD.user_id <> NEW.user_id OR OLD.clock_date <> NEW.clock_date) THEN
      PERFORM public.recalc_user_day(OLD.user_id, OLD.clock_date);
    END IF;
    RETURN NEW;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS trg_time_clock_recalc ON public.time_clock;
CREATE TRIGGER trg_time_clock_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.time_clock
FOR EACH ROW EXECUTE FUNCTION public.tg_time_clock_recalc();

-- Trigger for day_offs
CREATE OR REPLACE FUNCTION public.tg_day_off_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_user_day(OLD.user_id, OLD.off_date);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_user_day(NEW.user_id, NEW.off_date);
    IF TG_OP = 'UPDATE' AND (OLD.user_id <> NEW.user_id OR OLD.off_date <> NEW.off_date) THEN
      PERFORM public.recalc_user_day(OLD.user_id, OLD.off_date);
    END IF;
    RETURN NEW;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS trg_day_off_recalc ON public.time_clock_day_offs;
CREATE TRIGGER trg_day_off_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.time_clock_day_offs
FOR EACH ROW EXECUTE FUNCTION public.tg_day_off_recalc();

-- Trigger for justifications
CREATE OR REPLACE FUNCTION public.tg_justification_recalc()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_user_day(OLD.user_id, OLD.reference_date);
    RETURN OLD;
  ELSE
    PERFORM public.recalc_user_day(NEW.user_id, NEW.reference_date);
    RETURN NEW;
  END IF;
END; $$;

DROP TRIGGER IF EXISTS trg_justification_recalc ON public.time_clock_justifications;
CREATE TRIGGER trg_justification_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.time_clock_justifications
FOR EACH ROW EXECUTE FUNCTION public.tg_justification_recalc();

-- Apply approved adjustment requests automatically
CREATE OR REPLACE FUNCTION public.tg_apply_adjustment_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_clock_type public.time_clock_type;
  v_new_time timestamptz;
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
    IF NEW.target_record_id IS NOT NULL THEN
      UPDATE public.time_clock
      SET clock_time = COALESCE(v_new_time, clock_time),
          status = 'ajustado',
          updated_at = now()
      WHERE id = NEW.target_record_id;

      INSERT INTO public.time_clock_logs (time_clock_id, action, performed_by, reason, new_values)
      VALUES (NEW.target_record_id, 'adjustment_approved', NEW.reviewed_by, NEW.reason,
              jsonb_build_object('clock_time', v_new_time));
    END IF;

  ELSIF NEW.adjustment_type = 'remove_record' THEN
    IF NEW.target_record_id IS NOT NULL THEN
      DELETE FROM public.time_clock WHERE id = NEW.target_record_id;
    END IF;
  END IF;

  PERFORM public.recalc_user_day(NEW.user_id, NEW.clock_date);

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_apply_adjustment_request ON public.time_clock_adjustment_requests;
CREATE TRIGGER trg_apply_adjustment_request
AFTER INSERT OR UPDATE OF status ON public.time_clock_adjustment_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_apply_adjustment_request();
