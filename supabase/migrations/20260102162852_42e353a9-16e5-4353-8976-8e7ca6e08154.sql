-- Adicionar campos de auditoria na tabela televendas
ALTER TABLE public.televendas 
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES auth.users(id);

-- Criar tabela de histórico de mudanças de status
CREATE TABLE IF NOT EXISTS public.televendas_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  televendas_id UUID NOT NULL REFERENCES public.televendas(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Habilitar RLS
ALTER TABLE public.televendas_status_history ENABLE ROW LEVEL SECURITY;

-- Políticas para a tabela de histórico
CREATE POLICY "Users can view status history" 
ON public.televendas_status_history 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Admin and gestor can insert status history" 
ON public.televendas_status_history 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_televendas_status_history_televendas_id 
ON public.televendas_status_history(televendas_id);

CREATE INDEX IF NOT EXISTS idx_televendas_status_history_changed_at 
ON public.televendas_status_history(changed_at DESC);