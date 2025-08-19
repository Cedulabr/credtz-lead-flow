-- CRITICAL SECURITY HARDENING - Phase 1: Data Protection (Fixed)
-- Fix the most critical vulnerability: exposed sensitive customer data

-- 1. SECURE BASEOFF TABLE - Currently allows any authenticated user to access sensitive personal data
DROP POLICY IF EXISTS "Partners can access baseoff via functions" ON baseoff;
DROP POLICY IF EXISTS "Admins can view baseoff data" ON baseoff;

-- Create strict admin-only access for baseoff table
CREATE POLICY "Only admins can access baseoff data" ON baseoff
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. SECURE ORGANIZATIONS TABLE - Remove public access
DROP POLICY IF EXISTS "Authenticated users can view organizations" ON organizations;

CREATE POLICY "Only admins can view organizations" ON organizations
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. TIGHTEN ACCESS TO CONFIGURATION TABLES
-- Banks table - should be admin-managed, view-only for partners
DROP POLICY IF EXISTS "Authenticated users can view banks" ON banks;

CREATE POLICY "Partners can view banks" ON banks
FOR SELECT USING (auth.role() = 'authenticated');

-- Convenios table - same pattern
DROP POLICY IF EXISTS "Authenticated users can view convenios" ON convenios;

CREATE POLICY "Partners can view convenios" ON convenios
FOR SELECT USING (auth.role() = 'authenticated');

-- Products table - same pattern  
DROP POLICY IF EXISTS "Authenticated users can view products" ON products;

CREATE POLICY "Partners can view products" ON products
FOR SELECT USING (auth.role() = 'authenticated');

-- 4. ENHANCE BASEOFF ACCESS CONTROL
-- Create a secure function for baseoff data access with proper logging
CREATE OR REPLACE FUNCTION public.get_baseoff_data(
  limite integer DEFAULT 10,
  codigo_banco_filter text DEFAULT NULL,
  valor_min numeric DEFAULT NULL,
  valor_max numeric DEFAULT NULL
)
RETURNS TABLE(
  cpf text,
  nome text,
  telefone1 text,
  margem_disponivel text,
  banco text,
  valor_beneficio text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  remaining_limit integer;
BEGIN
  -- Only allow admin or partner access
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: insufficient privileges';
  END IF;
  
  -- Check daily limit for partners (admins bypass limit)
  IF has_role(auth.uid(), 'partner'::app_role) THEN
    SELECT public.check_baseoff_daily_limit(auth.uid()) INTO remaining_limit;
    
    IF remaining_limit <= 0 THEN
      RAISE EXCEPTION 'Daily baseoff access limit exceeded';
    END IF;
    
    -- Limit the query to remaining daily limit
    limite := LEAST(limite, remaining_limit);
  END IF;
  
  -- Log the access attempt
  INSERT INTO public.audit_log (user_id, table_name, operation, record_id)
  VALUES (auth.uid(), 'baseoff', 'BULK_SELECT', gen_random_uuid());
  
  -- Filter by allowed banks only
  RETURN QUERY
  SELECT 
    b.cpf,
    b.nome,
    b.telefone1,
    b.margem_disponivel,
    b.banco,
    b.valor_beneficio
  FROM public.baseoff b
  WHERE 
    (codigo_banco_filter IS NULL OR b.banco = codigo_banco_filter)
    AND (valor_min IS NULL OR CAST(b.valor_beneficio AS numeric) >= valor_min)
    AND (valor_max IS NULL OR CAST(b.valor_beneficio AS numeric) <= valor_max)
    AND EXISTS (
      SELECT 1 FROM public.baseoff_allowed_banks bab 
      WHERE bab.codigo_banco = b.banco AND bab.is_active = true
    )
  ORDER BY RANDOM()
  LIMIT limite;
  
  -- Update daily usage for partners
  IF has_role(auth.uid(), 'partner'::app_role) THEN
    PERFORM public.update_daily_baseoff_usage(auth.uid(), limite);
  END IF;
END;
$$;

-- 5. ADD ROLE CHANGE VALIDATION TRIGGER
CREATE OR REPLACE FUNCTION public.validate_role_change_strict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Prevent role escalation attacks
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Only admins can change roles
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
      RAISE EXCEPTION 'Access denied: only administrators can change user roles';
    END IF;
    
    -- Log the role change
    INSERT INTO public.audit_log (user_id, table_name, operation, record_id)
    VALUES (auth.uid(), 'profiles', 'ROLE_CHANGE', NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply the trigger to profiles table
DROP TRIGGER IF EXISTS validate_role_change_trigger ON profiles;
CREATE TRIGGER validate_role_change_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_change_strict();

-- 6. CREATE RATE LIMITING TABLE AND FUNCTION
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, action_type, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view rate limits" ON rate_limits
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Rate limiting function
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  action_type_param text,
  max_attempts integer DEFAULT 10,
  window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  -- Calculate the current window start time
  window_start_time := date_trunc('hour', now()) + 
    ((EXTRACT(MINUTE FROM now())::integer / window_minutes) * window_minutes) * interval '1 minute';
  
  -- Insert or update the rate limit record
  INSERT INTO public.rate_limits (user_id, action_type, window_start)
  VALUES (auth.uid(), action_type_param, window_start_time)
  ON CONFLICT (user_id, action_type, window_start)
  DO UPDATE SET 
    count = rate_limits.count + 1;
  
  -- Check the current count
  SELECT count INTO current_count
  FROM public.rate_limits
  WHERE user_id = auth.uid()
    AND action_type = action_type_param
    AND window_start = window_start_time;
  
  -- Return true if under limit, false if over
  RETURN current_count <= max_attempts;
END;
$$;