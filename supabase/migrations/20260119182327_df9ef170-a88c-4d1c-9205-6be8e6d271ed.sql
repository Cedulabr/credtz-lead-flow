-- Drop the existing policy that only allows gestors/admins
DROP POLICY IF EXISTS "Admins and gestors can manage simulations" ON public.activate_leads_simulations;

-- Create separate policies for better control
-- Admins and gestors can do everything
CREATE POLICY "Gestors and admins full access"
ON public.activate_leads_simulations
FOR ALL
USING (public.is_gestor_or_admin(auth.uid()))
WITH CHECK (public.is_gestor_or_admin(auth.uid()));

-- Users can insert their own simulation requests
CREATE POLICY "Users can request simulations"
ON public.activate_leads_simulations
FOR INSERT
WITH CHECK (auth.uid() = requested_by);

-- Users can update simulations they requested (for confirmation)
CREATE POLICY "Users can confirm their simulations"
ON public.activate_leads_simulations
FOR UPDATE
USING (auth.uid() = requested_by)
WITH CHECK (auth.uid() = requested_by);