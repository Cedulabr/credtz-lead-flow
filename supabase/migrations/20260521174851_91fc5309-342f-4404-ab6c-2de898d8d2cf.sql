
DO $$ BEGIN
  CREATE TYPE public.agibank_lead_status AS ENUM (
    'novo','em_andamento','nao_e_whatsapp','nao_e_cliente',
    'sem_interesse','cliente_fechado','agendado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.agibank_lead_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid NOT NULL,
  company_id uuid,
  file_name text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  skipped_duplicates integer NOT NULL DEFAULT 0,
  skipped_blacklist integer NOT NULL DEFAULT 0
);

CREATE TABLE public.agibank_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  agent_id uuid,
  company_id uuid,
  list_id uuid REFERENCES public.agibank_lead_lists(id) ON DELETE SET NULL,
  name text NOT NULL,
  phone text NOT NULL,
  document text,
  status public.agibank_lead_status NOT NULL DEFAULT 'novo',
  scheduled_at timestamptz,
  credits_cost integer NOT NULL DEFAULT 1,
  first_opened_at timestamptz,
  notes text
);
CREATE INDEX idx_agibank_leads_agent ON public.agibank_leads(agent_id);
CREATE INDEX idx_agibank_leads_company ON public.agibank_leads(company_id);
CREATE INDEX idx_agibank_leads_status ON public.agibank_leads(status);
CREATE INDEX idx_agibank_leads_phone ON public.agibank_leads(phone);

CREATE TABLE public.agibank_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  reason text,
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.agibank_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_agibank_leads_updated
BEFORE UPDATE ON public.agibank_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_agibank_credits_updated
BEFORE UPDATE ON public.agibank_credits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.agibank_auto_blacklist()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'sem_interesse' AND (OLD.status IS DISTINCT FROM 'sem_interesse') THEN
    INSERT INTO public.agibank_blacklist (phone, reason, added_by)
    VALUES (NEW.phone, 'sem_interesse', NEW.agent_id)
    ON CONFLICT (phone) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_agibank_auto_blacklist
AFTER UPDATE OF status ON public.agibank_leads
FOR EACH ROW EXECUTE FUNCTION public.agibank_auto_blacklist();

CREATE OR REPLACE FUNCTION public.agibank_consume_credit(_lead_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lead public.agibank_leads%ROWTYPE;
  v_balance integer;
  v_uid uuid := auth.uid();
BEGIN
  SELECT * INTO v_lead FROM public.agibank_leads WHERE id = _lead_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'lead_not_found');
  END IF;

  IF public.has_role(v_uid, 'admin'::app_role)
     OR (v_lead.company_id IS NOT NULL AND public.is_company_gestor(v_uid, v_lead.company_id)) THEN
    RETURN jsonb_build_object('success', true, 'balance', NULL, 'free', true);
  END IF;

  IF v_lead.agent_id IS DISTINCT FROM v_uid THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF v_lead.first_opened_at IS NOT NULL THEN
    SELECT balance INTO v_balance FROM public.agibank_credits WHERE user_id = v_uid;
    RETURN jsonb_build_object('success', true, 'balance', COALESCE(v_balance, 0), 'free', true);
  END IF;

  INSERT INTO public.agibank_credits (user_id, balance) VALUES (v_uid, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.agibank_credits
  SET balance = balance - v_lead.credits_cost, updated_at = now()
  WHERE user_id = v_uid AND balance >= v_lead.credits_cost
  RETURNING balance INTO v_balance;

  IF v_balance IS NULL THEN
    SELECT balance INTO v_balance FROM public.agibank_credits WHERE user_id = v_uid;
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_credits', 'balance', COALESCE(v_balance, 0));
  END IF;

  UPDATE public.agibank_leads
  SET first_opened_at = now(),
      status = CASE WHEN status = 'novo' THEN 'em_andamento'::agibank_lead_status ELSE status END
  WHERE id = _lead_id;

  RETURN jsonb_build_object('success', true, 'balance', v_balance);
END $$;

CREATE OR REPLACE FUNCTION public.agibank_add_credits(_user_id uuid, _amount integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_balance integer;
  v_authorized boolean := false;
  v_target_company uuid;
BEGIN
  IF public.has_role(v_uid, 'admin'::app_role) THEN
    v_authorized := true;
  ELSE
    SELECT company_id INTO v_target_company
    FROM public.user_companies WHERE user_id = _user_id AND is_active = true LIMIT 1;
    IF v_target_company IS NOT NULL AND public.is_company_gestor(v_uid, v_target_company) THEN
      v_authorized := true;
    END IF;
  END IF;

  IF NOT v_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;
  IF _amount IS NULL OR _amount = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  INSERT INTO public.agibank_credits (user_id, balance) VALUES (_user_id, GREATEST(0, _amount))
  ON CONFLICT (user_id) DO UPDATE SET balance = GREATEST(0, agibank_credits.balance + _amount), updated_at = now()
  RETURNING balance INTO v_balance;

  RETURN jsonb_build_object('success', true, 'balance', v_balance);
END $$;

ALTER TABLE public.agibank_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agibank_lead_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agibank_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agibank_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agibank_leads_select" ON public.agibank_leads
FOR SELECT TO authenticated USING (
  agent_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (company_id IS NOT NULL AND is_company_gestor(auth.uid(), company_id))
);

CREATE POLICY "agibank_leads_update" ON public.agibank_leads
FOR UPDATE TO authenticated USING (
  agent_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (company_id IS NOT NULL AND is_company_gestor(auth.uid(), company_id))
);

CREATE POLICY "agibank_leads_insert" ON public.agibank_leads
FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (company_id IS NOT NULL AND is_company_gestor(auth.uid(), company_id))
);

CREATE POLICY "agibank_leads_delete" ON public.agibank_leads
FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "agibank_lists_select" ON public.agibank_lead_lists
FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (company_id IS NOT NULL AND is_company_gestor(auth.uid(), company_id))
);

CREATE POLICY "agibank_lists_insert" ON public.agibank_lead_lists
FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (company_id IS NOT NULL AND is_company_gestor(auth.uid(), company_id))
);

CREATE POLICY "agibank_blacklist_select" ON public.agibank_blacklist
FOR SELECT TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR is_tenant_gestor_or_above(auth.uid())
);

CREATE POLICY "agibank_blacklist_insert" ON public.agibank_blacklist
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "agibank_blacklist_delete" ON public.agibank_blacklist
FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "agibank_credits_select" ON public.agibank_credits
FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR is_tenant_gestor_or_above(auth.uid())
);
