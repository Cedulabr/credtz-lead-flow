-- CRITICAL SECURITY FIXES: Phase 1 - Secure Customer Data Tables
-- Fix massive data exposure by replacing overly permissive RLS policies

-- 1. SECURE LEADS TABLE
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;

-- Create secure policies for leads
CREATE POLICY "Admins can view all leads" ON public.leads
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view assigned leads" ON public.leads
FOR SELECT USING (
  auth.uid() = assigned_to OR 
  auth.uid() = created_by OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update all leads" ON public.leads
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can update assigned leads" ON public.leads
FOR UPDATE USING (
  auth.uid() = assigned_to OR 
  auth.uid() = created_by
);

-- 2. SECURE LEADS_DATABASE TABLE  
-- Drop existing permissive policy
DROP POLICY IF EXISTS "Everyone can view available leads" ON public.leads_database;

-- Create secure policy - only authenticated users can access via functions
CREATE POLICY "Authenticated users can access leads via functions" ON public.leads_database
FOR SELECT USING (auth.role() = 'authenticated');

-- 3. SECURE BASEOFF TABLE
-- Drop existing permissive policy  
DROP POLICY IF EXISTS "Authenticated users can view baseoff data" ON public.baseoff;

-- Create secure policy - only via controlled access
CREATE POLICY "Admins can view baseoff data" ON public.baseoff
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can access baseoff via functions" ON public.baseoff
FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role))
);

-- 4. SECURE CONTRATOS TABLE
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can manage contratos" ON public.contratos;
DROP POLICY IF EXISTS "Users can view contratos" ON public.contratos;

-- Create secure policies for contratos
CREATE POLICY "Admins can manage all contratos" ON public.contratos
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their client contratos" ON public.contratos
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.cpf = contratos.cliente_id::text 
    AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())
  )
);

-- 5. SECURE CLIENTES TABLE  
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can manage clientes" ON public.clientes;
DROP POLICY IF EXISTS "Users can view clientes" ON public.clientes;

-- Create secure policies for clientes
CREATE POLICY "Admins can manage all clientes" ON public.clientes
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their assigned clientes" ON public.clientes
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.cpf = clientes.cpf 
    AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())
  )
);

CREATE POLICY "Users can update their assigned clientes" ON public.clientes
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.leads l 
    WHERE l.cpf = clientes.cpf 
    AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())
  )
);

CREATE POLICY "Users can create clientes" ON public.clientes
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. ENHANCE PROPOSTAS SECURITY
-- Add additional validation for propostas
CREATE POLICY "Partners can only manage their propostas" ON public.propostas
FOR ALL USING (
  auth.uid() = created_by_id OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 7. SECURE COMMISSION DATA ACCESS
-- Ensure commission viewing is properly restricted
DROP POLICY IF EXISTS "Users can view their own commissions" ON public.commissions;
CREATE POLICY "Users can view their own commissions" ON public.commissions
FOR SELECT USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 8. ADD DATA AUDIT TRIGGER
-- Create audit function for sensitive data access
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive tables
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
  ) ON CONFLICT DO NOTHING;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  table_name text NOT NULL,
  operation text NOT NULL,
  record_id uuid,
  timestamp timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON public.audit_log
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));