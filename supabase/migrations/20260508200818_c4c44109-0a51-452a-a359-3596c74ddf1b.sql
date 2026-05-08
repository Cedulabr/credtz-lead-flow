DROP POLICY IF EXISTS "adj_insert_admin" ON public.time_clock_adjustment_requests;
CREATE POLICY "adj_insert_admin" ON public.time_clock_adjustment_requests
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_safe(auth.uid()::text, 'admin'));

DROP POLICY IF EXISTS "adj_insert_gestor" ON public.time_clock_adjustment_requests;
CREATE POLICY "adj_insert_gestor" ON public.time_clock_adjustment_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_companies uc_actor
      JOIN public.user_companies uc_target ON uc_target.company_id = uc_actor.company_id
      WHERE uc_actor.user_id = auth.uid()
        AND uc_actor.is_active = true
        AND uc_actor.company_role = 'gestor'
        AND uc_target.user_id = time_clock_adjustment_requests.user_id
        AND uc_target.is_active = true
    )
  );

-- Also allow admin/gestor to UPDATE (already exists for admin/gestor via earlier policies; ensure idempotent)