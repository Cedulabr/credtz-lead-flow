
-- ============================================
-- 1. Update sms_remarketing_enqueue_propostas (Meus Clientes)
-- Finalize when status leaves aguardando_retorno/contato_futuro
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
  v_tel text;
BEGIN
  SELECT COALESCE(
    (SELECT setting_value::integer FROM public.sms_automation_settings WHERE setting_key = 'remarketing_dias'),
    5
  ) INTO v_dias;

  v_nome := NEW."Nome do cliente";
  v_tel := COALESCE(NEW.telefone, NEW.whatsapp);

  IF v_nome IS NULL OR v_tel IS NULL THEN
    -- If status changed away from active statuses, still finalize
    IF OLD.status IS DISTINCT FROM NEW.status
       AND NEW.status NOT IN ('aguardando_retorno', 'contato_futuro') THEN
      UPDATE public.sms_remarketing_queue
      SET automacao_ativa = false, automacao_status = 'finalizado', status_original = NEW.status, updated_at = now()
      WHERE source_module = 'meus_clientes' AND source_id = NEW.id::text;
    END IF;
    RETURN NEW;
  END IF;

  -- Remarketing: aguardando_retorno
  IF NEW.status = 'aguardando_retorno' THEN
    INSERT INTO public.sms_remarketing_queue (
      source_module, source_id, cliente_nome, cliente_telefone,
      status_original, queue_type, company_id, user_id, dias_envio_total
    ) VALUES (
      'meus_clientes', NEW.id::text, v_nome, v_tel,
      NEW.status, 'remarketing', NEW.company_id,
      COALESCE(NEW.created_by_id, '00000000-0000-0000-0000-000000000000'::uuid), v_dias
    )
    ON CONFLICT (source_module, source_id, queue_type) DO UPDATE
    SET status_original = NEW.status, automacao_ativa = true, automacao_status = 'ativo', updated_at = now();

  -- Contato Futuro
  ELSIF NEW.status = 'contato_futuro' AND NEW.future_contact_date IS NOT NULL THEN
    INSERT INTO public.sms_remarketing_queue (
      source_module, source_id, cliente_nome, cliente_telefone,
      status_original, queue_type, scheduled_date, company_id, user_id, dias_envio_total
    ) VALUES (
      'meus_clientes', NEW.id::text, v_nome, v_tel,
      NEW.status, 'contato_futuro', NEW.future_contact_date::date, NEW.company_id,
      COALESCE(NEW.created_by_id, '00000000-0000-0000-0000-000000000000'::uuid), 1
    )
    ON CONFLICT (source_module, source_id, queue_type) DO UPDATE
    SET scheduled_date = NEW.future_contact_date::date, status_original = NEW.status,
        automacao_ativa = true, automacao_status = 'ativo', updated_at = now();

  -- ANY other status -> finalize all queues for this client
  ELSE
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      UPDATE public.sms_remarketing_queue
      SET automacao_ativa = false, automacao_status = 'finalizado', status_original = NEW.status, updated_at = now()
      WHERE source_module = 'meus_clientes' AND source_id = NEW.id::text;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================
-- 2. Update sms_remarketing_enqueue_leads (Leads Premium)
-- Finalize when status leaves em_andamento/contato_futuro
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
      NEW.status, 'remarketing', NEW.company_id,
      COALESCE(NEW.assigned_to, NEW.requested_by, '00000000-0000-0000-0000-000000000000'::uuid), v_dias
    )
    ON CONFLICT (source_module, source_id, queue_type) DO UPDATE
    SET status_original = NEW.status, automacao_ativa = true, automacao_status = 'ativo', updated_at = now();

  -- Contato Futuro
  ELSIF NEW.status = 'contato_futuro' AND NEW.future_contact_date IS NOT NULL THEN
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

  -- ANY other status -> finalize
  ELSE
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      UPDATE public.sms_remarketing_queue
      SET automacao_ativa = false, automacao_status = 'finalizado', status_original = NEW.status, updated_at = now()
      WHERE source_module = 'leads_premium' AND source_id = NEW.id::text;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================
-- 3. Update sms_remarketing_enqueue_activate_leads (Activate Leads)
-- Finalize when status leaves em_andamento/contato_futuro
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
      NEW.status, 'remarketing', NEW.company_id,
      COALESCE(NEW.assigned_to, NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid), v_dias
    )
    ON CONFLICT (source_module, source_id, queue_type) DO UPDATE
    SET status_original = NEW.status, automacao_ativa = true, automacao_status = 'ativo', updated_at = now();

  -- Contato Futuro
  ELSIF NEW.status = 'contato_futuro' AND NEW.data_proxima_operacao IS NOT NULL THEN
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

  -- ANY other status -> finalize
  ELSE
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      UPDATE public.sms_remarketing_queue
      SET automacao_ativa = false, automacao_status = 'finalizado', status_original = NEW.status, updated_at = now()
      WHERE source_module = 'activate_leads' AND source_id = NEW.id::text;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================
-- 4. Update sms_sync_televendas_status
-- Also cancel pending proposal notifications on final status
-- ============================================
CREATE OR REPLACE FUNCTION public.sms_sync_televendas_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('proposta_paga', 'proposta_cancelada') THEN
      -- Finalize televendas queue
      UPDATE public.sms_televendas_queue
      SET status_proposta = NEW.status,
          automacao_ativa = false,
          automacao_status = 'finalizado',
          updated_at = now()
      WHERE televendas_id = NEW.id;

      -- Cancel pending proposal notifications
      UPDATE public.sms_proposal_notifications
      SET sent = true, updated_at = now()
      WHERE televendas_id = NEW.id AND sent = false;
    ELSE
      UPDATE public.sms_televendas_queue
      SET status_proposta = NEW.status,
          updated_at = now()
      WHERE televendas_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
