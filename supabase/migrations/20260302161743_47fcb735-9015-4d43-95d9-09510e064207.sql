
-- Drop existing INSERT and DELETE policies that are too restrictive
DROP POLICY IF EXISTS "Users can insert own whatsapp instances" ON public.whatsapp_instances;
DROP POLICY IF EXISTS "Users can delete own whatsapp instances" ON public.whatsapp_instances;

-- Recreate INSERT policy: allow own, gestor for company, admin for all
CREATE POLICY "Users can insert whatsapp instances"
ON public.whatsapp_instances
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  OR is_global_admin(auth.uid())
  OR (company_id IS NOT NULL AND is_company_gestor(auth.uid(), company_id))
);

-- Recreate DELETE policy: allow own, gestor for company, admin for all
CREATE POLICY "Users can delete whatsapp instances"
ON public.whatsapp_instances
FOR DELETE
USING (
  auth.uid() = user_id
  OR is_global_admin(auth.uid())
  OR (company_id IS NOT NULL AND is_company_gestor(auth.uid(), company_id))
);
