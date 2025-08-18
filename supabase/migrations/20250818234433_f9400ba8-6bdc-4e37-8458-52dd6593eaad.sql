-- PHASE 4: COMPLETE DATABASE FUNCTION SECURITY
-- Update remaining functions to use secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$;

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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  invitation_record record;
BEGIN
  -- Check if there's a valid invitation for this email
  SELECT * INTO invitation_record 
  FROM public.invitations 
  WHERE email = NEW.email 
    AND NOT is_used 
    AND expires_at > now();
  
  -- Create profile based on invitation or default to partner
  INSERT INTO public.profiles (id, role, name, email)
  VALUES (
    NEW.id,
    COALESCE(invitation_record.role, 'partner'::app_role),
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email
  );
  
  -- Mark invitation as used if it exists
  IF invitation_record.id IS NOT NULL THEN
    UPDATE public.invitations 
    SET is_used = true, accepted_at = now()
    WHERE id = invitation_record.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Add role validation trigger to prevent unauthorized role changes
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS TRIGGER AS $validate$
BEGIN
  -- If role is being changed and user is not admin, reject
  IF OLD.role IS DISTINCT FROM NEW.role AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  
  RETURN NEW;
END;
$validate$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS validate_profile_role_change ON public.profiles;
CREATE TRIGGER validate_profile_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_change();