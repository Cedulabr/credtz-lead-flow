
-- Add banking status, sync tracking fields to televendas
ALTER TABLE public.televendas 
  ADD COLUMN IF NOT EXISTS status_bancario text DEFAULT 'aguardando_digitacao',
  ADD COLUMN IF NOT EXISTS last_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_by uuid;

-- Create index for banking status queries
CREATE INDEX IF NOT EXISTS idx_televendas_status_bancario ON public.televendas(status_bancario);

-- Create banking status history table for audit
CREATE TABLE IF NOT EXISTS public.televendas_status_bancario_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  televendas_id text NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  reason text
);

ALTER TABLE public.televendas_status_bancario_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view banking status history"
  ON public.televendas_status_bancario_history FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert banking status history"
  ON public.televendas_status_bancario_history FOR INSERT
  TO authenticated WITH CHECK (true);
