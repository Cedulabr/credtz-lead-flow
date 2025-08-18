-- PHASE 3: PREVENT ROLE ESCALATION IN PROFILES TABLE
-- Update the profiles table policy to prevent users from changing their own role
DROP POLICY IF EXISTS "Users can update their own profile except role" ON public.profiles;

CREATE POLICY "Users can update their own profile except role" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id AND 
  (OLD.role = NEW.role OR has_role(auth.uid(), 'admin'::app_role))
);

-- PHASE 4: DATABASE FUNCTION SECURITY
-- Update functions to use secure search_path
CREATE OR REPLACE FUNCTION public.check_daily_lead_limit(user_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.check_baseoff_daily_limit(user_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  daily_limit integer := 80;
  today_usage integer;
BEGIN
  -- Get today's usage for the user
  SELECT COALESCE(quantidade_leads, 0) INTO today_usage
  FROM public.registrodiariobaseoff
  WHERE user_id = user_id_param
  AND data_registro = CURRENT_DATE;
  
  -- Return remaining leads available
  RETURN GREATEST(0, daily_limit - COALESCE(today_usage, 0));
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_daily_baseoff_usage(user_id_param uuid, leads_count_param integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.registrodiariobaseoff (user_id, data_registro, quantidade_leads)
  VALUES (user_id_param, CURRENT_DATE, leads_count_param)
  ON CONFLICT (user_id, data_registro)
  DO UPDATE SET 
    quantidade_leads = registrodiariobaseoff.quantidade_leads + leads_count_param,
    updated_at = now();
END;
$function$;

-- Add role validation trigger to prevent unauthorized role changes
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is being changed and user is not admin, reject
  IF OLD.role != NEW.role AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS validate_profile_role_change ON public.profiles;
CREATE TRIGGER validate_profile_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_change();