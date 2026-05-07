
UPDATE storage.buckets SET public = false WHERE id IN ('time-clock-photos','time-clock-documents');

DROP POLICY IF EXISTS "Time clock photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view time clock docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view simulation files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own proofs" ON storage.objects;

CREATE POLICY "tcdocs_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'time-clock-documents' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "tcdocs_select_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'time-clock-documents' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "tcdocs_select_gestor" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'time-clock-documents' AND EXISTS (
    SELECT 1 FROM public.user_companies uc WHERE uc.user_id = auth.uid()
      AND uc.company_role = 'gestor'::company_role AND uc.is_active = true));

CREATE POLICY "simulations_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'simulations' AND (auth.uid())::text = (storage.foldername(name))[1]);
CREATE POLICY "simulations_select_admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'simulations' AND public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "simulations_select_gestor" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'simulations' AND EXISTS (
    SELECT 1 FROM public.user_companies uc WHERE uc.user_id = auth.uid()
      AND uc.company_role = 'gestor'::company_role AND uc.is_active = true));

CREATE POLICY "contact_proofs_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'contact-proofs' AND (auth.uid())::text = (storage.foldername(name))[1]);
