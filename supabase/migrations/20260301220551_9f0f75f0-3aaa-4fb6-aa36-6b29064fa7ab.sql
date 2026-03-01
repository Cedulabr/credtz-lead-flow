
-- ============================================
-- 1. Create sms_remarketing_queue table
-- ============================================
CREATE TABLE public.sms_remarketing_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_module text NOT NULL,
  source_id text NOT NULL,
  cliente_nome text NOT NULL,
  cliente_telefone text NOT NULL,
  status_original text,
  queue_type text NOT NULL DEFAULT 'remarketing',
  scheduled_date date,
  automacao_status text NOT NULL DEFAULT 'ativo',
  automacao_ativa boolean NOT NULL DEFAULT true,
  dias_envio_total integer NOT NULL DEFAULT 5,
  dias_enviados integer NOT NULL DEFAULT 0,
  ultimo_envio_at timestamptz,
  company_id uuid REFERENCES public.companies(id),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sms_remarketing_queue_source_unique UNIQUE (source_module, source_id, queue_type),
  CONSTRAINT sms_remarketing_queue_type_check CHECK (queue_type IN ('remarketing', 'contato_futuro')),
  CONSTRAINT sms_remarketing_queue_module_check CHECK (source_module IN ('leads_premium', 'activate_leads', 'meus_clientes'))
);

ALTER TABLE public.sms_remarketing_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all remarketing queue"
  ON public.sms_remarketing_queue FOR ALL
  USING (public.is_global_admin(auth.uid()));

CREATE POLICY "Gestores can view company remarketing queue"
  ON public.sms_remarketing_queue FOR SELECT
  USING (
    company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  );

CREATE INDEX idx_sms_remarketing_queue_active ON public.sms_remarketing_queue (automacao_ativa, automacao_status);
CREATE INDEX idx_sms_remarketing_queue_scheduled ON public.sms_remarketing_queue (queue_type, scheduled_date) WHERE queue_type = 'contato_futuro';

-- ============================================
-- 2. Trigger function for leads (Leads Premium)
-- ============================================
CREATE OR REPLACE FUNCTION public.sms_remarketing_enqueue_leads()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_dias integer;
BEGIN
  SELECT COALESCE(
    (SELECT setting_value::integer FROM public.sms_automation_settings WHERE setting_key = 'remarketing_dias'),
    5
  ) INTO v_dias;

  -- Remarketing: em_andamento
  IF NEW.status = 'em_andamento' THEN
    INSERT INTO public.sms_remarketing_queue (
      source_module, source_id, cliente_nome, cliente_telefone,
      status_original, queue_type, company_id, user_id, dias_envio_total
    ) VALUES (
      'leads_premium', NEW.id::text, NEW.name, NEW.phone,
      NEW.status, 'remarketing', NEW.company_id, COALESCE(NEW.assigned_to, NEW.requested_by, '00000000-0000-0000-0000-000000000000'::uuid), v_dias
    )
    ON CONFLICT (source_module, source_id, queue_type) DO UPDATE
    SET status_original = NEW.status, automacao_ativa = true, automacao_status = 'ativo', updated_at = now();
  END IF;

  -- Contato Futuro
  IF NEW.status = 'contato_futuro' AND NEW.future_contact_date IS NOT NULL THEN
    INSERT INTO public.sms_remarketing_queue (
      source_module, source_id, cliente_nome, cliente_telefone,
      status_original, queue_type, scheduled_date, company_id, user_id, dias_envio_total
    ) VALUES (
      'leads_premium', NEW.id::text, NEW.name, NEW.phone,
      NEW.status, 'contato_futuro', NEW.future_contact_date::date, NEW.company_id,
      COALESCE(NEW.assigned_to, NEW.requested_by, '00000000-0000-0000-0000-000000000000'::uuid), 1
    )
    ON CONFLICT (source_module, source_id, queue_type) DO UPDATE
    SET scheduled_date = NEW.future_contact_date::date, status_original = NEW.status,
        automacao_ativa = true, automacao_status = 'ativo', updated_at = now();
  END IF;

  -- Final statuses -> finalize
  IF NEW.status IN ('cliente_fechado', 'recusou_oferta', 'sem_interesse', 'nao_e_cliente') THEN
    UPDATE public.sms_remarketing_queue
    SET automacao_ativa = false, automacao_status = 'finalizado', status_original = NEW.status, updated_at = now()
    WHERE source_module = 'leads_premium' AND source_id = NEW.id::text;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sms_remarketing_leads
  AFTER INSERT OR UPDATE OF status, future_contact_date ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.sms_remarketing_enqueue_leads();

-- ============================================
-- 3. Trigger function for activate_leads
-- ============================================
CREATE OR REPLACE FUNCTION public.sms_remarketing_enqueue_activate_leads()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_dias integer;
BEGIN
  SELECT COALESCE(
    (SELECT setting_value::integer FROM public.sms_automation_settings WHERE setting_key = 'remarketing_dias'),
    5
  ) INTO v_dias;

  -- Remarketing: em_andamento
  IF NEW.status = 'em_andamento' THEN
    INSERT INTO public.sms_remarketing_queue (
      source_module, source_id, cliente_nome, cliente_telefone,
      status_original, queue_type, company_id, user_id, dias_envio_total
    ) VALUES (
      'activate_leads', NEW.id::text, NEW.nome, NEW.telefone,
      NEW.status, 'remarketing', NEW.company_id, COALESCE(NEW.assigned_to, NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid), v_dias
    )
    ON CONFLICT (source_module, source_id, queue_type) DO UPDATE
    SET status_original = NEW.status, automacao_ativa = true, automacao_status = 'ativo', updated_at = now();
  END IF;

  -- Contato Futuro
  IF NEW.status = 'contato_futuro' AND NEW.data_proxima_operacao IS NOT NULL THEN
    INSERT INTO public.sms_remarketing_queue (
      source_module, source_id, cliente_nome, cliente_telefone,
      status_original, queue_type, scheduled_date, company_id, user_id, dias_envio_total
    ) VALUES (
      'activate_leads', NEW.id::text, NEW.nome, NEW.telefone,
      NEW.status, 'contato_futuro', NEW.data_proxima_operacao::date, NEW.company_id,
      COALESCE(NEW.assigned_to, NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid), 1
    )
    ON CONFLICT (source_module, source_id, queue_type) DO UPDATE
    SET scheduled_date = NEW.data_proxima_operacao::date, status_original = NEW.status,
        automacao_ativa = true, automacao_status = 'ativo', updated_at = now();
  END IF;

  -- Final statuses
  IF NEW.status IN ('fechado', 'sem_interesse', 'nao_e_cliente', 'fora_do_perfil') THEN
    UPDATE public.sms_remarketing_queue
    SET automacao_ativa = false, automacao_status = 'finalizado', status_original = NEW.status, updated_at = now()
    WHERE source_module = 'activate_leads' AND source_id = NEW.id::text;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sms_remarketing_activate_leads
  AFTER INSERT OR UPDATE OF status, data_proxima_operacao ON public.activate_leads
  FOR EACH ROW EXECUTE FUNCTION public.sms_remarketing_enqueue_activate_leads();

-- ============================================
-- 4. Trigger function for propostas (Meus Clientes)
-- ============================================
CREATE OR REPLACE FUNCTION public.sms_remarketing_enqueue_propostas()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_dias integer;
  v_nome text;
  v_telefone text;
BEGIN
  SELECT COALESCE(
    (SELECT setting_value::integer FROM public.sms_automation_settings WHERE setting_key = 'remarketing_dias'),
    5
  ) INTO v_dias;

  v_nome := COALESCE(NEW."Nome do cliente", '');
  v_telefone := COALESCE(NEW.telefone, NEW.whatsapp, '');

  IF v_nome = '' OR v_telefone = '' THEN
    RETURN NEW;
  END IF;

  -- Contato Futuro
  IF NEW.status = 'contato_futuro' AND NEW.future_contact_date IS NOT NULL THEN
    INSERT INTO public.sms_remarketing_queue (
      source_module, source_id, cliente_nome, cliente_telefone,
      status_original, queue_type, scheduled_date, company_id, user_id, dias_envio_total
    ) VALUES (
      'meus_clientes', NEW.id::text, v_nome, v_telefone,
      NEW.status, 'contato_futuro', NEW.future_contact_date::date, NEW.company_id,
      COALESCE(NEW.created_by_id, '00000000-0000-0000-0000-000000000000'::uuid), 1
    )
    ON CONFLICT (source_module, source_id, queue_type) DO UPDATE
    SET scheduled_date = NEW.future_contact_date::date, status_original = NEW.status,
        automacao_ativa = true, automacao_status = 'ativo', updated_at = now();
  END IF;

  -- Remarketing: pipeline em andamento
  IF NEW.pipeline_stage IN ('proposta_enviada', 'proposta_digitada') THEN
    INSERT INTO public.sms_remarketing_queue (
      source_module, source_id, cliente_nome, cliente_telefone,
      status_original, queue_type, company_id, user_id, dias_envio_total
    ) VALUES (
      'meus_clientes', NEW.id::text, v_nome, v_telefone,
      COALESCE(NEW.pipeline_stage, NEW.status), 'remarketing', NEW.company_id,
      COALESCE(NEW.created_by_id, '00000000-0000-0000-0000-000000000000'::uuid), v_dias
    )
    ON CONFLICT (source_module, source_id, queue_type) DO UPDATE
    SET status_original = COALESCE(NEW.pipeline_stage, NEW.status), automacao_ativa = true, automacao_status = 'ativo', updated_at = now();
  END IF;

  -- Final statuses
  IF NEW.status IN ('proposta_paga', 'proposta_cancelada', 'exclusao_aprovada', 'recusou_oferta', 'sem_interesse') THEN
    UPDATE public.sms_remarketing_queue
    SET automacao_ativa = false, automacao_status = 'finalizado', status_original = NEW.status, updated_at = now()
    WHERE source_module = 'meus_clientes' AND source_id = NEW.id::text;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_sms_remarketing_propostas
  AFTER INSERT OR UPDATE OF status, pipeline_stage, future_contact_date ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.sms_remarketing_enqueue_propostas();

-- ============================================
-- 5. Insert initial automation settings
-- ============================================
INSERT INTO public.sms_automation_settings (setting_key, setting_value) VALUES
  ('remarketing_ativa', 'false'),
  ('remarketing_dias', '5'),
  ('remarketing_intervalo_horas', '24'),
  ('msg_remarketing', 'Olá {{nome}}, temos uma oferta especial para você! Entre em contato conosco.'),
  ('contato_futuro_ativa', 'false'),
  ('msg_contato_futuro', 'Olá {{nome}}, conforme combinado, temos uma proposta para você. Vamos conversar?')
ON CONFLICT DO NOTHING;
