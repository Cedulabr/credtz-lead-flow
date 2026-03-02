
-- ============================================================
-- PART 1: Fix RLS for leads table (gestores see company leads)
-- ============================================================

-- Drop duplicate/old SELECT policies on leads
DROP POLICY IF EXISTS "Admins can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view leads in their company" ON public.leads;
DROP POLICY IF EXISTS "leads_select_policy" ON public.leads;

-- Create unified SELECT policy for leads
CREATE POLICY "leads_select_policy" ON public.leads FOR SELECT USING (
  is_global_admin(auth.uid())
  OR company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR auth.uid() = assigned_to
  OR auth.uid() = created_by
  OR (
    is_gestor_or_admin(auth.uid())
    AND (
      user_in_same_company(assigned_to)
      OR user_in_same_company(requested_by)
    )
  )
);

-- Drop duplicate UPDATE policies on leads
DROP POLICY IF EXISTS "Admins can update all leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update assigned leads" ON public.leads;
DROP POLICY IF EXISTS "leads_update_policy" ON public.leads;

-- Create unified UPDATE policy for leads
CREATE POLICY "leads_update_policy" ON public.leads FOR UPDATE USING (
  is_global_admin(auth.uid())
  OR company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR auth.uid() = assigned_to
  OR auth.uid() = created_by
  OR (
    is_gestor_or_admin(auth.uid())
    AND (
      user_in_same_company(assigned_to)
      OR user_in_same_company(requested_by)
    )
  )
);

-- ============================================================
-- PART 2: Fix RLS for activate_leads (gestores see only company)
-- ============================================================

-- Drop overly permissive gestor policies
DROP POLICY IF EXISTS "Users can view their leads or all if admin/gestor" ON public.activate_leads;
DROP POLICY IF EXISTS "Users can update assigned or unassigned leads" ON public.activate_leads;
DROP POLICY IF EXISTS "activate_leads_select_policy" ON public.activate_leads;
DROP POLICY IF EXISTS "activate_leads_update_policy" ON public.activate_leads;

-- Create fixed SELECT policy for activate_leads
CREATE POLICY "activate_leads_select_policy" ON public.activate_leads FOR SELECT USING (
  is_global_admin(auth.uid())
  OR company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR auth.uid() = assigned_to
  OR auth.uid() = created_by
  OR (
    is_gestor_or_admin(auth.uid())
    AND (
      user_in_same_company(assigned_to)
      OR user_in_same_company(created_by)
    )
  )
);

-- Create fixed UPDATE policy for activate_leads
CREATE POLICY "activate_leads_update_policy" ON public.activate_leads FOR UPDATE USING (
  is_global_admin(auth.uid())
  OR company_id IN (SELECT get_user_company_ids(auth.uid()))
  OR auth.uid() = assigned_to
  OR (
    is_gestor_or_admin(auth.uid())
    AND (
      user_in_same_company(assigned_to)
      OR user_in_same_company(created_by)
    )
  )
);

-- ============================================================
-- PART 3: Create system_activity_logs table
-- ============================================================

CREATE TABLE public.system_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id),
  user_name text,
  user_email text,
  action text NOT NULL,
  module text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast querying
CREATE INDEX idx_activity_logs_user_id ON public.system_activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON public.system_activity_logs(action);
CREATE INDEX idx_activity_logs_module ON public.system_activity_logs(module);
CREATE INDEX idx_activity_logs_created_at ON public.system_activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.system_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read logs
CREATE POLICY "Admins can view all logs" ON public.system_activity_logs
  FOR SELECT USING (is_global_admin(auth.uid()));

-- Any authenticated user can insert logs (for self-logging)
CREATE POLICY "Authenticated users can insert logs" ON public.system_activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only admins can delete logs
CREATE POLICY "Admins can delete logs" ON public.system_activity_logs
  FOR DELETE USING (is_global_admin(auth.uid()));
