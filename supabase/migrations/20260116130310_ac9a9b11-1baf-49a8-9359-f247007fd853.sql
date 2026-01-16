-- Atualizar função para buscar todas as tags únicas da tabela leads_database
-- independente do status de distribuição
CREATE OR REPLACE FUNCTION public.get_available_tags()
RETURNS TABLE(tag text, available_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ld.tag,
    COUNT(*)::bigint as available_count
  FROM public.leads_database ld
  WHERE ld.is_available = true
    AND ld.tag IS NOT NULL
    AND ld.tag != ''
  GROUP BY ld.tag
  HAVING COUNT(*) > 0
  ORDER BY COUNT(*) DESC;
END;
$$;