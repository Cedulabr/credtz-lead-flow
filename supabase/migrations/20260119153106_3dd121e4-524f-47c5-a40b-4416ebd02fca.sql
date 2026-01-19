-- =====================================================
-- SIMULAÇÃO DE LEADS - Estrutura para fluxo de simulação
-- =====================================================

-- 1. Criar tabela para armazenar solicitações de simulação
CREATE TABLE public.lead_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Gestor que completou a simulação
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Arquivo da simulação (obrigatório quando concluída)
  simulation_file_url TEXT,
  simulation_file_name TEXT,
  
  -- Confirmação do usuário
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  
  -- Status do fluxo
  status TEXT NOT NULL DEFAULT 'solicitada' CHECK (status IN (
    'solicitada',
    'em_andamento',
    'concluida',
    'enviada',
    'recebida'
  )),
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Adicionar campos de simulação na tabela leads
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS simulation_status TEXT,
ADD COLUMN IF NOT EXISTS simulation_id UUID REFERENCES public.lead_simulations(id);

-- 3. Criar tabela para notificações de simulação
CREATE TABLE public.simulation_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES public.lead_simulations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'simulation_requested',
    'simulation_completed',
    'simulation_confirmed'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.lead_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_notifications ENABLE ROW LEVEL SECURITY;

-- 5. Função para verificar se é gestor (via user_companies)
CREATE OR REPLACE FUNCTION public.is_gestor_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_companies
    WHERE user_id = _user_id 
    AND company_role = 'gestor'
    AND is_active = true
  )
$$;

-- 6. Políticas para lead_simulations
CREATE POLICY "Users can view related simulations"
ON public.lead_simulations
FOR SELECT
USING (
  requested_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.leads 
    WHERE leads.id = lead_simulations.lead_id 
    AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
  ) OR
  public.is_gestor_or_admin(auth.uid())
);

CREATE POLICY "Users can create simulation requests"
ON public.lead_simulations
FOR INSERT
WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Gestors can update simulations"
ON public.lead_simulations
FOR UPDATE
USING (
  requested_by = auth.uid() OR
  public.is_gestor_or_admin(auth.uid())
);

-- 7. Políticas para simulation_notifications
CREATE POLICY "Users can view their sim notifications"
ON public.simulation_notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their sim notifications"
ON public.simulation_notifications
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "System can create sim notifications"
ON public.simulation_notifications
FOR INSERT
WITH CHECK (true);

-- 8. Índices para performance
CREATE INDEX idx_lead_simulations_lead_id ON public.lead_simulations(lead_id);
CREATE INDEX idx_lead_simulations_requested_by ON public.lead_simulations(requested_by);
CREATE INDEX idx_lead_simulations_status ON public.lead_simulations(status);
CREATE INDEX idx_simulation_notifications_user_id ON public.simulation_notifications(user_id);
CREATE INDEX idx_simulation_notifications_is_read ON public.simulation_notifications(is_read);
CREATE INDEX idx_leads_simulation_status ON public.leads(simulation_status);

-- 9. Trigger para atualizar updated_at
CREATE TRIGGER update_lead_simulations_updated_at
BEFORE UPDATE ON public.lead_simulations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Criar bucket para armazenar arquivos de simulação
INSERT INTO storage.buckets (id, name, public)
VALUES ('simulations', 'simulations', false)
ON CONFLICT (id) DO NOTHING;

-- 11. Políticas de storage para simulações
CREATE POLICY "Gestors can upload simulations"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'simulations' AND
  public.is_gestor_or_admin(auth.uid())
);

CREATE POLICY "Users can view simulation files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'simulations');