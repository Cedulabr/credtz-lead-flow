
-- Adicionar novos campos na tabela televendas
ALTER TABLE public.televendas 
  ADD COLUMN IF NOT EXISTS status_proposta text DEFAULT 'digitada',
  ADD COLUMN IF NOT EXISTS status_proposta_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_pendencia text,
  ADD COLUMN IF NOT EXISTS motivo_pendencia_descricao text,
  ADD COLUMN IF NOT EXISTS previsao_saldo date;

-- Criar tabela de histórico de status_proposta
CREATE TABLE IF NOT EXISTS public.televendas_status_proposta_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  televendas_id text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  reason text
);

-- Enable RLS
ALTER TABLE public.televendas_status_proposta_history ENABLE ROW LEVEL SECURITY;

-- Policies for status proposta history
CREATE POLICY "Users can view status proposta history"
  ON public.televendas_status_proposta_history
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert status proposta history"
  ON public.televendas_status_proposta_history
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Constraint para valores válidos de status_proposta
ALTER TABLE public.televendas 
  ADD CONSTRAINT televendas_status_proposta_check 
  CHECK (status_proposta IN ('digitada', 'aguardando_saldo', 'aguardando_aprovacao', 'aguardando_analise_credito', 'pendente', 'aprovada', 'cancelada'));
