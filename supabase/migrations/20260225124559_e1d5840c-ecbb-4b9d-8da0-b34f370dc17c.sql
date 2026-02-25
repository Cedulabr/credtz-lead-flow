
-- Correção 1: Atualizar trigger para desativar automação quando proposta é paga/cancelada
CREATE OR REPLACE FUNCTION public.sms_sync_televendas_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status IN ('proposta_paga', 'proposta_cancelada') THEN
      UPDATE public.sms_televendas_queue
      SET status_proposta = NEW.status,
          automacao_ativa = false,
          automacao_status = 'finalizado',
          updated_at = now()
      WHERE televendas_id = NEW.id;
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

-- Limpeza imediata: desativar entradas já pagas/canceladas que ainda estão ativas
UPDATE public.sms_televendas_queue
SET automacao_ativa = false,
    automacao_status = 'finalizado',
    updated_at = now()
WHERE status_proposta IN ('proposta_paga', 'proposta_cancelada')
  AND automacao_ativa = true;
