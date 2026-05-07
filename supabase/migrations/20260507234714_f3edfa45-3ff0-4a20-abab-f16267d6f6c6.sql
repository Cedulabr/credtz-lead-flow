
DROP POLICY IF EXISTS "Users can view status history" ON public.televendas_status_history;
CREATE POLICY "Users can view status history" ON public.televendas_status_history
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.televendas t
      WHERE t.id = televendas_status_history.televendas_id
        AND (t.user_id = auth.uid() OR public.user_belongs_to_company(auth.uid(), t.company_id)))
  );

DROP POLICY IF EXISTS "Users can view status proposta history" ON public.televendas_status_proposta_history;
CREATE POLICY "Users can view status proposta history" ON public.televendas_status_proposta_history
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.televendas t
      WHERE t.id::text = televendas_status_proposta_history.televendas_id
        AND (t.user_id = auth.uid() OR public.user_belongs_to_company(auth.uid(), t.company_id)))
  );

DROP POLICY IF EXISTS "Authenticated users can view banking status history" ON public.televendas_status_bancario_history;
CREATE POLICY "Users can view banking status history" ON public.televendas_status_bancario_history
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.televendas t
      WHERE t.id::text = televendas_status_bancario_history.televendas_id
        AND (t.user_id = auth.uid() OR public.user_belongs_to_company(auth.uid(), t.company_id)))
  );
