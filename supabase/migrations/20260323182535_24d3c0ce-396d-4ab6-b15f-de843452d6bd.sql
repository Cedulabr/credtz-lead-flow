ALTER TABLE public.televendas ADD COLUMN IF NOT EXISTS modulo_origem text DEFAULT 'televendas';
CREATE INDEX IF NOT EXISTS idx_televendas_modulo_origem ON public.televendas(modulo_origem);