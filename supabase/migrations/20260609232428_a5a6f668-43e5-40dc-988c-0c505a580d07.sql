CREATE OR REPLACE FUNCTION public.get_available_bancos(convenio_filter text DEFAULT NULL::text)
RETURNS TABLE(banco text, available_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ld.banco,
        COUNT(*)::bigint as available_count
    FROM public.leads_database ld
    WHERE ld.is_available = true
      AND (convenio_filter IS NULL OR ld.convenio = convenio_filter)
      AND ld.banco IS NOT NULL
    GROUP BY ld.banco
    ORDER BY available_count DESC;
END;
$$;
