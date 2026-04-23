-- 1) Novas colunas em leads_database
ALTER TABLE public.leads_database
  ADD COLUMN IF NOT EXISTS matricula text,
  ADD COLUMN IF NOT EXISTS margem_disponivel numeric,
  ADD COLUMN IF NOT EXISTS margem_total numeric,
  ADD COLUMN IF NOT EXISTS situacao text,
  ADD COLUMN IF NOT EXISTS ade text,
  ADD COLUMN IF NOT EXISTS servico_servidor text,
  ADD COLUMN IF NOT EXISTS tipo_servico_servidor text,
  ADD COLUMN IF NOT EXISTS servico_consignataria text,
  ADD COLUMN IF NOT EXISTS deferimento date,
  ADD COLUMN IF NOT EXISTS quitacao date,
  ADD COLUMN IF NOT EXISTS ultimo_desconto date,
  ADD COLUMN IF NOT EXISTS ultima_parcela date,
  ADD COLUMN IF NOT EXISTS origem_base text DEFAULT 'manual';

-- 2) Índices para filtros novos
CREATE INDEX IF NOT EXISTS idx_leads_database_banco
  ON public.leads_database(banco) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_leads_database_margem
  ON public.leads_database(margem_disponivel) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_leads_database_parcela
  ON public.leads_database(parcela) WHERE is_available = true;

-- 3) Drop da função atual (assinatura antiga) e recriação com novos parâmetros
DROP FUNCTION IF EXISTS public.request_leads_with_credits(text, text, text, integer, text[], text[]);

CREATE OR REPLACE FUNCTION public.request_leads_with_credits(
  convenio_filter text DEFAULT NULL,
  banco_filter text DEFAULT NULL,
  produto_filter text DEFAULT NULL,
  leads_requested integer DEFAULT 10,
  ddd_filter text[] DEFAULT NULL,
  tag_filter text[] DEFAULT NULL,
  parcela_min numeric DEFAULT NULL,
  parcela_max numeric DEFAULT NULL,
  margem_min numeric DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  name text,
  cpf text,
  phone text,
  phone2 text,
  convenio text,
  banco text,
  tag text,
  parcela numeric,
  margem_disponivel numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_credits INTEGER;
  user_id_var UUID := auth.uid();
  leads_to_deliver INTEGER;
  actual_delivered INTEGER;
BEGIN
  SELECT credits_balance INTO current_credits
  FROM public.user_credits
  WHERE user_id = user_id_var;

  IF current_credits IS NULL OR current_credits <= 0 THEN
    RAISE EXCEPTION 'Sem créditos disponíveis';
  END IF;

  leads_to_deliver := LEAST(leads_requested, current_credits);

  CREATE TEMP TABLE IF NOT EXISTS temp_request_leads (
    id uuid,
    name text,
    cpf text,
    phone text,
    phone2 text,
    convenio text,
    banco text,
    tag text,
    parcela numeric,
    margem_disponivel numeric
  ) ON COMMIT DROP;

  TRUNCATE temp_request_leads;

  INSERT INTO temp_request_leads
  SELECT ld.id, ld.name, ld.cpf, ld.phone, ld.phone2, ld.convenio, ld.banco, ld.tag,
         ld.parcela, ld.margem_disponivel
  FROM public.leads_database ld
  WHERE ld.is_available = true
    AND (convenio_filter IS NULL OR ld.convenio = convenio_filter)
    AND (banco_filter IS NULL OR ld.banco = banco_filter)
    AND (ddd_filter IS NULL OR ARRAY_LENGTH(ddd_filter, 1) IS NULL OR
         SUBSTRING(ld.phone FROM 1 FOR 2) = ANY(ddd_filter))
    AND (tag_filter IS NULL OR ARRAY_LENGTH(tag_filter, 1) IS NULL OR
         ld.tag = ANY(tag_filter))
    AND (parcela_min IS NULL OR ld.parcela >= parcela_min)
    AND (parcela_max IS NULL OR ld.parcela <= parcela_max)
    AND (margem_min IS NULL OR ld.margem_disponivel >= margem_min)
    AND NOT EXISTS (
      SELECT 1 FROM public.leads_distribution dist
      WHERE dist.lead_id = ld.id
    )
  ORDER BY RANDOM()
  LIMIT leads_to_deliver
  FOR UPDATE SKIP LOCKED;

  SELECT COUNT(*) INTO actual_delivered FROM temp_request_leads;

  IF actual_delivered > 0 THEN
    UPDATE public.leads_database ld
    SET is_available = false, updated_at = now()
    FROM temp_request_leads trl
    WHERE ld.id = trl.id;

    UPDATE public.user_credits
    SET credits_balance = credits_balance - actual_delivered,
        updated_at = now()
    WHERE user_id = user_id_var;

    INSERT INTO public.credits_history (user_id, admin_id, action, amount, balance_before, balance_after, reason)
    VALUES (
      user_id_var,
      user_id_var,
      'consume',
      actual_delivered,
      current_credits,
      current_credits - actual_delivered,
      'Solicitação de ' || actual_delivered || ' leads'
    );

    INSERT INTO public.leads_distribution (lead_id, cpf, user_id, distributed_at, expires_at)
    SELECT trl.id, trl.cpf, user_id_var, now(), now() + interval '10 years'
    FROM temp_request_leads trl
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN QUERY SELECT * FROM temp_request_leads;
END;
$function$;

-- 4) Função auxiliar: listar bancos disponíveis
CREATE OR REPLACE FUNCTION public.get_available_bancos()
RETURNS TABLE(banco text, available_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT ld.banco, COUNT(*)::bigint AS available_count
  FROM public.leads_database ld
  WHERE ld.is_available = true
    AND ld.banco IS NOT NULL
    AND ld.banco <> ''
    AND NOT EXISTS (
      SELECT 1 FROM public.leads_distribution dist WHERE dist.lead_id = ld.id
    )
  GROUP BY ld.banco
  ORDER BY available_count DESC;
$function$;