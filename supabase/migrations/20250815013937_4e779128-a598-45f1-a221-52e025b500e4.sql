-- Fix security issues: Add search_path to functions
CREATE OR REPLACE FUNCTION public.check_daily_lead_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_limit integer;
  today_requests integer;
BEGIN
  -- Get current daily limit
  SELECT max_leads_per_day INTO daily_limit
  FROM public.daily_limits
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Count today's requests for the user
  SELECT COALESCE(SUM(leads_count), 0) INTO today_requests
  FROM public.lead_requests
  WHERE user_id = user_id_param
  AND DATE(requested_at) = CURRENT_DATE;
  
  -- Return remaining leads available
  RETURN GREATEST(0, daily_limit - today_requests);
END;
$$;

CREATE OR REPLACE FUNCTION public.request_leads(
  convenio_filter text DEFAULT NULL,
  banco_filter text DEFAULT NULL,
  produto_filter text DEFAULT NULL,
  leads_requested integer DEFAULT 10
)
RETURNS TABLE(
  lead_id uuid,
  name text,
  cpf text,
  phone text,
  convenio text,
  banco text,
  tipo_beneficio text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_limit integer;
  actual_leads_count integer;
BEGIN
  -- Check daily limit
  SELECT public.check_daily_lead_limit(auth.uid()) INTO remaining_limit;
  
  IF remaining_limit <= 0 THEN
    RAISE EXCEPTION 'Daily lead limit exceeded';
  END IF;
  
  -- Limit the requested amount to remaining limit
  actual_leads_count := LEAST(leads_requested, remaining_limit);
  
  -- Insert request record
  INSERT INTO public.lead_requests (user_id, convenio, banco, produto, leads_count)
  VALUES (auth.uid(), convenio_filter, banco_filter, produto_filter, actual_leads_count);
  
  -- Return leads matching filters
  RETURN QUERY
  SELECT 
    ld.id,
    ld.name,
    ld.cpf,
    ld.phone,
    ld.convenio,
    ld.banco,
    ld.tipo_beneficio
  FROM public.leads_database ld
  WHERE ld.is_available = true
    AND (convenio_filter IS NULL OR ld.convenio = convenio_filter)
    AND (banco_filter IS NULL OR ld.banco = banco_filter)
  ORDER BY RANDOM()
  LIMIT actual_leads_count;
END;
$$;