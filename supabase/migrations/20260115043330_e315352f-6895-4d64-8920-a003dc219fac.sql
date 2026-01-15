-- Normalizar todos os convênios existentes para maiúsculo
UPDATE leads_database 
SET convenio = UPPER(TRIM(convenio))
WHERE convenio IS NOT NULL AND convenio != UPPER(TRIM(convenio));

-- Criar ou substituir a função de importação para normalizar convênios automaticamente
CREATE OR REPLACE FUNCTION import_leads_from_csv(leads_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  lead_record jsonb;
  v_nome text;
  v_cpf text;
  v_convenio text;
  v_telefone text;
  v_telefone2 text;
  v_tag text;
  imported_count integer := 0;
  duplicate_count integer := 0;
  error_count integer := 0;
  existing_lead record;
BEGIN
  -- Validate input
  IF leads_data IS NULL OR jsonb_array_length(leads_data) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nenhum dado fornecido para importação'
    );
  END IF;

  -- Process each lead
  FOR lead_record IN SELECT * FROM jsonb_array_elements(leads_data)
  LOOP
    BEGIN
      -- Extract values from JSON
      v_nome := TRIM(lead_record->>'nome');
      v_cpf := TRIM(lead_record->>'cpf');
      -- NORMALIZAR CONVÊNIO PARA MAIÚSCULO
      v_convenio := UPPER(TRIM(lead_record->>'convenio'));
      v_telefone := TRIM(lead_record->>'telefone');
      v_telefone2 := NULLIF(TRIM(lead_record->>'telefone2'), '');
      v_tag := NULLIF(TRIM(lead_record->>'tag'), '');

      -- Validate required fields
      IF v_nome IS NULL OR v_nome = '' THEN
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      IF v_telefone IS NULL OR v_telefone = '' THEN
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Check for duplicates: nome + telefone + convenio (mesma pessoa, mesmo telefone, mesmo convênio)
      SELECT * INTO existing_lead
      FROM leads_database
      WHERE lower(trim(name)) = lower(trim(v_nome)) 
        AND phone = v_telefone
        AND UPPER(TRIM(convenio)) = v_convenio
      LIMIT 1;

      IF existing_lead IS NOT NULL THEN
        duplicate_count := duplicate_count + 1;
        CONTINUE;
      END IF;

      -- Insert the lead
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
        NULLIF(v_cpf, ''),
        v_telefone,
        v_convenio,
        true,
        now(),
        now()
      );

      imported_count := imported_count + 1;

    EXCEPTION
      WHEN others THEN
        error_count := error_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'imported', imported_count,
    'duplicates', duplicate_count,
    'errors', error_count
  );
END;
$function$;