
-- =============================================
-- SMS Automation for Televendas - Full Migration
-- =============================================

-- 1. sms_televendas_queue table
CREATE TABLE public.sms_televendas_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  televendas_id uuid NOT NULL REFERENCES public.televendas(id) ON DELETE CASCADE,
  cliente_nome text NOT NULL,
  cliente_telefone text NOT NULL,
  tipo_operacao text NOT NULL,
  status_proposta text NOT NULL DEFAULT 'em_andamento',
  data_cadastro timestamptz NOT NULL DEFAULT now(),
  automacao_status text NOT NULL DEFAULT 'ativo',
  automacao_ativa boolean NOT NULL DEFAULT true,
  dias_envio_total integer NOT NULL DEFAULT 5,
  dias_enviados integer NOT NULL DEFAULT 0,
  ultimo_envio_at timestamptz,
  company_id uuid REFERENCES public.companies(id),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(televendas_id)
);

ALTER TABLE public.sms_televendas_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on sms_televendas_queue"
  ON public.sms_televendas_queue FOR ALL
  USING (public.is_global_admin(auth.uid()));

CREATE POLICY "Gestor company access on sms_televendas_queue"
  ON public.sms_televendas_queue FOR ALL
  USING (
    company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    AND public.is_gestor_or_admin(auth.uid())
  );

CREATE POLICY "Colaborador own access on sms_televendas_queue"
  ON public.sms_televendas_queue FOR SELECT
  USING (user_id = auth.uid());

-- 2. sms_automation_settings table
CREATE TABLE public.sms_automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  description text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on sms_automation_settings"
  ON public.sms_automation_settings FOR ALL
  USING (public.is_global_admin(auth.uid()));

CREATE POLICY "Gestor can read and update sms_automation_settings"
  ON public.sms_automation_settings FOR SELECT
  USING (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Gestor can update sms_automation_settings"
  ON public.sms_automation_settings FOR UPDATE
  USING (public.is_gestor_or_admin(auth.uid()));

-- Insert default settings
INSERT INTO public.sms_automation_settings (setting_key, setting_value, description) VALUES
  ('automacao_em_andamento_ativa', 'true', 'Ativar automação SMS para propostas em andamento'),
  ('automacao_em_andamento_dias', '5', 'Quantidade de dias de envio consecutivo'),
  ('automacao_em_andamento_intervalo_horas', '24', 'Intervalo entre envios em horas'),
  ('automacao_pago_ativa', 'true', 'Ativar notificação SMS para propostas pagas'),
  ('msg_em_andamento', 'Olá {{nome}}, sua proposta de {{tipo_operacao}} da Credtz está em andamento. Confirme sua operação para darmos continuidade.', 'Mensagem de automação para propostas em andamento'),
  ('msg_pago_novo_emprestimo', 'Olá {{nome}}, seu empréstimo foi aprovado e pago com sucesso. O valor já está disponível em sua conta. A Credtz agradece sua confiança.', 'Mensagem de notificação para propostas pagas');

-- 3. Add columns to sms_history
ALTER TABLE public.sms_history
  ADD COLUMN IF NOT EXISTS televendas_id uuid REFERENCES public.televendas(id),
  ADD COLUMN IF NOT EXISTS send_type text NOT NULL DEFAULT 'manual';

-- 4. Trigger: auto-insert into sms_televendas_queue on televendas insert
CREATE OR REPLACE FUNCTION public.sms_auto_enqueue_televendas()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_dias integer;
BEGIN
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

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sms_auto_enqueue_televendas
  AFTER INSERT ON public.televendas
  FOR EACH ROW
  EXECUTE FUNCTION public.sms_auto_enqueue_televendas();

-- 5. Trigger: sync status changes from televendas to queue
CREATE OR REPLACE FUNCTION public.sms_sync_televendas_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.sms_televendas_queue
    SET status_proposta = NEW.status, updated_at = now()
    WHERE televendas_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sms_sync_televendas_status
  AFTER UPDATE ON public.televendas
  FOR EACH ROW
  EXECUTE FUNCTION public.sms_sync_televendas_status();

-- 6. Updated_at trigger for queue
CREATE TRIGGER update_sms_televendas_queue_updated_at
  BEFORE UPDATE ON public.sms_televendas_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_company_updated_at();

-- 7. Index for automation queries
CREATE INDEX idx_sms_queue_automacao ON public.sms_televendas_queue (automacao_ativa, automacao_status, dias_enviados);
CREATE INDEX idx_sms_history_televendas ON public.sms_history (televendas_id) WHERE televendas_id IS NOT NULL;
