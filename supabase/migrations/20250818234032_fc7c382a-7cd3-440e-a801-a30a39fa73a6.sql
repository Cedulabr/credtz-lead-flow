-- PHASE 1: CRITICAL DATA PROTECTION
-- Enable RLS on exposed tables that currently allow public access

-- Remove dangerous public policies first
DROP POLICY IF EXISTS "all" ON public.users;
DROP POLICY IF EXISTS "all" ON public.organizations; 
DROP POLICY IF EXISTS "all" ON public.propostas;
DROP POLICY IF EXISTS "all" ON public.form_submissions;
DROP POLICY IF EXISTS "all" ON public.user_profiles;
DROP POLICY IF EXISTS "all" ON public.form_templates;
DROP POLICY IF EXISTS "all" ON public.convenios;
DROP POLICY IF EXISTS "all" ON public.banks;
DROP POLICY IF EXISTS "all" ON public.products;

-- Enable RLS on tables that need protection
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.convenios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Secure baseoff table - restrict access to authenticated users with daily limits
DROP POLICY IF EXISTS "Everyone can view baseoff data" ON public.baseoff;
CREATE POLICY "Authenticated users can view baseoff data" 
ON public.baseoff 
FOR SELECT 
TO authenticated
USING (true);

-- PHASE 2: SECURE RLS POLICIES FOR CRITICAL TABLES

-- Users table - only admins can manage, users can view their own
CREATE POLICY "Admins can manage all users" 
ON public.users 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own user record" 
ON public.users 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

-- Organizations - only admins can manage
CREATE POLICY "Admins can manage organizations" 
ON public.organizations 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view organizations" 
ON public.organizations 
FOR SELECT 
TO authenticated
USING (true);

-- Propostas - users can manage their own, admins can manage all
CREATE POLICY "Users can manage their own propostas" 
ON public.propostas 
FOR ALL 
TO authenticated
USING (auth.uid() = created_by_id)
WITH CHECK (auth.uid() = created_by_id);

CREATE POLICY "Admins can manage all propostas" 
ON public.propostas 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Form submissions - restrict to authorized users
CREATE POLICY "Admins can manage form submissions" 
ON public.form_submissions 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view form submissions from their organization" 
ON public.form_submissions 
FOR SELECT 
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- User profiles - secure against role escalation
CREATE POLICY "Users can view their own user_profile" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own user_profile except role" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND (OLD.role = NEW.role OR has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Admins can manage all user_profiles" 
ON public.user_profiles 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Form templates - only admins can manage
CREATE POLICY "Admins can manage form templates" 
ON public.form_templates 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active form templates" 
ON public.form_templates 
FOR SELECT 
TO authenticated
USING (is_active = true);

-- Convenios, banks, products - only admins can manage
CREATE POLICY "Admins can manage convenios" 
ON public.convenios 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view convenios" 
ON public.convenios 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage banks" 
ON public.banks 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view banks" 
ON public.banks 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view products" 
ON public.products 
FOR SELECT 
TO authenticated
USING (true);

-- PHASE 3: PREVENT ROLE ESCALATION IN PROFILES TABLE
-- Update the profiles table policy to prevent users from changing their own role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

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

CREATE TRIGGER validate_profile_role_change
  BEFORE UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_change();