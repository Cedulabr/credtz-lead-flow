-- Adicionar novos campos para status de cliente, motivos de recusa e agendamentos
-- Primeiro, remover a constraint antiga do pipeline_stage se existir
ALTER TABLE public.propostas DROP CONSTRAINT IF EXISTS propostas_pipeline_stage_check;

-- Adicionar novos campos para o módulo reformulado
ALTER TABLE public.propostas
ADD COLUMN IF NOT EXISTS client_status TEXT DEFAULT 'cliente_intencionado',
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_offered_value NUMERIC,
ADD COLUMN IF NOT EXISTS rejection_description TEXT,
ADD COLUMN IF NOT EXISTS future_contact_date DATE,
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE;

-- Criar constraint para client_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'propostas_client_status_check'
    ) THEN
        ALTER TABLE public.propostas
        ADD CONSTRAINT propostas_client_status_check
        CHECK (client_status IN ('cliente_intencionado', 'proposta_enviada', 'proposta_recusada', 'contato_futuro'));
    END IF;
END$$;

-- Criar tabela de histórico de interações do cliente
CREATE TABLE IF NOT EXISTS public.client_interactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposta_id INTEGER NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    interaction_type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.client_interactions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para client_interactions
CREATE POLICY "Users can view interactions from their proposals"
ON public.client_interactions
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.propostas p
        WHERE p.id = client_interactions.proposta_id
        AND (
            p.created_by_id = auth.uid()
            OR p.assigned_to = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid() AND pr.role = 'admin'
            )
            OR EXISTS (
                SELECT 1 FROM public.user_companies uc
                WHERE uc.user_id = auth.uid()
                AND uc.company_id = p.company_id
                AND uc.company_role = 'gestor'
                AND uc.is_active = true
            )
        )
    )
);

CREATE POLICY "Users can create interactions for their proposals"
ON public.client_interactions
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.propostas p
        WHERE p.id = proposta_id
        AND (
            p.created_by_id = auth.uid()
            OR p.assigned_to = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid() AND pr.role = 'admin'
            )
            OR EXISTS (
                SELECT 1 FROM public.user_companies uc
                WHERE uc.user_id = auth.uid()
                AND uc.company_id = p.company_id
                AND uc.company_role = 'gestor'
                AND uc.is_active = true
            )
        )
    )
);

-- Criar tabela de notificações de contato futuro
CREATE TABLE IF NOT EXISTS public.contact_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposta_id INTEGER NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    gestor_id UUID,
    scheduled_date DATE NOT NULL,
    is_notified BOOLEAN DEFAULT false,
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.contact_notifications ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contact_notifications
CREATE POLICY "Users can view their notifications"
ON public.contact_notifications
FOR SELECT
USING (
    user_id = auth.uid()
    OR gestor_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
);

CREATE POLICY "Users can create notifications"
ON public.contact_notifications
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their notifications"
ON public.contact_notifications
FOR UPDATE
USING (
    user_id = auth.uid()
    OR gestor_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles pr
        WHERE pr.id = auth.uid() AND pr.role = 'admin'
    )
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_propostas_client_status ON public.propostas(client_status);
CREATE INDEX IF NOT EXISTS idx_propostas_future_contact_date ON public.propostas(future_contact_date);
CREATE INDEX IF NOT EXISTS idx_client_interactions_proposta_id ON public.client_interactions(proposta_id);
CREATE INDEX IF NOT EXISTS idx_contact_notifications_scheduled_date ON public.contact_notifications(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_contact_notifications_user_id ON public.contact_notifications(user_id);