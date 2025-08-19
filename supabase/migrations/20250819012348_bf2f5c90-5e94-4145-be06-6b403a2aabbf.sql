-- CORREÇÃO FINAL - Permitir acesso aos perfis para usuários autenticados (Sintaxe Corrigida)

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile data" ON profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON profiles;

-- Política para visualizar o próprio perfil
CREATE POLICY "Users can view their own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Política para criar o próprio perfil
CREATE POLICY "Users can create their own profile" ON profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Política para atualizar o próprio perfil (sem permitir mudança de role)
CREATE POLICY "Users can update their own profile data" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- Política específica para admins atualizarem qualquer perfil
CREATE POLICY "Admins can update any profile data" ON profiles
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Garantir que a função has_role funcione mesmo sem perfil ainda criado
CREATE OR REPLACE FUNCTION public.has_role_safe(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = _user_id) = _role,
    false
  )
$$;