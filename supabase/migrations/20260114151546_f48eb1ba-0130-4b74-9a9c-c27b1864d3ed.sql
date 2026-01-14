-- 1. Tornar CPF opcional na tabela leads_database
ALTER TABLE public.leads_database ALTER COLUMN cpf DROP NOT NULL;

-- 2. Adicionar colunas de auditoria para edição de CPF
ALTER TABLE public.leads_database 
  ADD COLUMN IF NOT EXISTS cpf_added_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cpf_added_at timestamp with time zone;

-- 3. Atualizar função de importação para aceitar CPF quando vier preenchido
CREATE OR REPLACE FUNCTION public.import_leads_from_csv(leads_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  lead_item JSONB;
  imported_count INTEGER := 0;
  duplicate_count INTEGER := 0;
  duplicate_details JSONB := '[]'::JSONB;
  existing_phone TEXT;
  cpf_value TEXT;
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
      -- Tratar CPF: usar NULL se vazio ou não fornecido
      cpf_value := NULLIF(TRIM(lead_item->>'cpf'), '');
      
      INSERT INTO public.leads_database (name, cpf, phone, phone2, convenio, tag, is_available)
      VALUES (
        lead_item->>'nome',
        cpf_value,
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
$function$;

-- 4. Criar função para atualizar CPF com auditoria
CREATE OR REPLACE FUNCTION public.update_lead_cpf(
  lead_id uuid,
  new_cpf text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cleaned_cpf TEXT;
BEGIN
  -- Apenas admin pode editar CPF
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem editar o CPF';
  END IF;
  
  -- Limpar CPF (remover caracteres não numéricos)
  cleaned_cpf := NULLIF(REGEXP_REPLACE(COALESCE(new_cpf, ''), '[^0-9]', '', 'g'), '');
  
  -- Validar CPF se fornecido (11 dígitos)
  IF cleaned_cpf IS NOT NULL AND LENGTH(cleaned_cpf) != 11 THEN
    RAISE EXCEPTION 'CPF deve conter 11 dígitos';
  END IF;
  
  -- Atualizar lead com auditoria
  UPDATE public.leads_database
  SET 
    cpf = cleaned_cpf,
    cpf_added_by = auth.uid(),
    cpf_added_at = now(),
    updated_at = now()
  WHERE id = lead_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead não encontrado';
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'lead_id', lead_id,
    'cpf', cleaned_cpf,
    'updated_by', auth.uid(),
    'updated_at', now()
  );
END;
$function$;