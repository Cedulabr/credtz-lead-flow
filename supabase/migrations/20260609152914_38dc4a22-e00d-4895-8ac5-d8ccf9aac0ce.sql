-- Adicionar colunas de blacklist na tabela import_logs
ALTER TABLE public.import_logs ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.import_logs ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;
ALTER TABLE public.import_logs ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.import_logs ADD COLUMN IF NOT EXISTS blacklisted_by UUID REFERENCES auth.users(id);

-- Adicionar batch_id na tabela leads para vincular ao lote de importação
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.import_logs(id);

-- Garantir permissões
GRANT UPDATE ON public.import_logs TO authenticated;
GRANT UPDATE ON public.import_logs TO service_role;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_import_logs_is_blacklisted ON public.import_logs(is_blacklisted);
CREATE INDEX IF NOT EXISTS idx_leads_batch_id ON public.leads(batch_id);

-- Remover função antiga para evitar conflito de tipo de retorno se necessário
DROP FUNCTION IF EXISTS public.request_leads_with_credits(text,text,text,integer,text[],text[],numeric,numeric,numeric);

-- Recriar a função de solicitação de leads incluindo o filtro de blacklist
CREATE OR REPLACE FUNCTION public.request_leads_with_credits(
    convenio_filter TEXT DEFAULT NULL,
    banco_filter TEXT DEFAULT NULL,
    produto_filter TEXT DEFAULT NULL,
    leads_requested INTEGER DEFAULT 1,
    ddd_filter TEXT[] DEFAULT NULL,
    tag_filter TEXT[] DEFAULT NULL,
    parcela_min NUMERIC DEFAULT NULL,
    parcela_max NUMERIC DEFAULT NULL,
    margem_min NUMERIC DEFAULT NULL
)
RETURNS SETOF public.leads
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT l.*
    FROM public.leads l
    LEFT JOIN public.import_logs il ON l.batch_id = il.id
    WHERE l.assigned_to IS NULL
      AND (convenio_filter IS NULL OR l.convenio = convenio_filter)
      AND (banco_filter IS NULL OR l.banco_operacao = banco_filter)
      -- Filtro de DDD simplificado usando regex
      AND (ddd_filter IS NULL OR (regexp_replace(l.phone, '\D', '', 'g') ~ ('^(' || array_to_string(ddd_filter, '|') || ')')))
      AND (tag_filter IS NULL OR l.tag = ANY(tag_filter))
      AND (parcela_min IS NULL OR l.valor_operacao >= parcela_min)
      AND (parcela_max IS NULL OR l.valor_operacao <= parcela_max)
      AND (margem_min IS NULL OR (COALESCE(l.metadata->>'margem', '0'))::numeric >= margem_min)
      -- Filtro de blacklist
      AND (il.is_blacklisted IS NULL OR il.is_blacklisted = FALSE)
    ORDER BY l.created_at DESC
    LIMIT leads_requested;
END;
$$;