-- 1. Criar tabela de distribuição de leads (para evitar duplicidade)
CREATE TABLE IF NOT EXISTS public.leads_distribution (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf text NOT NULL,
  user_id uuid NOT NULL,
  distributed_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_leads_distribution_cpf ON public.leads_distribution(cpf);
CREATE INDEX IF NOT EXISTS idx_leads_distribution_expires ON public.leads_distribution(expires_at);
CREATE INDEX IF NOT EXISTS idx_leads_distribution_cpf_user ON public.leads_distribution(cpf, user_id);

-- Habilitar RLS
ALTER TABLE public.leads_distribution ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage distribution" ON public.leads_distribution
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their distributions" ON public.leads_distribution
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 2. Atualizar função request_leads para respeitar blacklist e distribuição exclusiva
CREATE OR REPLACE FUNCTION public.request_leads(
  convenio_filter text DEFAULT NULL,
  banco_filter text DEFAULT NULL,
  produto_filter text DEFAULT NULL,
  leads_requested integer DEFAULT 10
)
RETURNS TABLE(
  lead_id uuid,
  name text,
  cpf text,
  phone text,
  convenio text,
  banco text,
  tipo_beneficio text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining_limit integer;
  actual_leads_count integer;
BEGIN
  -- Check daily limit
  SELECT public.check_daily_lead_limit(auth.uid()) INTO remaining_limit;
  
  IF remaining_limit <= 0 THEN
    RAISE EXCEPTION 'Daily lead limit exceeded';
  END IF;
  
  -- Limit the requested amount to remaining limit
  actual_leads_count := LEAST(leads_requested, remaining_limit);
  
  -- Criar tabela temporária para leads selecionados
  CREATE TEMP TABLE IF NOT EXISTS temp_selected_leads (
    id uuid,
    name text,
    cpf text,
    phone text,
    convenio text,
    banco text,
    tipo_beneficio text
  ) ON COMMIT DROP;
  
  DELETE FROM temp_selected_leads;
  
  -- Selecionar leads que:
  -- 1. Não estão na blacklist (ou blacklist expirada)
  -- 2. Não foram distribuídos para NENHUM usuário recentemente
  -- 3. Estão disponíveis
  INSERT INTO temp_selected_leads
  SELECT 
    ld.id,
    ld.name,
    ld.cpf,
    ld.phone,
    ld.convenio,
    ld.banco,
    ld.tipo_beneficio
  FROM public.leads_database ld
  WHERE ld.is_available = true
    AND (convenio_filter IS NULL OR ld.convenio = convenio_filter)
    AND (banco_filter IS NULL OR ld.banco = banco_filter)
    -- Excluir leads na blacklist ativa
    AND NOT EXISTS (
      SELECT 1 FROM public.leads_blacklist lb 
      WHERE lb.cpf = ld.cpf 
      AND lb.expires_at > now()
    )
    -- Excluir leads já distribuídos para qualquer usuário (período de bloqueio)
    AND NOT EXISTS (
      SELECT 1 FROM public.leads_distribution dist 
      WHERE dist.cpf = ld.cpf 
      AND dist.expires_at > now()
    )
  ORDER BY RANDOM()
  LIMIT actual_leads_count;
  
  -- Obter quantidade real de leads encontrados
  SELECT COUNT(*) INTO actual_leads_count FROM temp_selected_leads;
  
  -- Só registrar se houver leads encontrados
  IF actual_leads_count > 0 THEN
    -- Registrar distribuição para cada lead
    INSERT INTO public.leads_distribution (cpf, user_id, distributed_at, expires_at)
    SELECT tsl.cpf, auth.uid(), now(), now() + interval '30 days'
    FROM temp_selected_leads tsl
    ON CONFLICT DO NOTHING;
    
    -- Marcar leads como não disponíveis
    UPDATE public.leads_database 
    SET is_available = false, updated_at = now()
    WHERE id IN (SELECT id FROM temp_selected_leads);
    
    -- Insert request record com quantidade real de leads entregues
    INSERT INTO public.lead_requests (user_id, convenio, banco, produto, leads_count)
    VALUES (auth.uid(), convenio_filter, banco_filter, produto_filter, actual_leads_count);
  END IF;
  
  -- Return leads selecionados
  RETURN QUERY
  SELECT 
    tsl.id,
    tsl.name,
    tsl.cpf,
    tsl.phone,
    tsl.convenio,
    tsl.banco,
    tsl.tipo_beneficio
  FROM temp_selected_leads tsl;
END;
$$;

-- 3. Criar função para adicionar lead à blacklist
CREATE OR REPLACE FUNCTION public.add_lead_to_blacklist(
  lead_cpf text,
  blacklist_reason text DEFAULT 'recusou_oferta'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir na blacklist (ou atualizar se já existir)
  INSERT INTO public.leads_blacklist (cpf, reason, blacklisted_by, expires_at)
  VALUES (lead_cpf, blacklist_reason, auth.uid(), now() + interval '120 days')
  ON CONFLICT ON CONSTRAINT unique_blacklist_cpf DO UPDATE
  SET 
    reason = EXCLUDED.reason,
    blacklisted_at = now(),
    expires_at = now() + interval '120 days',
    blacklisted_by = auth.uid();
END;
$$;

-- Comentários para documentação
COMMENT ON TABLE public.leads_distribution IS 'Registro de distribuição de leads para evitar duplicidade entre usuários (30 dias)';
COMMENT ON FUNCTION public.request_leads IS 'Solicita leads respeitando blacklist (120 dias) e distribuição exclusiva (30 dias)';
COMMENT ON FUNCTION public.add_lead_to_blacklist IS 'Adiciona um lead à blacklist por 120 dias';