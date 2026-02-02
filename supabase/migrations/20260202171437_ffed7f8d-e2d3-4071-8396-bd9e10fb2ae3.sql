-- Tabela para histórico de edições de televendas
CREATE TABLE public.televendas_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  televendas_id UUID NOT NULL REFERENCES public.televendas(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  original_data JSONB NOT NULL,
  new_data JSONB NOT NULL,
  fields_changed TEXT[] NOT NULL
);

-- Adicionar contador de edições na tabela televendas
ALTER TABLE public.televendas ADD COLUMN IF NOT EXISTS edit_count INTEGER DEFAULT 0;

-- Habilitar RLS
ALTER TABLE public.televendas_edit_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view edit history of their company proposals"
ON public.televendas_edit_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.televendas t
    WHERE t.id = televendas_id
    AND (
      t.user_id = auth.uid()
      OR public.is_global_admin(auth.uid())
      OR public.is_company_gestor(auth.uid(), t.company_id)
    )
  )
);

CREATE POLICY "Authenticated users can insert edit history"
ON public.televendas_edit_history
FOR INSERT
TO authenticated
WITH CHECK (edited_by = auth.uid());

-- Índices
CREATE INDEX idx_televendas_edit_history_televendas_id ON public.televendas_edit_history(televendas_id);
CREATE INDEX idx_televendas_edit_history_edited_at ON public.televendas_edit_history(edited_at DESC);