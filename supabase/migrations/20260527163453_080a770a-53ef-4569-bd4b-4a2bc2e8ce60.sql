ALTER TABLE public.agibank_leads
  ADD COLUMN IF NOT EXISTS phone2 text,
  ADD COLUMN IF NOT EXISTS phone3 text,
  ADD COLUMN IF NOT EXISTS phone4 text,
  ADD COLUMN IF NOT EXISTS phone5 text,
  ADD COLUMN IF NOT EXISTS tag text;

CREATE INDEX IF NOT EXISTS idx_agibank_leads_tag ON public.agibank_leads(tag);

CREATE OR REPLACE FUNCTION public.get_agibank_available_tags()
RETURNS TABLE(tag text, available_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(NULLIF(le.tag, ''), l.file_name) AS tag,
    count(*) AS available_count
  FROM public.agibank_leads le
  LEFT JOIN public.agibank_lead_lists l ON l.id = le.list_id
  WHERE le.agent_id IS NULL
    AND COALESCE(NULLIF(le.tag, ''), l.file_name) IS NOT NULL
  GROUP BY 1
  ORDER BY available_count DESC;
$$;