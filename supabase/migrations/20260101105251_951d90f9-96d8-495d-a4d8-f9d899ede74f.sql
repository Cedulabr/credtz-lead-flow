-- 1. Criar tabela de empresas (companies)
CREATE TABLE public.companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    cnpj text UNIQUE,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid REFERENCES auth.users(id)
);

-- 2. Criar enum para tipo de usuário na empresa
CREATE TYPE public.company_role AS ENUM ('gestor', 'colaborador');

-- 3. Criar tabela de vínculo usuário-empresa
CREATE TABLE public.user_companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_role public.company_role NOT NULL DEFAULT 'colaborador',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(user_id, company_id)
);

-- 4. Adicionar company_id nas tabelas principais que precisam de isolamento
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.commissions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.televendas ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.client_documents ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);
ALTER TABLE public.leads_indicados ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- 5. Habilitar RLS nas novas tabelas
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- 6. Função para verificar se usuário pertence a uma empresa
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

-- 7. Função para verificar se usuário é gestor de uma empresa
CREATE OR REPLACE FUNCTION public.is_company_gestor(_user_id uuid, _company_id uuid)
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
        AND company_role = 'gestor'
        AND is_active = true
    )
$$;

-- 8. Função para obter empresa(s) do usuário
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

-- 9. Políticas RLS para companies
CREATE POLICY "Admins can manage all companies"
ON public.companies FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestors can view their own company"
ON public.companies FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.company_id = companies.id
        AND uc.user_id = auth.uid()
        AND uc.is_active = true
    )
);

-- 10. Políticas RLS para user_companies
CREATE POLICY "Admins can manage all user_companies"
ON public.user_companies FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Gestors can view users in their company"
ON public.user_companies FOR SELECT
USING (
    is_company_gestor(auth.uid(), company_id)
    OR user_id = auth.uid()
);

CREATE POLICY "Gestors can manage users in their company"
ON public.user_companies FOR INSERT
WITH CHECK (
    is_company_gestor(auth.uid(), company_id)
);

CREATE POLICY "Gestors can update users in their company"
ON public.user_companies FOR UPDATE
USING (
    is_company_gestor(auth.uid(), company_id)
);

-- 11. Atualizar políticas RLS para leads com filtro por empresa
DROP POLICY IF EXISTS "Users can view assigned leads" ON public.leads;
CREATE POLICY "Users can view leads in their company"
ON public.leads FOR SELECT
USING (
    has_role(auth.uid(), 'admin')
    OR (company_id IN (SELECT get_user_company_ids(auth.uid())))
    OR (auth.uid() = assigned_to)
    OR (auth.uid() = created_by)
);

-- 12. Atualizar políticas RLS para propostas com filtro por empresa
DROP POLICY IF EXISTS "Partners can only manage their propostas" ON public.propostas;
CREATE POLICY "Users can view propostas in their company"
ON public.propostas FOR SELECT
USING (
    has_role(auth.uid(), 'admin')
    OR (company_id IN (SELECT get_user_company_ids(auth.uid())))
    OR (auth.uid() = created_by_id)
    OR (auth.uid() = assigned_to)
);

-- 13. Atualizar políticas RLS para commissions com filtro por empresa
DROP POLICY IF EXISTS "Users can view their own commissions" ON public.commissions;
CREATE POLICY "Users can view commissions in their company"
ON public.commissions FOR SELECT
USING (
    has_role(auth.uid(), 'admin')
    OR (company_id IN (SELECT get_user_company_ids(auth.uid())))
    OR (auth.uid() = user_id)
);

-- 14. Atualizar políticas RLS para televendas com filtro por empresa
DROP POLICY IF EXISTS "Users can view their own televendas" ON public.televendas;
CREATE POLICY "Users can view televendas in their company"
ON public.televendas FOR SELECT
USING (
    has_role(auth.uid(), 'admin')
    OR (company_id IN (SELECT get_user_company_ids(auth.uid())))
    OR (auth.uid() = user_id)
);

-- 15. Atualizar políticas RLS para leads_indicados com filtro por empresa
DROP POLICY IF EXISTS "Users can view their own indicated leads" ON public.leads_indicados;
CREATE POLICY "Users can view indicated leads in their company"
ON public.leads_indicados FOR SELECT
USING (
    has_role(auth.uid(), 'admin')
    OR (company_id IN (SELECT get_user_company_ids(auth.uid())))
    OR (auth.uid() = created_by)
);

-- 16. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON public.user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON public.leads(company_id);
CREATE INDEX IF NOT EXISTS idx_propostas_company_id ON public.propostas(company_id);
CREATE INDEX IF NOT EXISTS idx_commissions_company_id ON public.commissions(company_id);
CREATE INDEX IF NOT EXISTS idx_televendas_company_id ON public.televendas(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_indicados_company_id ON public.leads_indicados(company_id);

-- 17. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_company_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW EXECUTE FUNCTION public.update_company_updated_at();

CREATE TRIGGER update_user_companies_updated_at
BEFORE UPDATE ON public.user_companies
FOR EACH ROW EXECUTE FUNCTION public.update_company_updated_at();