-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update leads assigned to them" ON public.activate_leads;

-- Create a new UPDATE policy that allows:
-- 1. Users to update leads already assigned to them
-- 2. Users to update unassigned leads (to claim them via "Gerar Leads")
-- 3. Admins to update any lead
-- 4. Gestors to update any lead
CREATE POLICY "Users can update assigned or unassigned leads"
ON public.activate_leads
FOR UPDATE
USING (
  -- User can update their own leads
  (auth.uid() = assigned_to)
  OR
  -- User can update unassigned leads (to claim them)
  (assigned_to IS NULL)
  OR
  -- Admin can update any lead
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::app_role
  ))
  OR
  -- Gestor can update any lead
  (EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.user_id = auth.uid() AND user_companies.company_role = 'gestor'::company_role
  ))
);

-- Also update the SELECT policy to include gestors
DROP POLICY IF EXISTS "Users can view leads assigned to them or unassigned" ON public.activate_leads;

CREATE POLICY "Users can view their leads or all if admin/gestor"
ON public.activate_leads
FOR SELECT
USING (
  -- User can see their own leads
  (auth.uid() = assigned_to)
  OR
  -- User can see unassigned leads (to request them)
  (assigned_to IS NULL)
  OR
  -- Admin can see all leads
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::app_role
  ))
  OR
  -- Gestor can see all leads
  (EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.user_id = auth.uid() AND user_companies.company_role = 'gestor'::company_role
  ))
);