
-- 1. Fix propostas trigger to use aguardando_retorno
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
  END IF;

  -- Contato Futuro
  IF NEW.status = 'contato_futuro' AND NEW.future_contact_date IS NOT NULL THEN
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
  END IF;

  -- Final statuses -> finalize
  IF NEW.status IN ('cliente_recusado', 'proposta_recusada') THEN
    UPDATE public.sms_remarketing_queue
    SET automacao_ativa = false, automacao_status = 'finalizado', status_original = NEW.status, updated_at = now()
    WHERE source_module = 'meus_clientes' AND source_id = NEW.id::text;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Insert 5 message settings + scheduling settings
INSERT INTO public.sms_automation_settings (setting_key, setting_value)
VALUES
  ('msg_remarketing_dia_1', 'Olá {{nome}}, temos uma oferta especial para você! Fale conosco.'),
  ('msg_remarketing_dia_2', 'Oi {{nome}}, ainda temos condições especiais esperando por você!'),
  ('msg_remarketing_dia_3', '{{nome}}, sua oportunidade ainda está disponível. Não perca!'),
  ('msg_remarketing_dia_4', 'Olá {{nome}}, estamos à disposição para ajudar você. Entre em contato!'),
  ('msg_remarketing_dia_5', '{{nome}}, última chance! Aproveite nossas condições exclusivas.'),
  ('remarketing_modo_dias', 'todos'),
  ('remarketing_dias_semana', '1,2,3,4,5'),
  ('remarketing_horario_envio', '09:00')
ON CONFLICT (setting_key) DO NOTHING;
