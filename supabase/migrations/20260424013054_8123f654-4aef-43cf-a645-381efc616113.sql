CREATE OR REPLACE FUNCTION public.import_leads_governo(leads_data jsonb)
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
  v_matricula text;
  v_banco text;
  v_situacao text;
  v_ade text;
  v_servico_servidor text;
  v_tipo_servico_servidor text;
  v_servico_consignataria text;
  v_margem_disponivel numeric;
  v_margem_total numeric;
  v_parcela numeric;
  v_parcelas_em_aberto integer;
  v_parcelas_pagas integer;
  v_deferimento date;
  v_quitacao date;
  v_ultimo_desconto date;
  v_ultima_parcela date;
  v_origem text;
  imported_count integer := 0;
  duplicate_count integer := 0;
  error_count integer := 0;
  existing_lead record;
BEGIN
  IF leads_data IS NULL OR jsonb_array_length(leads_data) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhum dado fornecido');
  END IF;

  FOR lead_record IN SELECT * FROM jsonb_array_elements(leads_data)
  LOOP
    BEGIN
      v_nome := TRIM(COALESCE(lead_record->>'nome', ''));
      v_cpf := regexp_replace(COALESCE(lead_record->>'cpf', ''), '\D', '', 'g');
      v_convenio := UPPER(TRIM(COALESCE(NULLIF(lead_record->>'convenio',''), 'GOVERNO BA')));
      v_telefone := regexp_replace(COALESCE(lead_record->>'telefone', ''), '\D', '', 'g');
      v_matricula := NULLIF(TRIM(COALESCE(lead_record->>'matricula', '')), '');
      v_banco := NULLIF(TRIM(COALESCE(lead_record->>'banco', '')), '');
      v_situacao := NULLIF(TRIM(COALESCE(lead_record->>'situacao', '')), '');
      v_ade := NULLIF(TRIM(COALESCE(lead_record->>'ade', '')), '');
      v_servico_servidor := NULLIF(TRIM(COALESCE(lead_record->>'servico_servidor', '')), '');
      v_tipo_servico_servidor := NULLIF(TRIM(COALESCE(lead_record->>'tipo_servico_servidor', '')), '');
      v_servico_consignataria := NULLIF(TRIM(COALESCE(lead_record->>'servico_consignataria', '')), '');
      v_origem := COALESCE(NULLIF(lead_record->>'origem_base',''), 'governo_ba');

      v_margem_disponivel := NULLIF(lead_record->>'margem_disponivel', '')::numeric;
      v_margem_total := NULLIF(lead_record->>'margem_total', '')::numeric;
      v_parcela := NULLIF(lead_record->>'parcela', '')::numeric;
      v_parcelas_em_aberto := NULLIF(lead_record->>'parcelas_em_aberto', '')::integer;
      v_parcelas_pagas := NULLIF(lead_record->>'parcelas_pagas', '')::integer;
      v_deferimento := NULLIF(lead_record->>'deferimento', '')::date;
      v_quitacao := NULLIF(lead_record->>'quitacao', '')::date;
      v_ultimo_desconto := NULLIF(lead_record->>'ultimo_desconto', '')::date;
      v_ultima_parcela := NULLIF(lead_record->>'ultima_parcela', '')::date;

      IF v_nome = '' OR length(v_cpf) <> 11 THEN
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Duplicidade: mesmo CPF + matricula + banco + ADE (uma linha por contrato)
      SELECT * INTO existing_lead
      FROM public.leads_database
      WHERE cpf = v_cpf
        AND COALESCE(matricula,'') = COALESCE(v_matricula,'')
        AND COALESCE(banco,'') = COALESCE(v_banco,'')
        AND COALESCE(ade,'') = COALESCE(v_ade,'')
      LIMIT 1;

      IF existing_lead IS NOT NULL THEN
        UPDATE public.leads_database
        SET
          name = v_nome,
          situacao = v_situacao,
          margem_disponivel = v_margem_disponivel,
          margem_total = v_margem_total,
          parcela = v_parcela,
          parcelas_em_aberto = v_parcelas_em_aberto,
          parcelas_pagas = v_parcelas_pagas,
          deferimento = v_deferimento,
          quitacao = v_quitacao,
          ultimo_desconto = v_ultimo_desconto,
          ultima_parcela = v_ultima_parcela,
          servico_servidor = v_servico_servidor,
          tipo_servico_servidor = v_tipo_servico_servidor,
          servico_consignataria = v_servico_consignataria,
          updated_at = now()
        WHERE id = existing_lead.id;

        duplicate_count := duplicate_count + 1;
        CONTINUE;
      END IF;

      INSERT INTO public.leads_database (
        name, cpf, phone, convenio, banco, matricula,
        margem_disponivel, margem_total, situacao, ade,
        servico_servidor, tipo_servico_servidor, servico_consignataria,
        parcela, parcelas_em_aberto, parcelas_pagas,
        deferimento, quitacao, ultimo_desconto, ultima_parcela,
        origem_base, is_available, created_at, updated_at
      ) VALUES (
        v_nome, v_cpf, COALESCE(NULLIF(v_telefone,''), ''), v_convenio, v_banco, v_matricula,
        v_margem_disponivel, v_margem_total, v_situacao, v_ade,
        v_servico_servidor, v_tipo_servico_servidor, v_servico_consignataria,
        v_parcela, v_parcelas_em_aberto, v_parcelas_pagas,
        v_deferimento, v_quitacao, v_ultimo_desconto, v_ultima_parcela,
        v_origem,
        -- Disponível apenas se tiver telefone válido
        (length(v_telefone) >= 10),
        now(), now()
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
    'invalid', error_count,
    'duplicate_details', '[]'::jsonb
  );
END;
$function$;