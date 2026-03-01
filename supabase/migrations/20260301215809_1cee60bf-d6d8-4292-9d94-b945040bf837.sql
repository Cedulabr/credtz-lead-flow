
CREATE OR REPLACE FUNCTION public.sms_auto_enqueue_televendas()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_dias integer;
BEGIN
  -- Only enqueue portabilidade proposals
  IF NEW.tipo_operacao ILIKE '%portabilidade%' THEN
    -- Get configured days
    SELECT COALESCE(
      (SELECT setting_value::integer FROM public.sms_automation_settings WHERE setting_key = 'automacao_em_andamento_dias'),
      5
    ) INTO v_dias;

    INSERT INTO public.sms_televendas_queue (
      televendas_id, cliente_nome, cliente_telefone, tipo_operacao,
      status_proposta, company_id, user_id, dias_envio_total
    ) VALUES (
      NEW.id, NEW.nome, NEW.telefone, NEW.tipo_operacao,
      NEW.status, NEW.company_id, NEW.user_id, v_dias
    )
    ON CONFLICT (televendas_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;
