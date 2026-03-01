
-- Tabela para fila de notificações SMS pós-proposta
CREATE TABLE public.sms_proposal_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  televendas_id uuid REFERENCES public.televendas(id) ON DELETE SET NULL,
  cliente_nome text NOT NULL,
  cliente_telefone text NOT NULL,
  consultor_nome text NOT NULL,
  empresa_nome text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  sent_at timestamptz,
  company_id uuid REFERENCES public.companies(id),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.sms_proposal_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins veem tudo" ON public.sms_proposal_notifications
  FOR ALL USING (public.is_global_admin(auth.uid()));

CREATE POLICY "Usuarios veem da propria empresa" ON public.sms_proposal_notifications
  FOR SELECT USING (
    company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  );

CREATE POLICY "Usuarios inserem na propria empresa" ON public.sms_proposal_notifications
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );

-- Inserir configurações de automação
INSERT INTO public.sms_automation_settings (setting_key, setting_value, description)
VALUES 
  ('proposta_sms_ativa', 'true', 'Ativar/desativar SMS automático após criação de proposta'),
  ('msg_proposta_criada', 'INSS Informa: Confira a proposta que o consultor {{consultor}} Correspondente da {{empresa}}, tem uma proposta especial para voce, confira a proposta no seu whatsapp', 'Mensagem SMS enviada ao cliente após criação de proposta')
ON CONFLICT (setting_key) DO NOTHING;
