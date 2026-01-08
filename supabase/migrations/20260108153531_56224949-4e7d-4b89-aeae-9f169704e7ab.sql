-- Update import_leads_from_csv function to not require CPF
-- CPF will be optional and can be NULL
CREATE OR REPLACE FUNCTION public.import_leads_from_csv(leads_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    lead_record jsonb;
    v_nome text;
    v_telefone text;
    v_convenio text;
    imported_count int := 0;
    duplicate_count int := 0;
    invalid_count int := 0;
    duplicate_details jsonb := '[]'::jsonb;
    existing_lead RECORD;
    is_user_admin boolean := false;
BEGIN
    -- Check if user is admin
    SELECT role = 'admin' INTO is_user_admin
    FROM profiles
    WHERE id = auth.uid();
    
    IF NOT is_user_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Apenas administradores podem importar leads',
            'imported', 0,
            'duplicates', 0,
            'invalid', 0,
            'duplicate_details', '[]'::jsonb
        );
    END IF;

    FOR lead_record IN SELECT * FROM jsonb_array_elements(leads_data)
    LOOP
        v_nome := lead_record->>'nome';
        v_telefone := lead_record->>'telefone';
        v_convenio := lead_record->>'convenio';
        
        -- Validate required fields (nome, telefone, convenio - CPF not required)
        IF v_nome IS NULL OR v_telefone IS NULL OR v_convenio IS NULL OR
           trim(v_nome) = '' OR trim(v_telefone) = '' OR trim(v_convenio) = '' THEN
            invalid_count := invalid_count + 1;
            CONTINUE;
        END IF;
        
        -- Clean phone number
        v_telefone := regexp_replace(v_telefone, '[^0-9]', '', 'g');
        
        -- Check for duplicate by nome + telefone + convenio
        SELECT * INTO existing_lead
        FROM leads_database
        WHERE lower(trim(name)) = lower(trim(v_nome))
          AND phone = v_telefone
          AND lower(trim(convenio)) = lower(trim(v_convenio))
        LIMIT 1;
        
        IF existing_lead.id IS NOT NULL THEN
            duplicate_count := duplicate_count + 1;
            duplicate_details := duplicate_details || jsonb_build_object(
                'nome', v_nome,
                'telefone', v_telefone,
                'convenio', v_convenio,
                'motivo', 'Lead já existe (mesmo nome, telefone e convênio)'
            );
            CONTINUE;
        END IF;
        
        -- Insert new lead
        INSERT INTO leads_database (name, phone, convenio, cpf, is_available)
        VALUES (
            trim(v_nome),
            v_telefone,
            trim(v_convenio),
            '',  -- CPF empty as it's no longer required
            true
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