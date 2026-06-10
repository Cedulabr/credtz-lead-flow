-- Função para buscar bancos disponíveis com contagem
CREATE OR REPLACE FUNCTION public.get_available_bancos(convenio_filter TEXT DEFAULT NULL)
RETURNS TABLE (banco TEXT, available_count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ld.banco,
        COUNT(*)::BIGINT as available_count
    FROM public.leads_database ld
    WHERE (convenio_filter IS NULL OR ld.convenio = convenio_filter)
      AND ld.banco IS NOT NULL
      AND ld.banco <> ''
      -- Opcional: filtrar apenas leads que ainda não foram distribuídos se necessário
      -- AND NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.cpf = ld.cpf)
    GROUP BY ld.banco
    ORDER BY available_count DESC;
END;
$$;

-- Função para verificar se um CPF está disponível ou na blacklist
CREATE OR REPLACE FUNCTION public.check_cpf_availability(cpf_to_check TEXT)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
    in_database BOOLEAN;
    already_leads BOOLEAN;
    in_blacklist BOOLEAN;
    lead_data RECORD;
BEGIN
    -- Verifica na base principal
    SELECT EXISTS (SELECT 1 FROM public.leads_database WHERE cpf = cpf_to_check) INTO in_database;
    
    -- Verifica se já é um lead ativo
    SELECT EXISTS (SELECT 1 FROM public.leads WHERE cpf = cpf_to_check) INTO already_leads;
    
    -- Verifica blacklist (exemplo, caso tenha uma tabela de blacklist)
    -- SELECT EXISTS (SELECT 1 FROM public.blacklist WHERE cpf = cpf_to_check) INTO in_blacklist;
    in_blacklist := FALSE; -- Placeholder

    IF in_database THEN
        SELECT name, convenio, banco, margem_disponivel FROM public.leads_database WHERE cpf = cpf_to_check LIMIT 1 INTO lead_data;
        result := jsonb_build_object(
            'available', NOT already_leads AND NOT in_blacklist,
            'in_database', TRUE,
            'already_leads', already_leads,
            'in_blacklist', in_blacklist,
            'name', lead_data.name,
            'convenio', lead_data.convenio,
            'banco', lead_data.banco,
            'margem', lead_data.margem_disponivel
        );
    ELSE
        result := jsonb_build_object(
            'available', FALSE,
            'in_database', FALSE,
            'already_leads', already_leads,
            'in_blacklist', in_blacklist
        );
    END IF;

    RETURN result;
END;
$$;

-- Função de pré-visualização de quantidade
CREATE OR REPLACE FUNCTION public.preview_requested_leads_count(
    convenio_filter TEXT DEFAULT NULL,
    banco_filter TEXT DEFAULT NULL,
    ddd_filter TEXT[] DEFAULT NULL,
    tag_filter TEXT[] DEFAULT NULL,
    parcela_min NUMERIC DEFAULT NULL,
    parcela_max NUMERIC DEFAULT NULL,
    margem_min NUMERIC DEFAULT NULL,
    margem_max NUMERIC DEFAULT NULL,
    parcelas_pagas_min INTEGER DEFAULT NULL,
    parcelas_pagas_max INTEGER DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    total BIGINT;
BEGIN
    SELECT COUNT(*) INTO total
    FROM public.leads_database ld
    WHERE (convenio_filter IS NULL OR ld.convenio = convenio_filter)
      AND (banco_filter IS NULL OR ld.banco = banco_filter)
      AND (ddd_filter IS NULL OR LEFT(ld.phone, 2) = ANY(ddd_filter))
      AND (tag_filter IS NULL OR ld.tag = ANY(tag_filter))
      AND (parcela_min IS NULL OR ld.parcela >= parcela_min)
      AND (parcela_max IS NULL OR ld.parcela <= parcela_max)
      AND (margem_min IS NULL OR ld.margem_disponivel >= margem_min)
      AND (margem_max IS NULL OR ld.margem_disponivel <= margem_max)
      AND (parcelas_pagas_min IS NULL OR COALESCE(ld.parcelas_pagas, 0) >= parcelas_pagas_min)
      AND (parcelas_pagas_max IS NULL OR COALESCE(ld.parcelas_pagas, 0) <= parcelas_pagas_max)
      AND NOT EXISTS (SELECT 1 FROM public.leads l WHERE l.cpf = ld.cpf);
      
    RETURN total;
END;
$$;