-- Make the n8n webhook trigger non-blocking so Televendas inserts/updates never fail

CREATE OR REPLACE FUNCTION public.televendas_n8n_webhook_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM supabase_functions.http_request(
      'https://n8nwebhook.santosbr.com.br/webhook/n8ntelevendas',
      'POST',
      '{"Content-type":"application/json"}',
      '{}',
      5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- Do not block writes if the webhook is down/unreachable.
    RAISE LOG 'n8n webhook failed for televendas id %, error: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS n8ntelevendas ON public.televendas;

CREATE TRIGGER n8ntelevendas
AFTER INSERT OR UPDATE ON public.televendas
FOR EACH ROW
EXECUTE FUNCTION public.televendas_n8n_webhook_safe();
