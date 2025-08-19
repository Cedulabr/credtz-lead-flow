-- CORREÇÃO DAS POLÍTICAS DE SEGURANÇA - Permitir acesso controlado ao BaseOff

-- 1. CORRIGIR POLÍTICA DA TABELA BASEOFF - Permitir acesso para partners através de função específica
DROP POLICY IF EXISTS "Only admins can access baseoff data" ON baseoff;

-- Criar política mais flexível para baseoff
CREATE POLICY "Admins have full access to baseoff" ON baseoff
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Política para partners acessarem através de função específica
CREATE POLICY "Partners can access baseoff via controlled function" ON baseoff
FOR SELECT USING (
  has_role(auth.uid(), 'partner'::app_role) 
  AND current_setting('app.baseoff_access', true) = 'allowed'
);

-- 2. CORRIGIR POLÍTICA DA TABELA BASEOFF_ALLOWED_BANKS
DROP POLICY IF EXISTS "Everyone can view active allowed banks" ON baseoff_allowed_banks;

CREATE POLICY "Authenticated users can view active allowed banks" ON baseoff_allowed_banks
FOR SELECT USING (
  is_active = true 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'partner'::app_role)
  )
);

-- 3. CRIAR FUNÇÃO SEGURA PARA ACESSO AO BASEOFF
CREATE OR REPLACE FUNCTION public.secure_baseoff_access(
  limite integer DEFAULT 50,
  codigo_banco_filter text DEFAULT NULL,
  uf_filter text DEFAULT NULL
)
RETURNS TABLE(
  cpf text,
  nome text,
  telefone1 text,
  telefone2 text,
  telefone3 text,
  banco text,
  valor_beneficio text,
  uf text,
  municipio text,
  margem_disponivel text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se o usuário tem permissão
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: insufficient privileges';
  END IF;
  
  -- Definir configuração para permitir acesso
  PERFORM set_config('app.baseoff_access', 'allowed', true);
  
  -- Log do acesso
  INSERT INTO public.audit_log (user_id, table_name, operation, record_id)
  VALUES (auth.uid(), 'baseoff', 'SECURE_SELECT', gen_random_uuid());
  
  -- Retornar dados filtrados por bancos permitidos
  RETURN QUERY
  SELECT 
    b.cpf,
    b.nome,
    b.telefone1,
    b.telefone2,
    b.telefone3,
    b.banco,
    b.valor_beneficio,
    b.uf,
    b.municipio,
    b.margem_disponivel
  FROM public.baseoff b
  WHERE 
    b.nome IS NOT NULL
    AND b.cpf IS NOT NULL
    AND b.banco IS NOT NULL
    AND (codigo_banco_filter IS NULL OR b.banco = codigo_banco_filter)
    AND (uf_filter IS NULL OR b.uf = uf_filter)
    AND EXISTS (
      SELECT 1 FROM public.baseoff_allowed_banks bab 
      WHERE bab.codigo_banco = b.banco AND bab.is_active = true
    )
  ORDER BY RANDOM()
  LIMIT limite;
  
  -- Limpar configuração
  PERFORM set_config('app.baseoff_access', '', true);
END;
$$;

-- 4. CRIAR FUNÇÃO PARA LISTAR BANCOS DISPONÍVEIS
CREATE OR REPLACE FUNCTION public.get_available_banks()
RETURNS TABLE(codigo_banco text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se o usuário tem permissão
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: insufficient privileges';
  END IF;
  
  RETURN QUERY
  SELECT DISTINCT bab.codigo_banco
  FROM public.baseoff_allowed_banks bab
  WHERE bab.is_active = true
  ORDER BY bab.codigo_banco;
END;
$$;

-- 5. CRIAR FUNÇÃO PARA LISTAR UFS DISPONÍVEIS
CREATE OR REPLACE FUNCTION public.get_available_ufs()
RETURNS TABLE(uf text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verificar se o usuário tem permissão
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'partner'::app_role)) THEN
    RAISE EXCEPTION 'Access denied: insufficient privileges';
  END IF;
  
  -- Definir configuração para permitir acesso
  PERFORM set_config('app.baseoff_access', 'allowed', true);
  
  RETURN QUERY
  SELECT DISTINCT b.uf
  FROM public.baseoff b
  WHERE b.uf IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.baseoff_allowed_banks bab 
    WHERE bab.codigo_banco = b.banco AND bab.is_active = true
  )
  ORDER BY b.uf;
  
  -- Limpar configuração
  PERFORM set_config('app.baseoff_access', '', true);
END;
$$;