
-- =====================================================
-- MARKETPLACE SAAS MODULAR - FUNDAÇÃO
-- =====================================================

-- ===== modules =====
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  description text,
  icon text,
  billing_type text NOT NULL CHECK (billing_type IN ('subscription','credits','hybrid')),
  monthly_price_cents integer NOT NULL DEFAULT 0,
  credit_price_cents integer NOT NULL DEFAULT 0,
  stripe_product_id text,
  stripe_price_id text,
  trial_days integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modules_select_all_authenticated" ON public.modules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "modules_admin_all" ON public.modules
  FOR ALL TO authenticated
  USING (public.has_role_safe(auth.uid(), 'admin'))
  WITH CHECK (public.has_role_safe(auth.uid(), 'admin'));

CREATE TRIGGER modules_updated_at
  BEFORE UPDATE ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== company_modules =====
CREATE TABLE public.company_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  module_slug text NOT NULL,
  status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','trialing','past_due','canceled','inactive')),
  stripe_subscription_id text,
  stripe_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  grace_period_until timestamptz,
  activated_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, module_id)
);

CREATE INDEX idx_company_modules_company ON public.company_modules(company_id);
CREATE INDEX idx_company_modules_status ON public.company_modules(status);

ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_modules_select_own_company" ON public.company_modules
  FOR SELECT TO authenticated
  USING (
    public.has_role_safe(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_modules.company_id
        AND uc.is_active = true
    )
  );

CREATE POLICY "company_modules_admin_all" ON public.company_modules
  FOR ALL TO authenticated
  USING (public.has_role_safe(auth.uid(), 'admin'))
  WITH CHECK (public.has_role_safe(auth.uid(), 'admin'));

CREATE TRIGGER company_modules_updated_at
  BEFORE UPDATE ON public.company_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== wallets =====
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  module_slug text NOT NULL,
  balance integer NOT NULL DEFAULT 0,
  total_purchased integer NOT NULL DEFAULT 0,
  total_consumed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, module_slug)
);

CREATE INDEX idx_wallets_company ON public.wallets(company_id);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_select_own_company" ON public.wallets
  FOR SELECT TO authenticated
  USING (
    public.has_role_safe(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = wallets.company_id
        AND uc.is_active = true
    )
  );

CREATE POLICY "wallets_admin_all" ON public.wallets
  FOR ALL TO authenticated
  USING (public.has_role_safe(auth.uid(), 'admin'))
  WITH CHECK (public.has_role_safe(auth.uid(), 'admin'));

CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== wallet_transactions =====
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('purchase','consume','refund','admin_adjust')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  reference_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_wallet ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_company ON public.wallet_transactions(company_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet_tx_select_own_company" ON public.wallet_transactions
  FOR SELECT TO authenticated
  USING (
    public.has_role_safe(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = wallet_transactions.company_id
        AND uc.is_active = true
    )
  );

-- ===== credit_packages =====
CREATE TABLE public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_slug text NOT NULL,
  name text NOT NULL,
  credits integer NOT NULL,
  price_cents integer NOT NULL,
  stripe_price_id text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_credit_packages_module ON public.credit_packages(module_slug);

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_packages_select_all_authenticated" ON public.credit_packages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "credit_packages_admin_all" ON public.credit_packages
  FOR ALL TO authenticated
  USING (public.has_role_safe(auth.uid(), 'admin'))
  WITH CHECK (public.has_role_safe(auth.uid(), 'admin'));

-- ===== billing_events (idempotência) =====
CREATE TABLE public.billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
-- sem políticas: apenas service role

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Verifica se uma empresa tem acesso a um módulo
CREATE OR REPLACE FUNCTION public.has_module_access(_company_id uuid, _slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_modules cm
    JOIN public.modules m ON m.id = cm.module_id
    WHERE cm.company_id = _company_id
      AND m.slug = _slug
      AND (
        cm.status IN ('active','trialing')
        OR (cm.grace_period_until IS NOT NULL AND cm.grace_period_until > now())
      )
  );
$$;

-- Debita créditos da carteira atomicamente
CREATE OR REPLACE FUNCTION public.consume_wallet(
  _wallet_id uuid,
  _amount integer,
  _reference_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _new_balance integer;
  _company_id uuid;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  UPDATE public.wallets
     SET balance = balance - _amount,
         total_consumed = total_consumed + _amount,
         updated_at = now()
   WHERE id = _wallet_id
     AND balance >= _amount
   RETURNING balance, company_id INTO _new_balance, _company_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance');
  END IF;

  INSERT INTO public.wallet_transactions(wallet_id, company_id, type, amount, balance_after, reference_id, metadata)
  VALUES (_wallet_id, _company_id, 'consume', _amount, _new_balance, _reference_id, _metadata);

  RETURN jsonb_build_object('success', true, 'balance', _new_balance);
END;
$$;

-- Credita carteira (criando se não existir)
CREATE OR REPLACE FUNCTION public.credit_wallet(
  _company_id uuid,
  _module_slug text,
  _amount integer,
  _type text DEFAULT 'purchase',
  _reference_id text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet_id uuid;
  _new_balance integer;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;

  INSERT INTO public.wallets(company_id, module_slug, balance, total_purchased)
  VALUES (_company_id, _module_slug, _amount,
          CASE WHEN _type = 'purchase' THEN _amount ELSE 0 END)
  ON CONFLICT (company_id, module_slug) DO UPDATE
    SET balance = public.wallets.balance + _amount,
        total_purchased = public.wallets.total_purchased
                        + CASE WHEN _type = 'purchase' THEN _amount ELSE 0 END,
        updated_at = now()
  RETURNING id, balance INTO _wallet_id, _new_balance;

  INSERT INTO public.wallet_transactions(wallet_id, company_id, type, amount, balance_after, reference_id, metadata)
  VALUES (_wallet_id, _company_id, _type, _amount, _new_balance, _reference_id, _metadata);

  RETURN jsonb_build_object('success', true, 'wallet_id', _wallet_id, 'balance', _new_balance);
END;
$$;

-- =====================================================
-- SEEDS
-- =====================================================
INSERT INTO public.modules (slug, name, category, description, icon, billing_type, monthly_price_cents, credit_price_cents, sort_order, active) VALUES
  ('sms', 'SMS', 'comunicacao', 'Envio de SMS por créditos', 'MessageSquare', 'credits', 0, 8, 10, true),
  ('leads-premium', 'Leads Premium', 'vendas', 'Compra de leads qualificados por crédito', 'Sparkles', 'credits', 0, 2990, 20, true),
  ('activate-leads', 'Activate Leads', 'vendas', 'Reativação inteligente de leads', 'Zap', 'subscription', 19990, 0, 30, true),
  ('controle-ponto', 'Controle de Ponto', 'gestao', 'Bater ponto, escalas e auditoria', 'Clock', 'subscription', 14900, 0, 40, true),
  ('meus-clientes', 'Meus Clientes', 'gestao', 'CRM completo de clientes', 'Users', 'subscription', 0, 0, 50, false),
  ('gerador-propostas', 'Gerador de Propostas', 'gestao', 'Propostas em PDF, templates e tracking', 'FileText', 'subscription', 0, 0, 60, false),
  ('notas-workspace', 'Notas & Workspace', 'gestao', 'Notas, kanban e colaboração', 'StickyNote', 'subscription', 0, 0, 70, false);

INSERT INTO public.credit_packages (module_slug, name, credits, price_cents, sort_order) VALUES
  ('sms', 'Pacote 100 SMS', 100, 800, 1),
  ('sms', 'Pacote 500 SMS', 500, 4000, 2),
  ('sms', 'Pacote 2.000 SMS', 2000, 16000, 3),
  ('sms', 'Pacote 5.000 SMS', 5000, 40000, 4);
