
-- =====================================================
-- FUNÇÕES PARA REMOÇÃO DE DUPLICATAS - LEADS PREMIUM
-- =====================================================

-- Função para contar duplicatas na tabela leads_database
-- Considera duplicata: mesmo telefone + mesmo nome + mesmo convênio
CREATE OR REPLACE FUNCTION public.count_leads_database_duplicates()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Verificar se usuário é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar esta função';
  END IF;
  
  SELECT COUNT(*) - COUNT(DISTINCT (COALESCE(phone, '') || '|' || COALESCE(LOWER(name), '') || '|' || COALESCE(UPPER(convenio), '')))
  INTO duplicate_count
  FROM leads_database;
  
  RETURN COALESCE(duplicate_count, 0);
END;
$$;

-- Função para remover duplicatas na tabela leads_database
-- Mantém o registro mais recente de cada combinação (phone + name + convenio)
CREATE OR REPLACE FUNCTION public.remove_leads_database_duplicates()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Verificar se usuário é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar esta função';
  END IF;
  
  -- Deletar duplicatas mantendo o registro mais recente
  WITH duplicates AS (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(phone, ''), COALESCE(LOWER(name), ''), COALESCE(UPPER(convenio), '')
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
      ) as rn
    FROM leads_database
  )
  DELETE FROM leads_database
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da operação
  INSERT INTO public.audit_log (user_id, table_name, operation, record_id)
  VALUES (auth.uid(), 'leads_database', 'BULK_DELETE_DUPLICATES', gen_random_uuid());
  
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- FUNÇÕES PARA REMOÇÃO DE DUPLICATAS - BASEOFF_CLIENTS
-- =====================================================

-- Atualizar função existente para verificar admin
CREATE OR REPLACE FUNCTION public.count_baseoff_duplicates()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  -- Verificar se usuário é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar esta função';
  END IF;
  
  SELECT COUNT(*) - COUNT(DISTINCT cpf) INTO duplicate_count
  FROM baseoff_clients;
  
  RETURN COALESCE(duplicate_count, 0);
END;
$$;

-- Atualizar função existente para verificar admin
CREATE OR REPLACE FUNCTION public.remove_baseoff_duplicates()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Verificar se usuário é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar esta função';
  END IF;
  
  -- Deletar duplicatas mantendo o registro mais recente
  WITH duplicates AS (
    SELECT id, cpf,
      ROW_NUMBER() OVER (
        PARTITION BY cpf 
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
      ) as rn
    FROM baseoff_clients
  )
  DELETE FROM baseoff_clients
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log da operação
  INSERT INTO public.audit_log (user_id, table_name, operation, record_id)
  VALUES (auth.uid(), 'baseoff_clients', 'BULK_DELETE_DUPLICATES', gen_random_uuid());
  
  RETURN deleted_count;
END;
$$;

-- =====================================================
-- FUNÇÕES PARA ESTATÍSTICAS DO BANCO
-- =====================================================

-- Função para obter estatísticas gerais do banco
CREATE OR REPLACE FUNCTION public.get_database_storage_stats()
RETURNS TABLE(
  table_name TEXT,
  total_records BIGINT,
  duplicate_count INTEGER,
  estimated_size TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se usuário é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem executar esta função';
  END IF;
  
  RETURN QUERY
  SELECT 
    'leads_database'::TEXT as table_name,
    (SELECT COUNT(*)::BIGINT FROM leads_database) as total_records,
    (SELECT public.count_leads_database_duplicates()) as duplicate_count,
    pg_size_pretty((SELECT pg_total_relation_size('leads_database'))) as estimated_size
  UNION ALL
  SELECT 
    'baseoff_clients'::TEXT as table_name,
    (SELECT COUNT(*)::BIGINT FROM baseoff_clients) as total_records,
    (SELECT public.count_baseoff_duplicates()) as duplicate_count,
    pg_size_pretty((SELECT pg_total_relation_size('baseoff_clients'))) as estimated_size;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION public.count_leads_database_duplicates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_leads_database_duplicates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_baseoff_duplicates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_baseoff_duplicates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_database_storage_stats() TO authenticated;
