
DROP POLICY IF EXISTS "saved_proposals_select_scope" ON public.saved_proposals;

CREATE POLICY "saved_proposals_select_scope"
ON public.saved_proposals FOR SELECT TO authenticated
USING (
  public.is_global_admin(auth.uid())
  OR auth.uid() = user_id
  OR (
    company_id IS NOT NULL
    AND public.is_company_gestor(auth.uid(), company_id)
  )
);
