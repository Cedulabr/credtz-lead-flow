
-- Helper functions for autolead worker to increment counters
CREATE OR REPLACE FUNCTION public.autolead_increment_sent(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.autolead_jobs
  SET leads_sent = leads_sent + 1
  WHERE id = p_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.autolead_increment_failed(p_job_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.autolead_jobs
  SET leads_failed = leads_failed + 1
  WHERE id = p_job_id;
END;
$$;
