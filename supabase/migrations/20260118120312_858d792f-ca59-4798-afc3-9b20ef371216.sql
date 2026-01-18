-- Criar tabela de configuração de inatividade de leads
CREATE TABLE IF NOT EXISTS public.lead_inactivity_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  inactivity_days INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  UNIQUE(company_id)
);

-- Criar tabela de notificações de inatividade para gestores
CREATE TABLE IF NOT EXISTS public.gestor_inactivity_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gestor_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT,
  user_email TEXT,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  last_lead_request TIMESTAMP WITH TIME ZONE,
  days_inactive INTEGER NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.lead_inactivity_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gestor_inactivity_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para lead_inactivity_settings (apenas admins podem gerenciar)
CREATE POLICY "Admins can manage inactivity settings"
ON public.lead_inactivity_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Políticas para gestor_inactivity_notifications
CREATE POLICY "Gestors can view their notifications"
ON public.gestor_inactivity_notifications
FOR SELECT
USING (gestor_id = auth.uid());

CREATE POLICY "Gestors can update their notifications"
ON public.gestor_inactivity_notifications
FOR UPDATE
USING (gestor_id = auth.uid());

CREATE POLICY "Admins can manage all inactivity notifications"
ON public.gestor_inactivity_notifications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Inserir configuração padrão (3 dias)
INSERT INTO public.lead_inactivity_settings (company_id, inactivity_days, is_active)
VALUES (NULL, 3, true)
ON CONFLICT DO NOTHING;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_gestor_inactivity_notifications_gestor ON public.gestor_inactivity_notifications(gestor_id);
CREATE INDEX IF NOT EXISTS idx_gestor_inactivity_notifications_user ON public.gestor_inactivity_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_gestor_inactivity_notifications_created ON public.gestor_inactivity_notifications(created_at DESC);

-- Função para verificar inatividade de usuários
CREATE OR REPLACE FUNCTION public.check_user_lead_inactivity()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  company_id UUID,
  gestor_id UUID,
  last_lead_request TIMESTAMP WITH TIME ZONE,
  days_inactive INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inactivity_days INTEGER;
BEGIN
  -- Buscar configuração de dias de inatividade
  SELECT COALESCE(
    (SELECT inactivity_days FROM lead_inactivity_settings WHERE is_active = true LIMIT 1),
    3
  ) INTO v_inactivity_days;

  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.name as user_name,
    p.email as user_email,
    uc.company_id,
    (
      SELECT uc2.user_id 
      FROM user_companies uc2 
      WHERE uc2.company_id = uc.company_id 
      AND uc2.company_role = 'gestor' 
      AND uc2.is_active = true 
      LIMIT 1
    ) as gestor_id,
    (
      SELECT MAX(l.requested_at) 
      FROM leads l 
      WHERE l.requested_by = p.id
    ) as last_lead_request,
    COALESCE(
      EXTRACT(DAY FROM now() - (SELECT MAX(l.requested_at) FROM leads l WHERE l.requested_by = p.id))::INTEGER,
      999
    ) as days_inactive
  FROM profiles p
  JOIN user_companies uc ON uc.user_id = p.id AND uc.is_active = true
  WHERE p.is_active = true
  AND p.role != 'admin'
  AND p.leads_premium_enabled = true
  AND uc.company_role = 'colaborador'
  AND (
    NOT EXISTS (SELECT 1 FROM leads l WHERE l.requested_by = p.id)
    OR (SELECT MAX(l.requested_at) FROM leads l WHERE l.requested_by = p.id) < now() - (v_inactivity_days || ' days')::INTERVAL
  );
END;
$$;