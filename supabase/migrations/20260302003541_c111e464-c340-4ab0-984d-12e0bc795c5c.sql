
-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trg_sms_remarketing_propostas ON public.propostas;
DROP FUNCTION IF EXISTS public.sms_remarketing_enqueue_propostas();

-- Recreate function using client_status instead of status
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
  v_nome := NEW."Nome do cliente";
  v_telefone := COALESCE(NEW.telefone, NEW.whatsapp);

  IF v_nome IS NULL OR v_telefone IS NULL OR v_telefone = '' THEN
    RETURN NEW;
  END IF;

  -- Get configured days
  SELECT COALESCE(
    (SELECT setting_value::integer FROM public.sms_automation_settings WHERE setting_key = 'remarketing_dias'),
    5
  ) INTO v_dias;

  -- If client_status changed to a non-active status, finalize
  IF NEW.client_status IS DISTINCT FROM OLD.client_status
     AND NEW.client_status NOT IN ('aguardando_retorno', 'contato_futuro') THEN
    UPDATE public.sms_remarketing_queue
    SET automacao_ativa = false,
        automacao_status = 'finalizado',
        updated_at = now()
    WHERE source_module = 'meus_clientes'
      AND source_id = NEW.id::text
      AND automacao_status != 'finalizado';
    RETURN NEW;
  END IF;

  -- Enqueue for aguardando_retorno
  IF NEW.client_status = 'aguardando_retorno' THEN
    INSERT INTO public.sms_remarketing_queue (
      source_module, source_id, cliente_nome, cliente_telefone,
      status_original, queue_type, company_id, user_id, dias_envio_total
    ) VALUES (
      'meus_clientes', NEW.id::text, v_nome, v_telefone,
      NEW.client_status, 'remarketing', NEW.company_id, COALESCE(NEW.created_by_id, auth.uid()), v_dias
    )
    ON CONFLICT (source_module, source_id, queue_type) DO UPDATE
    SET cliente_nome = EXCLUDED.cliente_nome,
        cliente_telefone = EXCLUDED.cliente_telefone,
        status_original = EXCLUDED.status_original,
        automacao_ativa = true,
        automacao_status = 'ativo',
        updated_at = now();
  END IF;

  -- Enqueue for contato_futuro
  IF NEW.client_status = 'contato_futuro' AND NEW.future_contact_date IS NOT NULL THEN
    INSERT INTO public.sms_remarketing_queue (
      source_module, source_id, cliente_nome, cliente_telefone,
      status_original, queue_type, scheduled_date, company_id, user_id, dias_envio_total
    ) VALUES (
      'meus_clientes', NEW.id::text, v_nome, v_telefone,
      NEW.client_status, 'contato_futuro', NEW.future_contact_date, NEW.company_id, COALESCE(NEW.created_by_id, auth.uid()), 1
    )
    ON CONFLICT (source_module, source_id, queue_type) DO UPDATE
    SET cliente_nome = EXCLUDED.cliente_nome,
        cliente_telefone = EXCLUDED.cliente_telefone,
        status_original = EXCLUDED.status_original,
        scheduled_date = EXCLUDED.scheduled_date,
        automacao_ativa = true,
        automacao_status = 'ativo',
        updated_at = now();
  END IF;

  RETURN NEW;
END;
$function$;

-- Create trigger on client_status instead of status
CREATE TRIGGER trg_sms_remarketing_propostas
AFTER INSERT OR UPDATE OF client_status, pipeline_stage, future_contact_date
ON public.propostas
FOR EACH ROW
EXECUTE FUNCTION public.sms_remarketing_enqueue_propostas();
