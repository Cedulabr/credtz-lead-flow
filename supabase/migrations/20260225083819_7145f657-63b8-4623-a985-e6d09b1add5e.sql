
-- SMS Credits table
CREATE TABLE public.sms_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  credits_balance INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access sms_credits" ON public.sms_credits
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own sms_credits" ON public.sms_credits
  FOR SELECT USING (auth.uid() = user_id);

-- SMS Credits History table
CREATE TABLE public.sms_credits_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  admin_id UUID,
  action TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_before INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_credits_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access sms_credits_history" ON public.sms_credits_history
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users read own sms_credits_history" ON public.sms_credits_history
  FOR SELECT USING (auth.uid() = user_id);

-- RPC: admin_manage_sms_credits
CREATE OR REPLACE FUNCTION public.admin_manage_sms_credits(
  target_user_id UUID,
  credit_action TEXT,
  credit_amount INTEGER,
  credit_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_balance INTEGER;
  new_balance INTEGER;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem gerenciar créditos SMS';
  END IF;

  IF credit_action NOT IN ('add', 'remove') THEN
    RAISE EXCEPTION 'Ação inválida. Use "add" ou "remove"';
  END IF;

  SELECT credits_balance INTO current_balance
  FROM public.sms_credits WHERE user_id = target_user_id;

  IF current_balance IS NULL THEN
    INSERT INTO public.sms_credits (user_id, credits_balance) VALUES (target_user_id, 0);
    current_balance := 0;
  END IF;

  IF credit_action = 'add' THEN
    new_balance := current_balance + credit_amount;
  ELSE
    new_balance := GREATEST(0, current_balance - credit_amount);
  END IF;

  UPDATE public.sms_credits
  SET credits_balance = new_balance, updated_at = now()
  WHERE user_id = target_user_id;

  INSERT INTO public.sms_credits_history (user_id, admin_id, action, amount, balance_before, balance_after, reason)
  VALUES (target_user_id, auth.uid(), credit_action, credit_amount, current_balance, new_balance, credit_reason);

  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'action', credit_action,
    'amount', credit_amount,
    'balance_before', current_balance,
    'balance_after', new_balance
  );
END;
$$;

-- RPC: get_user_sms_credits
CREATE OR REPLACE FUNCTION public.get_user_sms_credits(target_user_id UUID DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  balance INTEGER;
  check_user_id UUID;
BEGIN
  check_user_id := COALESCE(target_user_id, auth.uid());
  SELECT credits_balance INTO balance FROM public.sms_credits WHERE user_id = check_user_id;
  RETURN COALESCE(balance, 0);
END;
$$;
