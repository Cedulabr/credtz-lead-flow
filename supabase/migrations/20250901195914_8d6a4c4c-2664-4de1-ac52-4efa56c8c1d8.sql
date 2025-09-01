-- Corrigir políticas RLS para permitir admins lançarem comissões
DROP POLICY IF EXISTS "Users can insert their own commissions" ON commissions;
DROP POLICY IF EXISTS "Admins can manage all commissions" ON commissions;

-- Criar nova política para admins gerenciarem todas as comissões
CREATE POLICY "Admins can manage all commissions"
ON commissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Permitir usuários inserirem suas próprias comissões
CREATE POLICY "Users can insert their own commissions"
ON commissions
FOR INSERT
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));