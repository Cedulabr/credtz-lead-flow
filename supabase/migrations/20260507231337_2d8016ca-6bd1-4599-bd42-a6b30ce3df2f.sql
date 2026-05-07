
-- app_users
DROP POLICY IF EXISTS "app_users_select_own" ON public.app_users;
DROP POLICY IF EXISTS "app_users_update_own" ON public.app_users;
DROP POLICY IF EXISTS "app_users_insert" ON public.app_users;
CREATE POLICY "app_users_select_own" ON public.app_users
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "app_users_update_own" ON public.app_users
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "app_users_insert_own" ON public.app_users
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- baseoff
DROP POLICY IF EXISTS "Authenticated users can view baseoff clients" ON public.baseoff_clients;
DROP POLICY IF EXISTS "Authenticated users can view baseoff contracts" ON public.baseoff_contracts;
CREATE POLICY "Admins and gestors can view baseoff clients" ON public.baseoff_clients
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_role = 'gestor'::company_role AND uc.is_active = true)
  );
CREATE POLICY "Admins and gestors can view baseoff contracts" ON public.baseoff_contracts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_role = 'gestor'::company_role AND uc.is_active = true)
  );

-- ai_settings
DROP POLICY IF EXISTS "Admins can manage ai_settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Users can view ai_settings" ON public.ai_settings;
CREATE POLICY "Admins can manage ai_settings" ON public.ai_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can read ai_settings" ON public.ai_settings
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- tcpv
DROP POLICY IF EXISTS "tcpv_public_validate" ON public.time_clock_pdf_validations;
CREATE POLICY "tcpv_owner_or_admin_select" ON public.time_clock_pdf_validations
  FOR SELECT TO authenticated
  USING (auth.uid() = generated_by OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.validate_time_clock_pdf(p_hash text)
RETURNS TABLE (hash text, period_start date, period_end date, generated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT v.hash, v.period_start, v.period_end, v.generated_at
  FROM public.time_clock_pdf_validations v
  WHERE v.hash LIKE (p_hash || '%')
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.validate_time_clock_pdf(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_time_clock_pdf(text) TO anon, authenticated;

-- clientes INSERT
DROP POLICY IF EXISTS "Users can create clientes" ON public.clientes;
CREATE POLICY "Users can create clientes" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.leads l
      WHERE l.cpf = clientes.cpf
        AND (l.created_by = auth.uid() OR l.assigned_to = auth.uid()))
  );
