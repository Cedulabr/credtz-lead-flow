-- ========================================
-- Fix RLS for user_data module - Company isolation for Gestores
-- ========================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Partner can view all user data" ON public.user_data;
DROP POLICY IF EXISTS "Partner can update any user data" ON public.user_data;
DROP POLICY IF EXISTS "Partner can view all documents" ON public.user_documents;
DROP POLICY IF EXISTS "Partner can update any document" ON public.user_documents;
DROP POLICY IF EXISTS "Partner can view all history" ON public.user_data_history;
DROP POLICY IF EXISTS "Admin can view all user data" ON public.user_data;
DROP POLICY IF EXISTS "Admin can update all user data" ON public.user_data;
DROP POLICY IF EXISTS "Admin can view all documents" ON public.user_documents;
DROP POLICY IF EXISTS "Admin can update all documents" ON public.user_documents;
DROP POLICY IF EXISTS "Admin can view all history" ON public.user_data_history;

-- Helper function to get company IDs of a user via user_companies
CREATE OR REPLACE FUNCTION public.get_user_data_company_ids(check_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_companies WHERE user_id = check_user_id
$$;

-- Helper function to check if target user belongs to same company as current user
CREATE OR REPLACE FUNCTION public.user_in_same_company(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_companies uc1
    INNER JOIN public.user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid()
    AND uc2.user_id = target_user_id
  )
$$;

-- ========================================
-- user_data policies
-- ========================================

-- Admins can view all user_data
CREATE POLICY "Admins can view all user_data"
  ON public.user_data FOR SELECT
  USING (public.is_global_admin(auth.uid()));

-- Admins can update all user_data
CREATE POLICY "Admins can update all user_data"
  ON public.user_data FOR UPDATE
  USING (public.is_global_admin(auth.uid()));

-- Partners/Gestores can only view user_data of users in the same company
CREATE POLICY "Partners can view user_data from same company"
  ON public.user_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'partner'
    )
    AND public.user_in_same_company(user_id)
  );

-- Partners/Gestores can only update user_data of users in the same company
CREATE POLICY "Partners can update user_data from same company"
  ON public.user_data FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'partner'
    )
    AND public.user_in_same_company(user_id)
  );

-- ========================================
-- user_documents policies
-- ========================================

-- Admins can view all user_documents
CREATE POLICY "Admins can view all user_documents"
  ON public.user_documents FOR SELECT
  USING (public.is_global_admin(auth.uid()));

-- Admins can update all user_documents
CREATE POLICY "Admins can update all user_documents"
  ON public.user_documents FOR UPDATE
  USING (public.is_global_admin(auth.uid()));

-- Partners/Gestores can only view user_documents of users in the same company
CREATE POLICY "Partners can view user_documents from same company"
  ON public.user_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'partner'
    )
    AND public.user_in_same_company(user_id)
  );

-- Partners/Gestores can only update user_documents of users in the same company
CREATE POLICY "Partners can update user_documents from same company"
  ON public.user_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'partner'
    )
    AND public.user_in_same_company(user_id)
  );

-- ========================================
-- user_data_history policies
-- ========================================

-- Admins can view all history
CREATE POLICY "Admins can view all user_data_history"
  ON public.user_data_history FOR SELECT
  USING (public.is_global_admin(auth.uid()));

-- Partners can only view history of users in the same company
CREATE POLICY "Partners can view user_data_history from same company"
  ON public.user_data_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'partner'
    )
    AND EXISTS (
      SELECT 1 FROM public.user_data ud
      WHERE ud.id = user_data_id
      AND public.user_in_same_company(ud.user_id)
    )
  );