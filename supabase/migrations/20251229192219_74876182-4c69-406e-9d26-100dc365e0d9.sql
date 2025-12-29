-- 1. Atualizar o limite diário para 80 leads
UPDATE public.daily_limits SET max_leads_per_day = 80, updated_at = now();

-- 2. Atualizar a função check_baseoff_daily_limit para usar 80 como limite
CREATE OR REPLACE FUNCTION public.check_baseoff_daily_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  daily_limit integer := 80;
  today_requests integer;
BEGIN
  -- Count today's requests for the user (leads efetivamente gerados)
  SELECT COALESCE(SUM(leads_count), 0) INTO today_requests
  FROM public.baseoff_requests
  WHERE user_id = user_id_param
  AND DATE(requested_at) = CURRENT_DATE;
  
  -- Return remaining leads available (créditos restantes)
  RETURN GREATEST(0, daily_limit - today_requests);
END;
$$;

-- 3. Atualizar a função check_daily_lead_limit para usar 80 como limite padrão
CREATE OR REPLACE FUNCTION public.check_daily_lead_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  daily_limit integer;
  today_requests integer;
BEGIN
  -- Get current daily limit (ou usar 80 como padrão)
  SELECT COALESCE(max_leads_per_day, 80) INTO daily_limit
  FROM public.daily_limits
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Se não houver configuração, usar 80
  IF daily_limit IS NULL THEN
    daily_limit := 80;
  END IF;
  
  -- Count today's requests for the user (leads efetivamente gerados)
  SELECT COALESCE(SUM(leads_count), 0) INTO today_requests
  FROM public.lead_requests
  WHERE user_id = user_id_param
  AND DATE(requested_at) = CURRENT_DATE;
  
  -- Return remaining leads available (créditos restantes)
  RETURN GREATEST(0, daily_limit - today_requests);
END;
$$;

-- 4. Adicionar comentários para documentação
COMMENT ON FUNCTION public.check_baseoff_daily_limit IS 'Verifica créditos restantes de Leads Premium (BaseOff) - Limite: 80/dia. Contabiliza apenas leads efetivamente entregues.';
COMMENT ON FUNCTION public.check_daily_lead_limit IS 'Verifica créditos restantes de leads gerais - Limite configurável (padrão: 80/dia). Contabiliza apenas leads efetivamente entregues.';