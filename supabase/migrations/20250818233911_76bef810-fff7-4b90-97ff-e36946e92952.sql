-- PHASE 1: CRITICAL DATA PROTECTION - Fixed version
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

-- Secure baseoff table - restrict access to authenticated users
DROP POLICY IF EXISTS "Everyone can view baseoff data" ON public.baseoff;
CREATE POLICY "Authenticated users can view baseoff data" 
ON public.baseoff 
FOR SELECT 
TO authenticated
USING (true);

-- PHASE 2: SECURE RLS POLICIES FOR CRITICAL TABLES

-- Users table policies
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

-- Organizations policies
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

-- Propostas policies
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

-- Form submissions policies
CREATE POLICY "Admins can manage form submissions" 
ON public.form_submissions 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- User profiles policies
CREATE POLICY "Users can view their own user_profile" 
ON public.user_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update their own user_profile except role" 
ON public.user_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can manage all user_profiles" 
ON public.user_profiles 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Form templates policies
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

-- Basic resource policies
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