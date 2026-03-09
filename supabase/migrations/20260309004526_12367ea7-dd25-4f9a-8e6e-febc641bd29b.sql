
-- Add partial day support columns to time_clock_day_offs
ALTER TABLE public.time_clock_day_offs
  ADD COLUMN IF NOT EXISTS is_partial_day BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS start_time TIME,
  ADD COLUMN IF NOT EXISTS end_time TIME;

-- Validation trigger for partial day times
CREATE OR REPLACE FUNCTION public.validate_day_off_partial_time()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_partial_day = true THEN
    IF NEW.start_time IS NULL OR NEW.end_time IS NULL THEN
      RAISE EXCEPTION 'Folga parcial requer horário de início e fim';
    END IF;
    IF NEW.start_time >= NEW.end_time THEN
      RAISE EXCEPTION 'Horário de início deve ser anterior ao horário de fim';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_day_off_partial_time ON public.time_clock_day_offs;
CREATE TRIGGER trg_validate_day_off_partial_time
  BEFORE INSERT OR UPDATE ON public.time_clock_day_offs
  FOR EACH ROW EXECUTE FUNCTION public.validate_day_off_partial_time();
