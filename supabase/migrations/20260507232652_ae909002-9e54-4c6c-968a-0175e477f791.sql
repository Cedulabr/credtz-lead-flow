
DROP POLICY IF EXISTS "Users can view passwords from their company" ON public.collaborative_passwords;
DROP POLICY IF EXISTS "Users can update passwords" ON public.collaborative_passwords;
DROP POLICY IF EXISTS "Users can delete passwords" ON public.collaborative_passwords;
CREATE POLICY "Users can view passwords from their company" ON public.collaborative_passwords
  FOR SELECT TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Users can update passwords" ON public.collaborative_passwords
  FOR UPDATE TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Users can delete passwords" ON public.collaborative_passwords
  FOR DELETE TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can view password history" ON public.collaborative_password_history;
CREATE POLICY "Users can view password history" ON public.collaborative_password_history
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collaborative_passwords p
    WHERE p.id = collaborative_password_history.password_id
      AND public.user_belongs_to_company(auth.uid(), p.company_id)));

DROP POLICY IF EXISTS "Users can view documents" ON public.collaborative_documents;
DROP POLICY IF EXISTS "Users can update documents" ON public.collaborative_documents;
DROP POLICY IF EXISTS "Users can delete documents" ON public.collaborative_documents;
CREATE POLICY "Users can view documents" ON public.collaborative_documents
  FOR SELECT TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Users can update documents" ON public.collaborative_documents
  FOR UPDATE TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Users can delete documents" ON public.collaborative_documents
  FOR DELETE TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can view links" ON public.collaborative_links;
DROP POLICY IF EXISTS "Users can update links" ON public.collaborative_links;
DROP POLICY IF EXISTS "Users can delete links" ON public.collaborative_links;
CREATE POLICY "Users can view links" ON public.collaborative_links
  FOR SELECT TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Users can update links" ON public.collaborative_links
  FOR UPDATE TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Users can delete links" ON public.collaborative_links
  FOR DELETE TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can view systems" ON public.collaborative_systems;
DROP POLICY IF EXISTS "Users can update systems" ON public.collaborative_systems;
DROP POLICY IF EXISTS "Users can delete systems" ON public.collaborative_systems;
CREATE POLICY "Users can view systems" ON public.collaborative_systems
  FOR SELECT TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Users can update systems" ON public.collaborative_systems
  FOR UPDATE TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Users can delete systems" ON public.collaborative_systems
  FOR DELETE TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can view processes" ON public.collaborative_processes;
DROP POLICY IF EXISTS "Users can update processes" ON public.collaborative_processes;
DROP POLICY IF EXISTS "Users can delete processes" ON public.collaborative_processes;
CREATE POLICY "Users can view processes" ON public.collaborative_processes
  FOR SELECT TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Users can update processes" ON public.collaborative_processes
  FOR UPDATE TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id));
CREATE POLICY "Users can delete processes" ON public.collaborative_processes
  FOR DELETE TO authenticated USING (public.user_belongs_to_company(auth.uid(), company_id));

DROP POLICY IF EXISTS "Users can view comments" ON public.collaborative_comments;
CREATE POLICY "Users can view comments" ON public.collaborative_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.collaborative_passwords x WHERE x.id = collaborative_comments.record_id AND public.user_belongs_to_company(auth.uid(), x.company_id))
    OR EXISTS (SELECT 1 FROM public.collaborative_documents x WHERE x.id = collaborative_comments.record_id AND public.user_belongs_to_company(auth.uid(), x.company_id))
    OR EXISTS (SELECT 1 FROM public.collaborative_links x WHERE x.id = collaborative_comments.record_id AND public.user_belongs_to_company(auth.uid(), x.company_id))
    OR EXISTS (SELECT 1 FROM public.collaborative_systems x WHERE x.id = collaborative_comments.record_id AND public.user_belongs_to_company(auth.uid(), x.company_id))
    OR EXISTS (SELECT 1 FROM public.collaborative_processes x WHERE x.id = collaborative_comments.record_id AND public.user_belongs_to_company(auth.uid(), x.company_id))
  );

DROP POLICY IF EXISTS "Users can view audit logs" ON public.collaborative_audit_log;
CREATE POLICY "Users can view audit logs" ON public.collaborative_audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.collaborative_passwords x WHERE x.id = collaborative_audit_log.record_id AND public.user_belongs_to_company(auth.uid(), x.company_id))
    OR EXISTS (SELECT 1 FROM public.collaborative_documents x WHERE x.id = collaborative_audit_log.record_id AND public.user_belongs_to_company(auth.uid(), x.company_id))
    OR EXISTS (SELECT 1 FROM public.collaborative_links x WHERE x.id = collaborative_audit_log.record_id AND public.user_belongs_to_company(auth.uid(), x.company_id))
    OR EXISTS (SELECT 1 FROM public.collaborative_systems x WHERE x.id = collaborative_audit_log.record_id AND public.user_belongs_to_company(auth.uid(), x.company_id))
    OR EXISTS (SELECT 1 FROM public.collaborative_processes x WHERE x.id = collaborative_audit_log.record_id AND public.user_belongs_to_company(auth.uid(), x.company_id))
  );
