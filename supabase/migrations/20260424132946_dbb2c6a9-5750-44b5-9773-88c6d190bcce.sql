-- 1) Nova RPC: count_leads_with_phone
-- Conta leads disponíveis e quantos possuem telefone válido para os filtros dados
CREATE OR REPLACE FUNCTION public.count_leads_with_phone(
  convenio_filter text DEFAULT NULL,
  ddd_filter text[] DEFAULT NULL,
  tag_filter text[] DEFAULT NULL
)
RETURNS TABLE(total bigint, with_phone bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    count(*) AS total,
    count(*) FILTER (
      WHERE phone IS NOT NULL
        AND length(regexp_replace(phone, '\D', '', 'g')) >= 10
    ) AS with_phone
  FROM public.leads_database
  WHERE is_available = true
    AND (convenio_filter IS NULL OR upper(convenio) = upper(convenio_filter))
    AND (
      ddd_filter IS NULL
      OR substring(regexp_replace(coalesce(phone,''), '\D', '', 'g') FROM 3 FOR 2) = ANY(ddd_filter)
    )
    AND (tag_filter IS NULL OR tag = ANY(tag_filter));
$$;

GRANT EXECUTE ON FUNCTION public.count_leads_with_phone(text, text[], text[]) TO authenticated;