-- Add gestor SELECT access to user_documents table
CREATE POLICY "Gestors can view user_documents from same company"
ON public.user_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc1
    WHERE uc1.user_id = auth.uid()
    AND uc1.company_role = 'gestor'
    AND uc1.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc2
      WHERE uc2.user_id = user_documents.user_id
      AND uc2.company_id = uc1.company_id
      AND uc2.is_active = true
    )
  )
);

-- Add gestor UPDATE access to user_documents table
CREATE POLICY "Gestors can update user_documents from same company"
ON public.user_documents FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc1
    WHERE uc1.user_id = auth.uid()
    AND uc1.company_role = 'gestor'
    AND uc1.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc2
      WHERE uc2.user_id = user_documents.user_id
      AND uc2.company_id = uc1.company_id
      AND uc2.is_active = true
    )
  )
);

-- Add gestor SELECT access to user_data table
CREATE POLICY "Gestors can view user_data from same company"
ON public.user_data FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc1
    WHERE uc1.user_id = auth.uid()
    AND uc1.company_role = 'gestor'
    AND uc1.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc2
      WHERE uc2.user_id = user_data.user_id
      AND uc2.company_id = uc1.company_id
      AND uc2.is_active = true
    )
  )
);

-- Add gestor UPDATE access to user_data table
CREATE POLICY "Gestors can update user_data from same company"
ON public.user_data FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc1
    WHERE uc1.user_id = auth.uid()
    AND uc1.company_role = 'gestor'
    AND uc1.is_active = true
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc2
      WHERE uc2.user_id = user_data.user_id
      AND uc2.company_id = uc1.company_id
      AND uc2.is_active = true
    )
  )
);

-- Add gestor storage access for user-documents bucket
CREATE POLICY "Gestors can view user documents storage"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND EXISTS (
    SELECT 1 FROM public.user_companies uc1
    WHERE uc1.user_id = auth.uid()
    AND uc1.company_role = 'gestor'
    AND uc1.is_active = true
  )
);
