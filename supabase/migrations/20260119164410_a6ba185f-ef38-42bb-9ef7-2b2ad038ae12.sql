-- Create table for tracking duplicate leads
CREATE TABLE IF NOT EXISTS public.activate_leads_duplicates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_lead_id UUID NOT NULL REFERENCES public.activate_leads(id) ON DELETE CASCADE,
  duplicate_lead_id UUID NOT NULL REFERENCES public.activate_leads(id) ON DELETE CASCADE,
  similarity_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  match_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(original_lead_id, duplicate_lead_id)
);

-- Create table for duplicate review actions log
CREATE TABLE IF NOT EXISTS public.activate_leads_duplicate_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  duplicate_id UUID REFERENCES public.activate_leads_duplicates(id) ON DELETE SET NULL,
  original_lead_id UUID,
  duplicate_lead_id UUID,
  action TEXT NOT NULL,
  action_details JSONB,
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add cpf column to activate_leads if not exists
ALTER TABLE public.activate_leads ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Add column to track if lead was sanitized
ALTER TABLE public.activate_leads ADD COLUMN IF NOT EXISTS sanitized BOOLEAN DEFAULT false;
ALTER TABLE public.activate_leads ADD COLUMN IF NOT EXISTS sanitized_at TIMESTAMP WITH TIME ZONE;

-- Add column to track data quality issues
ALTER TABLE public.activate_leads ADD COLUMN IF NOT EXISTS has_quality_issues BOOLEAN DEFAULT false;
ALTER TABLE public.activate_leads ADD COLUMN IF NOT EXISTS quality_issues JSONB;

-- Enable RLS
ALTER TABLE public.activate_leads_duplicates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activate_leads_duplicate_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins and gestors can view all duplicates" ON public.activate_leads_duplicates;
DROP POLICY IF EXISTS "Admins and gestors can manage duplicates" ON public.activate_leads_duplicates;
DROP POLICY IF EXISTS "Admins and gestors can view all duplicate logs" ON public.activate_leads_duplicate_logs;
DROP POLICY IF EXISTS "Users can insert duplicate logs" ON public.activate_leads_duplicate_logs;

-- RLS Policies using existing is_gestor_or_admin function
CREATE POLICY "Admins and gestors can view all duplicates"
ON public.activate_leads_duplicates
FOR SELECT
USING (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Admins and gestors can manage duplicates"
ON public.activate_leads_duplicates
FOR ALL
USING (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Admins and gestors can view all duplicate logs"
ON public.activate_leads_duplicate_logs
FOR SELECT
USING (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Users can insert duplicate logs"
ON public.activate_leads_duplicate_logs
FOR INSERT
WITH CHECK (auth.uid() = performed_by);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activate_leads_telefone ON public.activate_leads(telefone);
CREATE INDEX IF NOT EXISTS idx_activate_leads_cpf ON public.activate_leads(cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activate_leads_nome_lower ON public.activate_leads(lower(nome));
CREATE INDEX IF NOT EXISTS idx_activate_leads_duplicates_status ON public.activate_leads_duplicates(status);

-- Function to extract phone numbers from text
CREATE OR REPLACE FUNCTION public.extract_phone_from_text(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
  phone_match TEXT;
BEGIN
  phone_match := regexp_replace(
    (SELECT (regexp_matches(input_text, '\d{8,11}'))[1]),
    '[^\d]', '', 'g'
  );
  RETURN phone_match;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check if text contains numbers
CREATE OR REPLACE FUNCTION public.text_contains_numbers(input_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN input_text ~ '\d';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to scan and detect duplicates
CREATE OR REPLACE FUNCTION public.scan_activate_leads_duplicates()
RETURNS TABLE(
  duplicates_found INTEGER,
  leads_with_issues INTEGER,
  total_scanned INTEGER
) AS $$
DECLARE
  duplicates_count INTEGER := 0;
  issues_count INTEGER := 0;
  total_count INTEGER := 0;
  lead_record RECORD;
  existing_record RECORD;
  extracted_phone TEXT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.activate_leads;
  
  FOR lead_record IN
    SELECT id, nome, telefone
    FROM public.activate_leads
    WHERE nome ~ '\d'
    AND (sanitized IS NULL OR sanitized = false)
  LOOP
    extracted_phone := public.extract_phone_from_text(lead_record.nome);
    
    IF extracted_phone IS NOT NULL AND length(extracted_phone) >= 8 THEN
      UPDATE public.activate_leads
      SET has_quality_issues = true,
          quality_issues = jsonb_build_object(
            'phone_in_name', true,
            'extracted_phone', extracted_phone
          )
      WHERE id = lead_record.id;
      
      issues_count := issues_count + 1;
      
      SELECT id INTO existing_record
      FROM public.activate_leads
      WHERE telefone = extracted_phone
        AND id != lead_record.id
      LIMIT 1;
      
      IF existing_record.id IS NOT NULL THEN
        INSERT INTO public.activate_leads_duplicates (
          original_lead_id, duplicate_lead_id, similarity_score, match_type
        )
        VALUES (
          existing_record.id, lead_record.id, 100, 'nome_telefone_extracted'
        )
        ON CONFLICT (original_lead_id, duplicate_lead_id) DO NOTHING;
        
        duplicates_count := duplicates_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  INSERT INTO public.activate_leads_duplicates (
    original_lead_id, duplicate_lead_id, similarity_score, match_type
  )
  SELECT DISTINCT ON (LEAST(a.id, b.id), GREATEST(a.id, b.id))
    CASE WHEN a.created_at <= b.created_at THEN a.id ELSE b.id END,
    CASE WHEN a.created_at <= b.created_at THEN b.id ELSE a.id END,
    100,
    'telefone'
  FROM public.activate_leads a
  JOIN public.activate_leads b ON a.telefone = b.telefone AND a.id < b.id
  WHERE a.telefone IS NOT NULL AND a.telefone != ''
  ON CONFLICT (original_lead_id, duplicate_lead_id) DO NOTHING;
  
  INSERT INTO public.activate_leads_duplicates (
    original_lead_id, duplicate_lead_id, similarity_score, match_type
  )
  SELECT DISTINCT ON (LEAST(a.id, b.id), GREATEST(a.id, b.id))
    CASE WHEN a.created_at <= b.created_at THEN a.id ELSE b.id END,
    CASE WHEN a.created_at <= b.created_at THEN b.id ELSE a.id END,
    100,
    'cpf'
  FROM public.activate_leads a
  JOIN public.activate_leads b ON a.cpf = b.cpf AND a.id < b.id
  WHERE a.cpf IS NOT NULL AND a.cpf != ''
  ON CONFLICT (original_lead_id, duplicate_lead_id) DO NOTHING;
  
  SELECT COUNT(*) INTO duplicates_count FROM public.activate_leads_duplicates WHERE status = 'pending';
  
  RETURN QUERY SELECT duplicates_count, issues_count, total_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sanitize a lead
CREATE OR REPLACE FUNCTION public.sanitize_activate_lead(lead_id UUID)
RETURNS JSONB AS $$
DECLARE
  lead_record RECORD;
  extracted_phone TEXT;
  clean_name TEXT;
  result JSONB;
BEGIN
  SELECT * INTO lead_record
  FROM public.activate_leads
  WHERE id = lead_id;
  
  IF lead_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;
  
  extracted_phone := public.extract_phone_from_text(lead_record.nome);
  
  clean_name := regexp_replace(lead_record.nome, '\d+', '', 'g');
  clean_name := regexp_replace(clean_name, '\s+', ' ', 'g');
  clean_name := trim(clean_name);
  
  UPDATE public.activate_leads
  SET nome = clean_name,
      telefone = COALESCE(NULLIF(lead_record.telefone, ''), extracted_phone, lead_record.telefone),
      sanitized = true,
      sanitized_at = now(),
      has_quality_issues = false,
      quality_issues = NULL
  WHERE id = lead_id;
  
  result := jsonb_build_object(
    'success', true,
    'original_name', lead_record.nome,
    'clean_name', clean_name,
    'extracted_phone', extracted_phone,
    'telefone_updated', CASE WHEN lead_record.telefone IS NULL OR lead_record.telefone = '' THEN true ELSE false END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to merge two leads
CREATE OR REPLACE FUNCTION public.merge_activate_leads(
  keep_lead_id UUID,
  remove_lead_id UUID,
  performed_by_user UUID
)
RETURNS JSONB AS $$
DECLARE
  keep_lead RECORD;
  remove_lead RECORD;
BEGIN
  SELECT * INTO keep_lead FROM public.activate_leads WHERE id = keep_lead_id;
  SELECT * INTO remove_lead FROM public.activate_leads WHERE id = remove_lead_id;
  
  IF keep_lead IS NULL OR remove_lead IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;
  
  UPDATE public.activate_leads
  SET 
    cpf = COALESCE(keep_lead.cpf, remove_lead.cpf),
    telefone = COALESCE(NULLIF(keep_lead.telefone, ''), remove_lead.telefone),
    produto = COALESCE(keep_lead.produto, remove_lead.produto)
  WHERE id = keep_lead_id;
  
  UPDATE public.activate_leads_duplicates
  SET status = 'merged', reviewed_by = performed_by_user, reviewed_at = now()
  WHERE (original_lead_id = keep_lead_id AND duplicate_lead_id = remove_lead_id)
     OR (original_lead_id = remove_lead_id AND duplicate_lead_id = keep_lead_id);
  
  INSERT INTO public.activate_leads_duplicate_logs (
    original_lead_id, duplicate_lead_id, action, action_details, performed_by
  )
  VALUES (
    keep_lead_id, remove_lead_id, 'merge',
    jsonb_build_object(
      'kept_lead', row_to_json(keep_lead),
      'removed_lead', row_to_json(remove_lead)
    ),
    performed_by_user
  );
  
  DELETE FROM public.activate_leads WHERE id = remove_lead_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get duplicate statistics
CREATE OR REPLACE FUNCTION public.get_activate_leads_quality_stats()
RETURNS JSONB AS $$
DECLARE
  total_leads INTEGER;
  duplicates_pending INTEGER;
  leads_with_errors INTEGER;
  clean_percentage NUMERIC;
BEGIN
  SELECT COUNT(*) INTO total_leads FROM public.activate_leads;
  
  SELECT COUNT(*) INTO duplicates_pending
  FROM public.activate_leads_duplicates
  WHERE status = 'pending';
  
  SELECT COUNT(*) INTO leads_with_errors
  FROM public.activate_leads
  WHERE has_quality_issues = true;
  
  IF total_leads > 0 THEN
    clean_percentage := ((total_leads - leads_with_errors - duplicates_pending)::NUMERIC / total_leads) * 100;
  ELSE
    clean_percentage := 100;
  END IF;
  
  RETURN jsonb_build_object(
    'total_leads', total_leads,
    'duplicates_pending', duplicates_pending,
    'leads_with_errors', leads_with_errors,
    'clean_percentage', round(clean_percentage, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;