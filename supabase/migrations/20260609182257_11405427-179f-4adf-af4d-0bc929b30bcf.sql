-- Add columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS agibank_account_type TEXT,
ADD COLUMN IF NOT EXISTS agibank_link_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS agibank_monthly_income NUMERIC,
ADD COLUMN IF NOT EXISTS agibank_is_onboarded BOOLEAN,
ADD COLUMN IF NOT EXISTS agibank_last_interaction_type TEXT,
ADD COLUMN IF NOT EXISTS agibank_last_interaction_date TIMESTAMP WITH TIME ZONE;

-- Update request_leads_with_credits
CREATE OR REPLACE FUNCTION public.request_leads_with_credits(
    convenio_filter text DEFAULT NULL::text,
    banco_filter text DEFAULT NULL::text,
    produto_filter text DEFAULT NULL::text,
    leads_requested integer DEFAULT 10,
    ddd_filter text[] DEFAULT NULL::text[],
    tag_filter text[] DEFAULT NULL::text[],
    parcela_min numeric DEFAULT NULL::numeric,
    parcela_max numeric DEFAULT NULL::numeric,
    margem_min numeric DEFAULT NULL::numeric
)
 RETURNS SETOF public.leads_database
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT ld.*
    FROM public.leads_database ld
    WHERE ld.is_available = true
      AND (convenio_filter IS NULL OR ld.convenio = convenio_filter)
      AND (banco_filter IS NULL OR ld.banco = banco_filter)
      AND (ddd_filter IS NULL OR (regexp_replace(ld.phone, '\D', '', 'g') ~ ('^(' || array_to_string(ddd_filter, '|') || ')')))
      AND (tag_filter IS NULL OR ld.tag = ANY(tag_filter))
      AND (parcela_min IS NULL OR ld.parcela >= parcela_min)
      AND (parcela_max IS NULL OR ld.parcela <= parcela_max)
      AND (margem_min IS NULL OR ld.margem_disponivel >= margem_min)
      -- Blacklist check
      AND NOT EXISTS (
        SELECT 1 FROM public.leads_blacklist bl 
        WHERE bl.cpf = ld.cpf AND bl.expires_at > now()
      )
    ORDER BY ld.created_at DESC
    LIMIT leads_requested;
END;
$function$;