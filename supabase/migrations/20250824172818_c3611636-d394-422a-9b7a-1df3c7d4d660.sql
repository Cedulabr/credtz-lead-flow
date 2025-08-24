-- Remove overly permissive policy that allows all authenticated users to read leads_database
DROP POLICY IF EXISTS "Authenticated users can access leads via functions" ON public.leads_database;

-- Create more restrictive policies for leads_database
-- Only allow SELECT access through specific database functions (like request_leads)
CREATE POLICY "Leads database access only via functions" 
ON public.leads_database 
FOR SELECT 
USING (
  -- Only allow access when specifically enabled by secure functions
  current_setting('app.leads_access', true) = 'allowed'
  AND (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'partner'::app_role)
  )
);

-- Ensure only admins can manage the leads database directly
CREATE POLICY "Only admins can manage leads database directly" 
ON public.leads_database 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Update the request_leads function to properly set access control
CREATE OR REPLACE FUNCTION public.request_leads(convenio_filter text DEFAULT NULL::text, banco_filter text DEFAULT NULL::text, produto_filter text DEFAULT NULL::text, leads_requested integer DEFAULT 10)
RETURNS TABLE(lead_id uuid, name text, cpf text, phone text, convenio text, banco text, tipo_beneficio text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Set configuration to allow leads access
  PERFORM set_config('app.leads_access', 'allowed', true);
  
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
  
  -- Clear the configuration
  PERFORM set_config('app.leads_access', '', true);
END;
$function$;