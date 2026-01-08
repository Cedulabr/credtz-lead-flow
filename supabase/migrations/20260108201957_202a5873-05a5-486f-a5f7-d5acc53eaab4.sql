
-- Dropar função existente para recriar com nova assinatura
DROP FUNCTION IF EXISTS public.get_available_convenios();

-- Recriar função usando lead_id ao invés de cpf
CREATE OR REPLACE FUNCTION public.get_available_convenios()
RETURNS TABLE(convenio text, available_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ld.convenio,
    COUNT(*)::bigint as available_count
  FROM public.leads_database ld
  WHERE ld.is_available = true
    -- Excluir leads já distribuídos (usando lead_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.leads_distribution dist 
      WHERE dist.lead_id = ld.id
    )
    -- Excluir leads na blacklist ativa (usando lead_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.blacklist bl 
      WHERE bl.lead_id = ld.id 
      AND bl.is_active = true
    )
  GROUP BY ld.convenio
  HAVING COUNT(*) > 0
  ORDER BY COUNT(*) DESC;
END;
$$;

-- Atualizar função request_leads_with_credits para usar lead_id
CREATE OR REPLACE FUNCTION public.request_leads_with_credits(
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
  current_credits integer;
  actual_leads_count integer;
BEGIN
  -- Check user's credit balance
  SELECT credits_balance INTO current_credits
  FROM public.user_credits
  WHERE user_id = auth.uid();
  
  IF current_credits IS NULL THEN
    RAISE EXCEPTION 'Você não possui créditos. Solicite liberação ao administrador.';
  END IF;
  
  IF current_credits <= 0 THEN
    RAISE EXCEPTION 'Seus créditos de leads acabaram. Solicite liberação ao administrador.';
  END IF;
  
  -- Limit the requested amount to available credits
  actual_leads_count := LEAST(leads_requested, current_credits);
  
  -- Create temp table for selected leads
  CREATE TEMP TABLE IF NOT EXISTS temp_selected_leads (
    id uuid,
    name text,
    cpf text,
    phone text,
    convenio text,
    banco text,
    tipo_beneficio text
  ) ON COMMIT DROP;
  
  TRUNCATE temp_selected_leads;
  
  -- Select available leads using lead_id for distribution check
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
    -- Excluir leads já distribuídos (usando lead_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.leads_distribution dist 
      WHERE dist.lead_id = ld.id
    )
    -- Excluir leads na blacklist ativa (usando lead_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.blacklist bl 
      WHERE bl.lead_id = ld.id 
      AND bl.is_active = true
    )
  ORDER BY RANDOM()
  LIMIT actual_leads_count;
  
  -- Get actual count of leads found
  SELECT COUNT(*) INTO actual_leads_count FROM temp_selected_leads;
  
  -- Only proceed if leads were found
  IF actual_leads_count > 0 THEN
    -- Record distribution for each lead using lead_id
    INSERT INTO public.leads_distribution (lead_id, user_id, distributed_at, expires_at)
    SELECT tsl.id, auth.uid(), now(), now() + interval '10 years'
    FROM temp_selected_leads tsl
    ON CONFLICT DO NOTHING;
    
    -- Mark leads as unavailable
    UPDATE public.leads_database 
    SET is_available = false, updated_at = now()
    WHERE id IN (SELECT id FROM temp_selected_leads);
    
    -- Deduct credits from user
    UPDATE public.user_credits
    SET credits_balance = credits_balance - actual_leads_count,
        updated_at = now()
    WHERE user_id = auth.uid();
    
    -- Log credit consumption
    INSERT INTO public.credits_history (user_id, admin_id, action, amount, balance_before, balance_after, reason)
    VALUES (
      auth.uid(),
      auth.uid(),
      'consume',
      actual_leads_count,
      current_credits,
      current_credits - actual_leads_count,
      'Solicitação de ' || actual_leads_count || ' leads'
    );
    
    -- Insert request record
    INSERT INTO public.lead_requests (user_id, convenio, banco, produto, leads_count)
    VALUES (auth.uid(), convenio_filter, banco_filter, produto_filter, actual_leads_count);
  END IF;
  
  -- Return selected leads
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
