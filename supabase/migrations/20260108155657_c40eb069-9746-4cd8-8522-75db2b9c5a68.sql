-- Create user_credits table to manage lead credits per user
CREATE TABLE public.user_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  credits_balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- Create unique constraint on user_id
ALTER TABLE public.user_credits ADD CONSTRAINT unique_user_credits UNIQUE (user_id);

-- RLS Policies for user_credits
CREATE POLICY "Users can view their own credits"
ON public.user_credits FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can insert credits"
ON public.user_credits FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update credits"
ON public.user_credits FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create credits_history table for audit logging
CREATE TABLE public.credits_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  admin_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('add', 'remove', 'consume')),
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.credits_history ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX idx_credits_history_user_id ON public.credits_history(user_id);
CREATE INDEX idx_credits_history_created_at ON public.credits_history(created_at DESC);

-- RLS Policies for credits_history
CREATE POLICY "Users can view their own credits history"
ON public.credits_history FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert credits history"
ON public.credits_history FOR INSERT
WITH CHECK (true);

-- Update the request_leads function to use credits instead of daily limits
CREATE OR REPLACE FUNCTION public.request_leads_with_credits(
  convenio_filter text DEFAULT NULL::text,
  banco_filter text DEFAULT NULL::text,
  produto_filter text DEFAULT NULL::text,
  leads_requested integer DEFAULT 10
)
RETURNS TABLE(lead_id uuid, name text, cpf text, phone text, convenio text, banco text, tipo_beneficio text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Select leads that:
  -- 1. Are not in blacklist (or blacklist expired)
  -- 2. Were never distributed to ANY user
  -- 3. Are available
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
    -- Exclude leads in active blacklist
    AND NOT EXISTS (
      SELECT 1 FROM public.leads_blacklist lb 
      WHERE lb.cpf = ld.cpf 
      AND lb.expires_at > now()
    )
    -- CRITICAL: Exclude leads EVER distributed to ANY user (permanent block)
    AND NOT EXISTS (
      SELECT 1 FROM public.leads_distribution dist 
      WHERE dist.cpf = ld.cpf
    )
  ORDER BY RANDOM()
  LIMIT actual_leads_count;
  
  -- Get actual count of leads found
  SELECT COUNT(*) INTO actual_leads_count FROM temp_selected_leads;
  
  -- Only proceed if leads were found
  IF actual_leads_count > 0 THEN
    -- Record distribution for each lead (permanent record)
    INSERT INTO public.leads_distribution (cpf, user_id, distributed_at, expires_at)
    SELECT tsl.cpf, auth.uid(), now(), now() + interval '10 years'
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
$function$;

-- Function for admin to manage credits
CREATE OR REPLACE FUNCTION public.admin_manage_credits(
  target_user_id uuid,
  credit_action text,
  credit_amount integer,
  credit_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_balance integer;
  new_balance integer;
  result jsonb;
BEGIN
  -- Only admins can manage credits
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem gerenciar créditos';
  END IF;
  
  -- Validate action
  IF credit_action NOT IN ('add', 'remove') THEN
    RAISE EXCEPTION 'Ação inválida. Use "add" ou "remove"';
  END IF;
  
  -- Get current balance or create record
  SELECT credits_balance INTO current_balance
  FROM public.user_credits
  WHERE user_id = target_user_id;
  
  IF current_balance IS NULL THEN
    -- Create new record
    INSERT INTO public.user_credits (user_id, credits_balance)
    VALUES (target_user_id, 0);
    current_balance := 0;
  END IF;
  
  -- Calculate new balance
  IF credit_action = 'add' THEN
    new_balance := current_balance + credit_amount;
  ELSE
    new_balance := GREATEST(0, current_balance - credit_amount);
  END IF;
  
  -- Update credits
  UPDATE public.user_credits
  SET credits_balance = new_balance, updated_at = now()
  WHERE user_id = target_user_id;
  
  -- Log the action
  INSERT INTO public.credits_history (user_id, admin_id, action, amount, balance_before, balance_after, reason)
  VALUES (
    target_user_id,
    auth.uid(),
    credit_action,
    credit_amount,
    current_balance,
    new_balance,
    credit_reason
  );
  
  -- Return result
  result := jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'action', credit_action,
    'amount', credit_amount,
    'balance_before', current_balance,
    'balance_after', new_balance
  );
  
  RETURN result;
END;
$function$;

-- Function to get user credits balance
CREATE OR REPLACE FUNCTION public.get_user_credits(target_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  balance integer;
  check_user_id uuid;
BEGIN
  -- Use provided user_id or current user
  check_user_id := COALESCE(target_user_id, auth.uid());
  
  -- Get balance
  SELECT credits_balance INTO balance
  FROM public.user_credits
  WHERE user_id = check_user_id;
  
  RETURN COALESCE(balance, 0);
END;
$function$;

-- Trigger to update updated_at
CREATE TRIGGER update_user_credits_updated_at
BEFORE UPDATE ON public.user_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();