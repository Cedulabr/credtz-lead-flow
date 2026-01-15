-- Permitir CPF nulo na tabela leads_distribution
ALTER TABLE public.leads_distribution ALTER COLUMN cpf DROP NOT NULL;

-- Atualizar a função para lidar corretamente com leads sem CPF
CREATE OR REPLACE FUNCTION public.request_leads_with_credits(
  convenio_filter text DEFAULT NULL::text, 
  banco_filter text DEFAULT NULL::text, 
  produto_filter text DEFAULT NULL::text, 
  leads_requested integer DEFAULT 10, 
  ddd_filter text[] DEFAULT NULL::text[], 
  tag_filter text[] DEFAULT NULL::text[]
)
RETURNS TABLE(id uuid, name text, cpf text, phone text, phone2 text, convenio text, banco text, tag text)
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
  -- Get current credits from user_credits table
  SELECT credits_balance INTO current_credits
  FROM public.user_credits
  WHERE user_id = user_id_var;
  
  IF current_credits IS NULL OR current_credits <= 0 THEN
    RAISE EXCEPTION 'Sem créditos disponíveis';
  END IF;
  
  -- Determine how many leads we can actually deliver
  leads_to_deliver := LEAST(leads_requested, current_credits);
  
  -- Create temp table for selected leads
  CREATE TEMP TABLE IF NOT EXISTS temp_request_leads (
    id uuid,
    name text,
    cpf text,
    phone text,
    phone2 text,
    convenio text,
    banco text,
    tag text
  ) ON COMMIT DROP;
  
  TRUNCATE temp_request_leads;
  
  -- Select and lock leads
  INSERT INTO temp_request_leads
  SELECT ld.id, ld.name, ld.cpf, ld.phone, ld.phone2, ld.convenio, ld.banco, ld.tag
  FROM public.leads_database ld
  WHERE ld.is_available = true
    AND (convenio_filter IS NULL OR ld.convenio = convenio_filter)
    AND (banco_filter IS NULL OR ld.banco = banco_filter)
    AND (ddd_filter IS NULL OR ARRAY_LENGTH(ddd_filter, 1) IS NULL OR 
         SUBSTRING(ld.phone FROM 1 FOR 2) = ANY(ddd_filter))
    AND (tag_filter IS NULL OR ARRAY_LENGTH(tag_filter, 1) IS NULL OR 
         ld.tag = ANY(tag_filter))
    -- Excluir leads já distribuídos (por lead_id OU por cpf se existir)
    AND NOT EXISTS (
      SELECT 1 FROM public.leads_distribution dist 
      WHERE dist.lead_id = ld.id
    )
  ORDER BY RANDOM()
  LIMIT leads_to_deliver
  FOR UPDATE SKIP LOCKED;
  
  -- Get actual count
  SELECT COUNT(*) INTO actual_delivered FROM temp_request_leads;
  
  IF actual_delivered > 0 THEN
    -- Mark leads as unavailable
    UPDATE public.leads_database ld
    SET is_available = false, updated_at = now()
    FROM temp_request_leads trl
    WHERE ld.id = trl.id;
    
    -- Deduct credits from user_credits table
    UPDATE public.user_credits
    SET credits_balance = credits_balance - actual_delivered,
        updated_at = now()
    WHERE user_id = user_id_var;
    
    -- Log credit consumption
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
    
    -- Record distribution using lead_id (CPF pode ser NULL)
    INSERT INTO public.leads_distribution (lead_id, cpf, user_id, distributed_at, expires_at)
    SELECT trl.id, trl.cpf, user_id_var, now(), now() + interval '10 years'
    FROM temp_request_leads trl
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Return selected leads
  RETURN QUERY SELECT * FROM temp_request_leads;
END;
$function$;