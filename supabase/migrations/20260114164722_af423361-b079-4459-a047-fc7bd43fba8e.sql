-- Função para remover duplicatas da tabela baseoff_clients
-- Mantém o registro mais recente (por updated_at ou created_at) de cada CPF
CREATE OR REPLACE FUNCTION public.remove_baseoff_duplicates()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
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
  
  RETURN deleted_count;
END;
$$;

-- Função para contar duplicatas na tabela baseoff_clients
CREATE OR REPLACE FUNCTION public.count_baseoff_duplicates()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) - COUNT(DISTINCT cpf) INTO duplicate_count
  FROM baseoff_clients;
  
  RETURN COALESCE(duplicate_count, 0);
END;
$$;

-- Conceder permissões para usuários autenticados
GRANT EXECUTE ON FUNCTION public.remove_baseoff_duplicates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_baseoff_duplicates() TO authenticated;