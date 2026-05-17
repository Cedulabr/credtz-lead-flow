
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS features jsonb DEFAULT '[]'::jsonb;

INSERT INTO public.modules (slug, name, description, billing_type, monthly_price_cents, credit_price_cents, category, icon, active, trial_days, features)
VALUES (
  'easynflow',
  'Easyn Flow',
  'CRM WhatsApp multi-agente com kanban, funil e conversas centralizadas.',
  'subscription',
  29900, 0, 'comunicacao', 'MessageSquare', true, 7,
  '["Múltiplos agentes","Instâncias WhatsApp","Kanban e funil","Conversas centralizadas"]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  billing_type = EXCLUDED.billing_type,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  features = EXCLUDED.features;

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  module_slug text,
  stripe_invoice_id text UNIQUE,
  stripe_subscription_id text,
  stripe_customer_id text,
  amount_paid numeric(10,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'brl',
  status text NOT NULL,
  hosted_invoice_url text,
  invoice_pdf text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON public.invoices(stripe_subscription_id);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_admin_all" ON public.invoices;
CREATE POLICY "invoices_admin_all" ON public.invoices
  FOR ALL TO authenticated
  USING (public.has_role_safe(auth.uid(), 'admin'))
  WITH CHECK (public.has_role_safe(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "invoices_company_read" ON public.invoices;
CREATE POLICY "invoices_company_read" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.user_companies
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "invoices_block_user_insert" ON public.invoices;
CREATE POLICY "invoices_block_user_insert" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (false);
