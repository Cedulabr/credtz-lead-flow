-- 1. Add deadline columns to leads table
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS treatment_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS treated_at timestamptz,
  ADD COLUMN IF NOT EXISTS treatment_status text DEFAULT 'pending';

-- 2. Create index for overdue queries
CREATE INDEX IF NOT EXISTS idx_leads_treatment_deadline 
  ON public.leads(treatment_deadline) 
  WHERE treatment_status = 'pending';

-- 3. Create lead_treatment_log table
CREATE TABLE IF NOT EXISTS public.lead_treatment_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  status text NOT NULL,
  contact_date timestamptz NOT NULL,
  notes text,
  follow_up_date timestamptz,
  follow_up_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_treatment_log ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own treatment logs" ON public.lead_treatment_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own treatment logs" ON public.lead_treatment_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all treatment logs" ON public.lead_treatment_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Create preview_available_leads RPC
CREATE OR REPLACE FUNCTION public.preview_available_leads(
  convenio_filter text DEFAULT NULL,
  ddd_filter text[] DEFAULT NULL,
  tag_filter text[] DEFAULT NULL,
  max_count int DEFAULT 20
)
RETURNS TABLE(name text, phone_masked text, convenio text, total_available bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_count bigint;
BEGIN
  -- Count total available
  SELECT COUNT(*) INTO total_count
  FROM leads_database ld
  WHERE ld.is_available = true
    AND (convenio_filter IS NULL OR ld.convenio = convenio_filter)
    AND (ddd_filter IS NULL OR SUBSTRING(ld.phone FROM 1 FOR 2) = ANY(ddd_filter))
    AND (tag_filter IS NULL OR ld.tag = ANY(tag_filter))
    AND NOT EXISTS (
      SELECT 1 FROM leads_blacklist bl 
      WHERE bl.cpf = ld.cpf AND bl.expires_at > now()
    );

  RETURN QUERY
  SELECT 
    ld.name,
    CONCAT('(', SUBSTRING(ld.phone FROM 1 FOR 2), ') ', SUBSTRING(ld.phone FROM 3 FOR 1), '****-', RIGHT(ld.phone, 4)) AS phone_masked,
    ld.convenio,
    total_count AS total_available
  FROM leads_database ld
  WHERE ld.is_available = true
    AND (convenio_filter IS NULL OR ld.convenio = convenio_filter)
    AND (ddd_filter IS NULL OR SUBSTRING(ld.phone FROM 1 FOR 2) = ANY(ddd_filter))
    AND (tag_filter IS NULL OR ld.tag = ANY(tag_filter))
    AND NOT EXISTS (
      SELECT 1 FROM leads_blacklist bl 
      WHERE bl.cpf = ld.cpf AND bl.expires_at > now()
    )
  ORDER BY ld.created_at DESC
  LIMIT max_count;
END;
$$;

-- 5. Create blacklist_lead_with_duration function
CREATE OR REPLACE FUNCTION public.blacklist_lead_with_duration(
  lead_id_param uuid,
  lead_cpf text,
  reason_param text,
  duration_days int DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update lead status
  UPDATE leads 
  SET status = reason_param,
      assigned_to = NULL,
      updated_at = now(),
      treated_at = now(),
      treatment_status = 'treated'
  WHERE id = lead_id_param;

  -- Mark as unavailable in leads_database
  UPDATE leads_database 
  SET is_available = false 
  WHERE cpf = lead_cpf;

  -- Insert into blacklist with custom duration
  INSERT INTO leads_blacklist (cpf, reason, expires_at, created_by)
  VALUES (lead_cpf, reason_param, now() + (duration_days || ' days')::interval, auth.uid())
  ON CONFLICT (cpf) DO UPDATE SET 
    reason = EXCLUDED.reason,
    expires_at = EXCLUDED.expires_at;
END;
$$;