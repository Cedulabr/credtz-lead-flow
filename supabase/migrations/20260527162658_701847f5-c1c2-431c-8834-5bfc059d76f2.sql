ALTER TABLE public.agibank_lead_requests
  ADD COLUMN IF NOT EXISTS ddds text[],
  ADD COLUMN IF NOT EXISTS tags text[];

CREATE OR REPLACE FUNCTION public.get_agibank_available_ddds()
RETURNS TABLE(ddd text, available_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    substring(regexp_replace(phone, '\D', '', 'g') FROM '^(?:55)?(\d{2})') AS ddd,
    count(*) AS available_count
  FROM public.agibank_leads
  WHERE agent_id IS NULL
    AND phone IS NOT NULL
    AND length(regexp_replace(phone, '\D', '', 'g')) >= 10
  GROUP BY 1
  HAVING substring(regexp_replace(phone, '\D', '', 'g') FROM '^(?:55)?(\d{2})') IS NOT NULL
  ORDER BY available_count DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_agibank_available_tags()
RETURNS TABLE(tag text, available_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.file_name AS tag,
    count(le.id) AS available_count
  FROM public.agibank_lead_lists l
  JOIN public.agibank_leads le ON le.list_id = l.id
  WHERE le.agent_id IS NULL
  GROUP BY l.file_name
  ORDER BY available_count DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_agibank_available_ddds() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_agibank_available_tags() TO authenticated;