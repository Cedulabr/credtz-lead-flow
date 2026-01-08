-- Update the import_leads_from_csv function to check duplicates by name + phone together
CREATE OR REPLACE FUNCTION public.import_leads_from_csv(leads_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_record jsonb;
  imported_count integer := 0;
  duplicate_count integer := 0;
  invalid_count integer := 0;
  duplicate_details jsonb := '[]'::jsonb;
  v_nome text;
  v_cpf text;
  v_telefone text;
  v_convenio text;
  existing_lead record;
BEGIN
  -- Check if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem importar leads';
  END IF;

  -- Process each lead
  FOR lead_record IN SELECT * FROM jsonb_array_elements(leads_data)
  LOOP
    v_nome := lead_record->>'nome';
    -- Remove non-numeric characters from CPF
    v_cpf := regexp_replace(lead_record->>'cpf', '\D', '', 'g');
    -- Pad CPF with leading zeros to ensure 11 digits
    IF length(v_cpf) < 11 THEN
      v_cpf := lpad(v_cpf, 11, '0');
    END IF;
    -- Remove non-numeric characters from telefone
    v_telefone := regexp_replace(lead_record->>'telefone', '\D', '', 'g');
    v_convenio := lead_record->>'convenio';

    -- Validate required fields
    IF v_nome IS NULL OR v_nome = '' OR 
       v_cpf IS NULL OR length(v_cpf) != 11 OR
       v_telefone IS NULL OR length(v_telefone) < 10 OR
       v_convenio IS NULL OR v_convenio = '' THEN
      invalid_count := invalid_count + 1;
      CONTINUE;
    END IF;

    -- Check for duplicates: nome + telefone together (same person with same phone)
    SELECT * INTO existing_lead
    FROM leads_database
    WHERE lower(trim(name)) = lower(trim(v_nome)) 
      AND phone = v_telefone
    LIMIT 1;

    IF existing_lead IS NOT NULL THEN
      duplicate_count := duplicate_count + 1;
      duplicate_details := duplicate_details || jsonb_build_object(
        'nome', v_nome,
        'cpf', v_cpf,
        'telefone', v_telefone,
        'convenio', v_convenio,
        'motivo', 'Lead já existente na base',
        'importado_em', existing_lead.created_at
      );
      CONTINUE;
    END IF;

    -- Insert new lead
    INSERT INTO leads_database (
      name,
      cpf,
      phone,
      convenio,
      is_available,
      created_at,
      updated_at
    ) VALUES (
      v_nome,
      v_cpf,
      v_telefone,
      v_convenio,
      true,
      now(),
      now()
    );

    imported_count := imported_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'imported', imported_count,
    'duplicates', duplicate_count,
    'invalid', invalid_count,
    'duplicate_details', duplicate_details
  );
END;
$$;