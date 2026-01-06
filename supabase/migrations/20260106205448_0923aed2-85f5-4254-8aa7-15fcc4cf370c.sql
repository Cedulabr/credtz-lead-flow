-- =============================================
-- FIX: Isolamento de dados por empresa para Gestores
-- Apenas admin tem visão global, gestores veem apenas sua empresa
-- =============================================

-- 1. Criar função helper para verificar se usuário pertence a uma empresa
CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = _user_id
      AND company_id = _company_id
      AND is_active = true
  )
$$;

-- 2. Função para obter IDs das empresas do usuário (com SET search_path)
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_companies
  WHERE user_id = _user_id AND is_active = true
$$;

-- 3. Função para verificar se é admin global
CREATE OR REPLACE FUNCTION public.is_global_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'
  )
$$;

-- =============================================
-- ACTIVATE_LEADS - Corrigir políticas
-- =============================================
DROP POLICY IF EXISTS "Users can view leads assigned to them or unassigned" ON public.activate_leads;
DROP POLICY IF EXISTS "Users can update leads assigned to them" ON public.activate_leads;
DROP POLICY IF EXISTS "Admin and gestor can insert leads" ON public.activate_leads;
DROP POLICY IF EXISTS "Admin can delete leads" ON public.activate_leads;
DROP POLICY IF EXISTS "activate_leads_select_policy" ON public.activate_leads;
DROP POLICY IF EXISTS "activate_leads_insert_policy" ON public.activate_leads;
DROP POLICY IF EXISTS "activate_leads_update_policy" ON public.activate_leads;
DROP POLICY IF EXISTS "activate_leads_delete_policy" ON public.activate_leads;

CREATE POLICY "activate_leads_select_policy" 
ON public.activate_leads FOR SELECT 
USING (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR auth.uid() = assigned_to
  OR auth.uid() = created_by
);

CREATE POLICY "activate_leads_insert_policy" 
ON public.activate_leads FOR INSERT 
WITH CHECK (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
);

CREATE POLICY "activate_leads_update_policy" 
ON public.activate_leads FOR UPDATE 
USING (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR auth.uid() = assigned_to
);

CREATE POLICY "activate_leads_delete_policy" 
ON public.activate_leads FOR DELETE 
USING (public.is_global_admin(auth.uid()));

-- =============================================
-- LEADS - Corrigir políticas
-- =============================================
DROP POLICY IF EXISTS "Users can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete leads" ON public.leads;
DROP POLICY IF EXISTS "leads_select_policy" ON public.leads;
DROP POLICY IF EXISTS "leads_insert_policy" ON public.leads;
DROP POLICY IF EXISTS "leads_update_policy" ON public.leads;
DROP POLICY IF EXISTS "leads_delete_policy" ON public.leads;

CREATE POLICY "leads_select_policy" 
ON public.leads FOR SELECT 
USING (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR auth.uid() = assigned_to
  OR auth.uid() = created_by
);

CREATE POLICY "leads_insert_policy" 
ON public.leads FOR INSERT 
WITH CHECK (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
);

CREATE POLICY "leads_update_policy" 
ON public.leads FOR UPDATE 
USING (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR auth.uid() = assigned_to
);

CREATE POLICY "leads_delete_policy" 
ON public.leads FOR DELETE 
USING (public.is_global_admin(auth.uid()));

-- =============================================
-- LEADS_INDICADOS - Corrigir políticas
-- =============================================
DROP POLICY IF EXISTS "Users can view their indicated leads" ON public.leads_indicados;
DROP POLICY IF EXISTS "Users can insert indicated leads" ON public.leads_indicados;
DROP POLICY IF EXISTS "Users can update their indicated leads" ON public.leads_indicados;
DROP POLICY IF EXISTS "leads_indicados_select_policy" ON public.leads_indicados;
DROP POLICY IF EXISTS "leads_indicados_insert_policy" ON public.leads_indicados;
DROP POLICY IF EXISTS "leads_indicados_update_policy" ON public.leads_indicados;

CREATE POLICY "leads_indicados_select_policy" 
ON public.leads_indicados FOR SELECT 
USING (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR auth.uid() = created_by
);

CREATE POLICY "leads_indicados_insert_policy" 
ON public.leads_indicados FOR INSERT 
WITH CHECK (
  auth.uid() = created_by
);

CREATE POLICY "leads_indicados_update_policy" 
ON public.leads_indicados FOR UPDATE 
USING (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
);

-- =============================================
-- CLIENT_DOCUMENTS - Corrigir políticas
-- =============================================
DROP POLICY IF EXISTS "Users can view documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can insert documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can update documents" ON public.client_documents;
DROP POLICY IF EXISTS "Users can delete documents" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents_select_policy" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents_insert_policy" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents_update_policy" ON public.client_documents;
DROP POLICY IF EXISTS "client_documents_delete_policy" ON public.client_documents;

CREATE POLICY "client_documents_select_policy" 
ON public.client_documents FOR SELECT 
USING (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR auth.uid() = uploaded_by
);

CREATE POLICY "client_documents_insert_policy" 
ON public.client_documents FOR INSERT 
WITH CHECK (
  auth.uid() = uploaded_by
);

CREATE POLICY "client_documents_update_policy" 
ON public.client_documents FOR UPDATE 
USING (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
);

CREATE POLICY "client_documents_delete_policy" 
ON public.client_documents FOR DELETE 
USING (
  public.is_global_admin(auth.uid())
  OR public.is_company_gestor(company_id, auth.uid())
);

-- =============================================
-- TELEVENDAS - Garantir isolamento por empresa
-- =============================================
DROP POLICY IF EXISTS "Users can view their own televendas" ON public.televendas;
DROP POLICY IF EXISTS "Users can view televendas (owner, admin, gestor)" ON public.televendas;
DROP POLICY IF EXISTS "televendas_select_policy" ON public.televendas;

CREATE POLICY "televendas_select_policy" 
ON public.televendas FOR SELECT 
USING (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR auth.uid() = user_id
);

-- =============================================
-- PROPOSTAS - Garantir isolamento por empresa (usa created_by_id)
-- =============================================
DROP POLICY IF EXISTS "Users can view proposals" ON public.propostas;
DROP POLICY IF EXISTS "propostas_select_policy" ON public.propostas;

CREATE POLICY "propostas_select_policy" 
ON public.propostas FOR SELECT 
USING (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR auth.uid() = created_by_id
);

-- =============================================
-- COMMISSIONS - Garantir isolamento por empresa
-- =============================================
DROP POLICY IF EXISTS "Users can view their own commissions" ON public.commissions;
DROP POLICY IF EXISTS "Users can view commissions in their company" ON public.commissions;
DROP POLICY IF EXISTS "commissions_select_policy" ON public.commissions;

CREATE POLICY "commissions_select_policy" 
ON public.commissions FOR SELECT 
USING (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR auth.uid() = user_id
);

-- =============================================
-- CLIENT_REUSE_ALERTS - Garantir isolamento
-- =============================================
DROP POLICY IF EXISTS "client_reuse_alerts_select_policy" ON public.client_reuse_alerts;

CREATE POLICY "client_reuse_alerts_select_policy" 
ON public.client_reuse_alerts FOR SELECT 
USING (
  public.is_global_admin(auth.uid())
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  OR auth.uid() = user_id
);