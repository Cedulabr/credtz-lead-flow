-- Permitir que usuários vejam perfis de outros usuários da mesma empresa
CREATE POLICY "Users can view profiles of same company members"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc1
    JOIN user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid()
    AND uc2.user_id = profiles.id
    AND uc1.is_active = true
    AND uc2.is_active = true
  )
);