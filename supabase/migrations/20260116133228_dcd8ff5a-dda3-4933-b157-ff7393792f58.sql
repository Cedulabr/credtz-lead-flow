-- Corrigir importação para gravar Tag/Perfil (e telefone2) na leads_database
-- + permitir reimportação para completar campos faltantes em leads já existentes
CREATE OR REPLACE FUNCTION public.import_leads_from_csv(leads_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  updated_count integer := 0;
  duplicate_count integer := 0;
  error_count integer := 0;
  existing_lead record;
BEGIN
  IF leads_data IS NULL OR jsonb_array_length(leads_data) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Nenhum dado fornecido para importação'
    );
  END IF;

  FOR lead_record IN SELECT * FROM jsonb_array_elements(leads_data)
  LOOP
    BEGIN
      v_nome := TRIM(lead_record->>'nome');
      v_cpf := TRIM(lead_record->>'cpf');
      v_convenio := UPPER(TRIM(lead_record->>'convenio'));
      v_telefone := TRIM(lead_record->>'telefone');
      v_telefone2 := NULLIF(TRIM(lead_record->>'telefone2'), '');
      v_tag := NULLIF(TRIM(lead_record->>'tag'), '');

      IF v_nome IS NULL OR v_nome = '' THEN
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      IF v_telefone IS NULL OR v_telefone = '' THEN
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Duplicidade: mesma pessoa (nome + telefone + convênio)
      SELECT * INTO existing_lead
      FROM public.leads_database
      WHERE lower(trim(name)) = lower(trim(v_nome))
        AND phone = v_telefone
        AND UPPER(TRIM(convenio)) = v_convenio
      LIMIT 1;

      IF existing_lead IS NOT NULL THEN
        duplicate_count := duplicate_count + 1;

        -- Completa campos faltantes (não sobrescreve dados já preenchidos)
        UPDATE public.leads_database
        SET
          cpf = COALESCE(NULLIF(existing_lead.cpf, ''), NULLIF(v_cpf, '')),
          phone2 = COALESCE(existing_lead.phone2, v_telefone2),
          tag = COALESCE(NULLIF(existing_lead.tag, ''), v_tag),
          updated_at = now()
        WHERE id = existing_lead.id
          AND (
            (existing_lead.cpf IS NULL OR existing_lead.cpf = '')
            OR (existing_lead.phone2 IS NULL)
            OR (existing_lead.tag IS NULL OR existing_lead.tag = '')
          );

        IF FOUND THEN
          updated_count := updated_count + 1;
        END IF;

        CONTINUE;
      END IF;

      -- Insert do lead novo (inclui telefone2 e tag)
      INSERT INTO public.leads_database (
        name,
        cpf,
        phone,
        phone2,
        convenio,
        tag,
        is_available,
        created_at,
        updated_at
      ) VALUES (
        v_nome,
        NULLIF(v_cpf, ''),
        v_telefone,
        v_telefone2,
        v_convenio,
        v_tag,
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
    'updated', updated_count,
    'duplicates', duplicate_count,
    'errors', error_count
  );
END;
$function$;