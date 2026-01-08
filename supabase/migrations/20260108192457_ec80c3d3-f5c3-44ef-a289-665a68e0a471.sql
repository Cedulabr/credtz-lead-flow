-- Function to get available convenios with actual lead counts
CREATE OR REPLACE FUNCTION public.get_available_convenios()
RETURNS TABLE(convenio text, available_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ld.convenio,
    COUNT(*)::bigint as available_count
  FROM public.leads_database ld
  WHERE ld.is_available = true
    -- Exclude leads in active blacklist
    AND NOT EXISTS (
      SELECT 1 FROM public.leads_blacklist lb 
      WHERE lb.cpf = ld.cpf 
      AND lb.expires_at > now()
    )
    -- Exclude leads EVER distributed to ANY user
    AND NOT EXISTS (
      SELECT 1 FROM public.leads_distribution dist 
      WHERE dist.cpf = ld.cpf
    )
  GROUP BY ld.convenio
  HAVING COUNT(*) > 0
  ORDER BY COUNT(*) DESC;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_available_convenios() TO authenticated;