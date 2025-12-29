-- Função para importar leads do CSV para leads_database com validação de duplicados
-- Retorna quantidade de leads importados e quantidade de duplicados encontrados

CREATE OR REPLACE FUNCTION public.import_leads_from_csv(
  leads_data jsonb
)
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
  duplicates jsonb := '[]'::jsonb;
  cpf_value text;
  phone_value text;
  name_value text;
  convenio_value text;
  existing_cpf boolean;
  existing_phone boolean;
BEGIN
  -- Verificar se o usuário é admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Apenas administradores podem importar leads';
  END IF;

  -- Processar cada lead do array JSON
  FOR lead_record IN SELECT * FROM jsonb_array_elements(leads_data)
  LOOP
    -- Extrair valores
    name_value := TRIM(lead_record->>'nome');
    cpf_value := REGEXP_REPLACE(TRIM(lead_record->>'cpf'), '[^0-9]', '', 'g');
    phone_value := REGEXP_REPLACE(TRIM(lead_record->>'telefone'), '[^0-9]', '', 'g');
    convenio_value := TRIM(lead_record->>'convenio');
    
    -- Validar campos obrigatórios
    IF name_value IS NULL OR name_value = '' OR
       cpf_value IS NULL OR cpf_value = '' OR
       phone_value IS NULL OR phone_value = '' OR
       convenio_value IS NULL OR convenio_value = '' THEN
      invalid_count := invalid_count + 1;
      CONTINUE;
    END IF;
    
    -- Verificar duplicidade por CPF
    SELECT EXISTS (
      SELECT 1 FROM public.leads_database 
      WHERE REGEXP_REPLACE(cpf, '[^0-9]', '', 'g') = cpf_value
    ) INTO existing_cpf;
    
    -- Verificar duplicidade por Telefone
    SELECT EXISTS (
      SELECT 1 FROM public.leads_database 
      WHERE REGEXP_REPLACE(phone, '[^0-9]', '', 'g') = phone_value
    ) INTO existing_phone;
    
    -- Se já existe, adicionar aos duplicados e pular
    IF existing_cpf OR existing_phone THEN
      duplicate_count := duplicate_count + 1;
      duplicates := duplicates || jsonb_build_object(
        'nome', name_value,
        'cpf', cpf_value,
        'telefone', phone_value,
        'convenio', convenio_value,
        'motivo', CASE 
          WHEN existing_cpf AND existing_phone THEN 'CPF e Telefone já existem'
          WHEN existing_cpf THEN 'CPF já existe'
          ELSE 'Telefone já existe'
        END
      );
      CONTINUE;
    END IF;
    
    -- Inserir novo lead
    INSERT INTO public.leads_database (
      name,
      cpf,
      phone,
      convenio,
      is_available,
      created_at,
      updated_at
    ) VALUES (
      name_value,
      cpf_value,
      phone_value,
      convenio_value,
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
    'duplicate_details', duplicates
  );
END;
$$;

-- Garantir que apenas admins podem executar a função de importação
REVOKE ALL ON FUNCTION public.import_leads_from_csv(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_leads_from_csv(jsonb) TO authenticated;