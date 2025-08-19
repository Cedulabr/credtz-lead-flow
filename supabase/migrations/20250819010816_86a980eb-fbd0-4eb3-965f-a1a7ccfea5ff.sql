-- CRITICAL SECURITY HARDENING - Phase 2: Additional Security Components

-- 1. CREATE RATE LIMITING TABLE AND FUNCTION (if not already exists)
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

-- Drop existing policy and recreate
DROP POLICY IF EXISTS "Only admins can view rate limits" ON rate_limits;
CREATE POLICY "Only admins can view rate limits" ON rate_limits
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. CREATE/UPDATE ENHANCED SECURITY FUNCTIONS
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

-- 3. INPUT VALIDATION FUNCTIONS
-- CPF validation function with proper algorithm check
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  cpf text;
  sum_1 integer := 0;
  sum_2 integer := 0;
  digit_1 integer;
  digit_2 integer;
  i integer;
BEGIN
  -- Remove formatting
  cpf := regexp_replace(cpf_input, '[^0-9]', '', 'g');
  
  -- Check length and known invalid sequences
  IF length(cpf) != 11 OR 
     cpf IN ('00000000000', '11111111111', '22222222222', '33333333333', 
             '44444444444', '55555555555', '66666666666', '77777777777',
             '88888888888', '99999999999') THEN
    RETURN false;
  END IF;
  
  -- Calculate first verification digit
  FOR i IN 1..9 LOOP
    sum_1 := sum_1 + (substring(cpf, i, 1)::integer * (11 - i));
  END LOOP;
  
  digit_1 := 11 - (sum_1 % 11);
  IF digit_1 >= 10 THEN
    digit_1 := 0;
  END IF;
  
  -- Calculate second verification digit
  FOR i IN 1..10 LOOP
    sum_2 := sum_2 + (substring(cpf, i, 1)::integer * (12 - i));
  END LOOP;
  
  digit_2 := 11 - (sum_2 % 11);
  IF digit_2 >= 10 THEN
    digit_2 := 0;
  END IF;
  
  -- Verify digits
  RETURN digit_1 = substring(cpf, 10, 1)::integer AND 
         digit_2 = substring(cpf, 11, 1)::integer;
END;
$$;

-- Email validation function
CREATE OR REPLACE FUNCTION public.validate_email(email_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN email_input ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- Phone validation function
CREATE OR REPLACE FUNCTION public.validate_phone(phone_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  phone text;
BEGIN
  -- Remove formatting
  phone := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  -- Check if it's a valid Brazilian phone number (10 or 11 digits)
  RETURN length(phone) IN (10, 11) AND phone ~ '^[0-9]+$';
END;
$$;

-- 4. ENHANCED AUDIT TRIGGERS FOR SENSITIVE OPERATIONS
-- Improved audit function for sensitive data access
CREATE OR REPLACE FUNCTION public.audit_sensitive_operation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log all operations on sensitive tables
  INSERT INTO public.audit_log (
    user_id, 
    table_name, 
    operation, 
    record_id, 
    timestamp
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_leads_trigger ON leads;
CREATE TRIGGER audit_leads_trigger
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_operation();

DROP TRIGGER IF EXISTS audit_clientes_trigger ON clientes;
CREATE TRIGGER audit_clientes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_operation();

DROP TRIGGER IF EXISTS audit_contratos_trigger ON contratos;
CREATE TRIGGER audit_contratos_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contratos
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_operation();

-- 5. SECURE DATA ACCESS MONITORING
-- Function to detect suspicious access patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(
  user_id_param uuid,
  time_window_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_activity jsonb;
  activity_count integer;
  bulk_operations integer;
BEGIN
  -- Only admins can check suspicious activity
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;
  
  -- Count recent activities
  SELECT COUNT(*) INTO activity_count
  FROM public.audit_log
  WHERE user_id = user_id_param
    AND timestamp > now() - (time_window_minutes || ' minutes')::interval;
  
  -- Count bulk operations (operations affecting baseoff or similar sensitive tables)
  SELECT COUNT(*) INTO bulk_operations
  FROM public.audit_log
  WHERE user_id = user_id_param
    AND table_name IN ('baseoff', 'leads_database', 'clientes')
    AND operation LIKE '%BULK%'
    AND timestamp > now() - (time_window_minutes || ' minutes')::interval;
  
  -- Build activity summary
  SELECT jsonb_build_object(
    'user_id', user_id_param,
    'time_window_minutes', time_window_minutes,
    'total_operations', activity_count,
    'bulk_operations', bulk_operations,
    'suspicious_level', CASE
      WHEN bulk_operations > 5 OR activity_count > 100 THEN 'HIGH'
      WHEN bulk_operations > 2 OR activity_count > 50 THEN 'MEDIUM'
      WHEN bulk_operations > 0 OR activity_count > 20 THEN 'LOW'
      ELSE 'NORMAL'
    END,
    'checked_at', now()
  ) INTO recent_activity;
  
  RETURN recent_activity;
END;
$$;