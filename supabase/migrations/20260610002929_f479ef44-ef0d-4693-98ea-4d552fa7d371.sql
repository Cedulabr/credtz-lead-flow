-- Drop existing function to change signature (include both old signatures if they exist)
DROP FUNCTION IF EXISTS public.request_leads_with_credits(text,text,text,integer,text[],text[],numeric,numeric,numeric);
DROP FUNCTION IF EXISTS public.request_leads_with_credits(text,text,text,integer,text[],text[],numeric,numeric,numeric,numeric,integer,integer);

-- Recreate with new parameters: adding margem_max, parcelas_pagas_min, parcelas_pagas_max
CREATE OR REPLACE FUNCTION public.request_leads_with_credits(
    convenio_filter text DEFAULT NULL::text,
    banco_filter text DEFAULT NULL::text,
    produto_filter text DEFAULT NULL::text,
    leads_requested integer DEFAULT 10,
    ddd_filter text[] DEFAULT NULL::text[],
    tag_filter text[] DEFAULT NULL::text[],
    parcela_min numeric DEFAULT NULL::numeric,
    parcela_max numeric DEFAULT NULL::numeric,
    margem_min numeric DEFAULT NULL::numeric,
    margem_max numeric DEFAULT NULL::numeric,
    parcelas_pagas_min integer DEFAULT NULL::integer,
    parcelas_pagas_max integer DEFAULT NULL::integer
)
RETURNS TABLE(
    name text,
    cpf text,
    phone text,
    phone2 text,
    convenio text,
    tag text,
    matricula text,
    emprestimos jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    selected_cpfs text[];
BEGIN
    -- 1. Identificar os CPFs únicos que atendem aos critérios e estão disponíveis
    SELECT array_agg(sub.cpf) INTO selected_cpfs
    FROM (
        SELECT ld.cpf
        FROM public.leads_database ld
        WHERE ld.is_available = true
          AND (convenio_filter IS NULL OR ld.convenio = convenio_filter)
          AND (banco_filter IS NULL OR ld.banco = banco_filter)
          AND (ddd_filter IS NULL OR (regexp_replace(ld.phone, '\D', '', 'g') ~ ('^(' || array_to_string(ddd_filter, '|') || ')')))
          AND (tag_filter IS NULL OR ld.tag = ANY(tag_filter))
          AND (parcela_min IS NULL OR ld.parcela >= parcela_min)
          AND (parcela_max IS NULL OR ld.parcela <= parcela_max)
          AND (margem_min IS NULL OR ld.margem_disponivel >= margem_min)
          AND (margem_max IS NULL OR ld.margem_disponivel <= margem_max)
          AND (parcelas_pagas_min IS NULL OR ld.parcelas_pagas >= parcelas_pagas_min)
          AND (parcelas_pagas_max IS NULL OR ld.parcelas_pagas <= parcelas_pagas_max)
          -- Blacklist check
          AND NOT EXISTS (
            SELECT 1 FROM public.leads_blacklist bl 
            WHERE bl.cpf = ld.cpf AND bl.expires_at > now()
          )
        GROUP BY ld.cpf, MIN(ld.created_at)
        ORDER BY MIN(ld.created_at) DESC
        LIMIT leads_requested
    ) sub;

    IF selected_cpfs IS NULL THEN
        RETURN;
    END IF;

    -- 2. Marcar todos os registros desses CPFs como indisponíveis
    UPDATE public.leads_database
    SET is_available = false
    WHERE cpf = ANY(selected_cpfs);

    -- 3. Adicionar à blacklist por 30 dias
    INSERT INTO public.leads_blacklist (cpf, reason, expires_at, created_by)
    SELECT 
        u_cpf, 
        'Lead solicitado via sistema', 
        now() + interval '30 days',
        auth.uid()
    FROM unnest(selected_cpfs) AS u_cpf
    ON CONFLICT (cpf) DO UPDATE SET 
        expires_at = EXCLUDED.expires_at,
        reason = EXCLUDED.reason;

    -- 4. Retornar os dados agrupados
    RETURN QUERY
    SELECT 
        ld.name,
        ld.cpf,
        MAX(ld.phone) as phone,
        MAX(ld.phone2) as phone2,
        MAX(ld.convenio) as convenio,
        MAX(ld.tag) as tag,
        MAX(ld.matricula) as matricula,
        jsonb_agg(
            jsonb_build_object(
                'banco', ld.banco,
                'parcela', ld.parcela,
                'parcelas_pagas', COALESCE(ld.parcelas_pagas, 0),
                'parcelas_em_aberto', COALESCE(ld.parcelas_em_aberto, 0),
                'matricula', ld.matricula,
                'margem_disponivel', ld.margem_disponivel
            )
        ) as emprestimos
    FROM public.leads_database ld
    WHERE ld.cpf = ANY(selected_cpfs)
    GROUP BY ld.name, ld.cpf;
END;
$$;