-- Fix search_path for get_available_tags function
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
    AND NOT EXISTS (
      SELECT 1 FROM public.leads_distribution dist 
      WHERE dist.lead_id = ld.id 
         OR (dist.lead_id IS NULL AND dist.cpf = ld.cpf AND ld.cpf IS NOT NULL AND ld.cpf != '')
    )
  GROUP BY ld.tag
  HAVING COUNT(*) > 0
  ORDER BY COUNT(*) DESC;
END;
$$;

-- Fix search_path for request_leads_with_credits function
CREATE OR REPLACE FUNCTION public.request_leads_with_credits(
  convenio_filter text DEFAULT NULL,
  banco_filter text DEFAULT NULL,
  produto_filter text DEFAULT NULL,
  leads_requested integer DEFAULT 10,
  ddd_filter text[] DEFAULT NULL,
  tag_filter text[] DEFAULT NULL
)
RETURNS TABLE(id uuid, name text, cpf text, phone text, phone2 text, convenio text, banco text, tag text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_credits INTEGER;
  user_id UUID := auth.uid();
  leads_to_deliver INTEGER;
BEGIN
  -- Get current credits
  SELECT credits INTO current_credits
  FROM public.profiles
  WHERE profiles.id = user_id;
  
  IF current_credits IS NULL OR current_credits <= 0 THEN
    RAISE EXCEPTION 'Sem créditos disponíveis';
  END IF;
  
  -- Determine how many leads we can actually deliver
  leads_to_deliver := LEAST(leads_requested, current_credits);
  
  -- Return leads with optional DDD and tag filters
  RETURN QUERY
  WITH selected_leads AS (
    SELECT ld.id, ld.name, ld.cpf, ld.phone, ld.phone2, ld.convenio, ld.banco, ld.tag
    FROM public.leads_database ld
    WHERE ld.is_available = true
      AND (convenio_filter IS NULL OR ld.convenio = convenio_filter)
      AND (banco_filter IS NULL OR ld.banco = banco_filter)
      AND (ddd_filter IS NULL OR ARRAY_LENGTH(ddd_filter, 1) IS NULL OR 
           SUBSTRING(ld.phone FROM 1 FOR 2) = ANY(ddd_filter))
      AND (tag_filter IS NULL OR ARRAY_LENGTH(tag_filter, 1) IS NULL OR 
           ld.tag = ANY(tag_filter))
    ORDER BY RANDOM()
    LIMIT leads_to_deliver
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.leads_database ld
  SET is_available = false
  FROM selected_leads sl
  WHERE ld.id = sl.id
  RETURNING sl.id, sl.name, sl.cpf, sl.phone, sl.phone2, sl.convenio, sl.banco, sl.tag;
  
  -- Deduct credits based on leads actually delivered
  UPDATE public.profiles
  SET credits = credits - (
    SELECT COUNT(*) FROM public.leads_database 
    WHERE is_available = false AND id IN (
      SELECT leads_database.id FROM public.leads_database
      WHERE is_available = false
      LIMIT leads_to_deliver
    )
  )
  WHERE profiles.id = user_id;
END;
$$;

-- Fix search_path for import_leads_from_csv function
CREATE OR REPLACE FUNCTION public.import_leads_from_csv(leads_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  lead_item JSONB;
  imported_count INTEGER := 0;
  duplicate_count INTEGER := 0;
  duplicate_details JSONB := '[]'::JSONB;
  existing_phone TEXT;
BEGIN
  FOR lead_item IN SELECT * FROM jsonb_array_elements(leads_data)
  LOOP
    -- Check if phone already exists
    SELECT phone INTO existing_phone
    FROM public.leads_database
    WHERE phone = lead_item->>'telefone'
    LIMIT 1;
    
    IF existing_phone IS NOT NULL THEN
      duplicate_count := duplicate_count + 1;
      duplicate_details := duplicate_details || jsonb_build_object(
        'nome', lead_item->>'nome',
        'telefone', lead_item->>'telefone',
        'convenio', lead_item->>'convenio',
        'motivo', 'Telefone já existe na base'
      );
    ELSE
      INSERT INTO public.leads_database (name, phone, phone2, convenio, tag, is_available)
      VALUES (
        lead_item->>'nome',
        lead_item->>'telefone',
        NULLIF(lead_item->>'telefone2', ''),
        lead_item->>'convenio',
        NULLIF(lead_item->>'tag', ''),
        true
      );
      imported_count := imported_count + 1;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'imported', imported_count,
    'duplicates', duplicate_count,
    'duplicate_details', duplicate_details
  );
END;
$$;