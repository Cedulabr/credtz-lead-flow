-- 1. Remover política permissiva atual de colaboradores
DROP POLICY IF EXISTS "Colaboradores can view financial transactions in their company" 
ON public.financial_transactions;

-- 2. Criar nova política restritiva para SELECT
-- Colaboradores: só suas próprias transações
-- Gestores: todas da empresa
-- Admins: todas
CREATE POLICY "Users can view financial transactions"
ON public.financial_transactions FOR SELECT
TO authenticated
USING (
  -- Admin pode ver tudo
  has_role(auth.uid(), 'admin'::app_role)
  -- Gestor pode ver tudo da sua empresa
  OR EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.company_role = 'gestor'
    AND uc.is_active = true
  )
  -- Colaborador só pode ver transações que criou
  OR (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = financial_transactions.company_id
      AND uc.user_id = auth.uid()
      AND uc.is_active = true
    )
  )
);

-- 3. Adicionar política para colaboradores criarem transações
CREATE POLICY "Colaboradores can create own financial transactions"
ON public.financial_transactions FOR INSERT
TO authenticated
WITH CHECK (
  -- Deve pertencer à empresa da transação
  EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.is_active = true
  )
  -- E o created_by deve ser o próprio usuário
  AND created_by = auth.uid()
);

-- 4. Adicionar política para colaboradores editarem suas próprias transações
CREATE POLICY "Colaboradores can update own financial transactions"
ON public.financial_transactions FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.is_active = true
  )
)
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.is_active = true
  )
);

-- 5. Adicionar política para colaboradores excluírem suas próprias transações
CREATE POLICY "Colaboradores can delete own financial transactions"
ON public.financial_transactions FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.company_id = financial_transactions.company_id
    AND uc.user_id = auth.uid()
    AND uc.is_active = true
  )
);