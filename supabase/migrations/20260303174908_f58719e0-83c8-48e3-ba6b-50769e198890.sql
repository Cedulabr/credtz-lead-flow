-- Fix inverted arguments in client_documents DELETE policy
DROP POLICY IF EXISTS "Gestores can delete company documents" ON public.client_documents;

CREATE POLICY "Gestores can delete company documents"
  ON public.client_documents FOR DELETE
  TO authenticated
  USING (
    public.is_company_gestor(auth.uid(), company_id)
  );

-- Also fix SELECT/UPDATE policies if they have the same issue
DROP POLICY IF EXISTS "Gestores can view company documents" ON public.client_documents;

CREATE POLICY "Gestores can view company documents"
  ON public.client_documents FOR SELECT
  TO authenticated
  USING (
    public.is_company_gestor(auth.uid(), company_id)
    OR uploaded_by = auth.uid()
    OR public.is_global_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Gestores can update company documents" ON public.client_documents;

CREATE POLICY "Gestores can update company documents"
  ON public.client_documents FOR UPDATE
  TO authenticated
  USING (
    public.is_company_gestor(auth.uid(), company_id)
    OR uploaded_by = auth.uid()
    OR public.is_global_admin(auth.uid())
  );