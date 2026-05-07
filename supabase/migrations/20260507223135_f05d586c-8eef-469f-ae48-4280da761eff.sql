-- Add salary effectivity period
ALTER TABLE public.employee_salaries
  ADD COLUMN IF NOT EXISTS effective_from date,
  ADD COLUMN IF NOT EXISTS effective_to date;

UPDATE public.employee_salaries
  SET effective_from = COALESCE(effective_from, created_at::date)
  WHERE effective_from IS NULL;

ALTER TABLE public.employee_salaries
  ALTER COLUMN effective_from SET NOT NULL,
  ALTER COLUMN effective_from SET DEFAULT current_date;

-- Drop old unique if exists (best-effort)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'employee_salaries_user_id_company_id_key') THEN
    ALTER TABLE public.employee_salaries DROP CONSTRAINT employee_salaries_user_id_company_id_key;
  END IF;
END $$;

-- Partial unique: only one currently-vigent row per user/company
CREATE UNIQUE INDEX IF NOT EXISTS employee_salaries_unique_current
  ON public.employee_salaries (user_id, company_id)
  WHERE effective_to IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS employee_salaries_period_idx
  ON public.employee_salaries (user_id, company_id, effective_from, effective_to);

-- RPC: get salary for a user at a date
CREATE OR REPLACE FUNCTION public.get_salary_at(
  p_user_id uuid,
  p_company_id uuid,
  p_date date
) RETURNS public.employee_salaries
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT *
    FROM public.employee_salaries
   WHERE user_id = p_user_id
     AND (p_company_id IS NULL OR company_id = p_company_id)
     AND effective_from <= p_date
     AND (effective_to IS NULL OR effective_to >= p_date)
   ORDER BY effective_from DESC
   LIMIT 1;
$$;

-- RPC: bulk variant returning user_id + base_salary + cargo
CREATE OR REPLACE FUNCTION public.get_salaries_at(
  p_user_ids uuid[],
  p_company_id uuid,
  p_date date
) RETURNS TABLE (user_id uuid, base_salary numeric, cargo text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (es.user_id)
         es.user_id, es.base_salary, es.cargo
    FROM public.employee_salaries es
   WHERE es.user_id = ANY(p_user_ids)
     AND (p_company_id IS NULL OR es.company_id = p_company_id)
     AND es.effective_from <= p_date
     AND (es.effective_to IS NULL OR es.effective_to >= p_date)
   ORDER BY es.user_id, es.effective_from DESC;
$$;

-- RPC: register a salary change (close current, open new) atomically
CREATE OR REPLACE FUNCTION public.register_salary_change(
  p_user_id uuid,
  p_company_id uuid,
  p_new_salary numeric,
  p_new_cargo text,
  p_effective_from date
) RETURNS public.employee_salaries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new public.employee_salaries;
BEGIN
  IF p_effective_from IS NULL THEN
    RAISE EXCEPTION 'effective_from is required';
  END IF;

  -- close all currently-open rows for this user/company
  UPDATE public.employee_salaries
     SET effective_to = p_effective_from - INTERVAL '1 day',
         is_active = false,
         updated_at = now()
   WHERE user_id = p_user_id
     AND (p_company_id IS NULL OR company_id = p_company_id)
     AND effective_to IS NULL;

  INSERT INTO public.employee_salaries
    (user_id, company_id, base_salary, cargo, is_active, effective_from)
  VALUES
    (p_user_id, p_company_id, p_new_salary, COALESCE(p_new_cargo, 'Colaborador'), true, p_effective_from)
  RETURNING * INTO v_new;

  RETURN v_new;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_salary_at(uuid, uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_salaries_at(uuid[], uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_salary_change(uuid, uuid, numeric, text, date) TO authenticated;