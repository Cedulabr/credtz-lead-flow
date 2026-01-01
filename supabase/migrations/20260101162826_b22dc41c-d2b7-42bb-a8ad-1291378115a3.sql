-- Atualizar comissões sem company_id, buscando da tabela user_companies
UPDATE public.commissions c
SET company_id = (
    SELECT uc.company_id 
    FROM public.user_companies uc 
    WHERE uc.user_id = c.user_id 
    AND uc.is_active = true 
    ORDER BY uc.created_at ASC 
    LIMIT 1
)
WHERE c.company_id IS NULL 
AND c.user_id IS NOT NULL;

-- Criar política RLS mais permissiva para colaboradores verem suas próprias comissões
-- (já existe, mas garantir que funciona mesmo sem company_id)
DROP POLICY IF EXISTS "Users can view own commissions" ON public.commissions;
CREATE POLICY "Users can view own commissions"
ON public.commissions FOR SELECT
USING (auth.uid() = user_id);

-- Garantir que a política existente de empresa também funciona
DROP POLICY IF EXISTS "Users can view commissions in their company" ON public.commissions;
CREATE POLICY "Users can view commissions in their company"
ON public.commissions FOR SELECT
USING (
    company_id IN (SELECT get_user_company_ids(auth.uid()))
);