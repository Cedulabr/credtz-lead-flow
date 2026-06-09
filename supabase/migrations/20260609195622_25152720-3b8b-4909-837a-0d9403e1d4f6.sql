ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS ade TEXT,
ADD COLUMN IF NOT EXISTS parcelas_pagas INTEGER,
ADD COLUMN IF NOT EXISTS parcelas_em_aberto INTEGER,
ADD COLUMN IF NOT EXISTS parcela NUMERIC,
ADD COLUMN IF NOT EXISTS deferimento DATE,
ADD COLUMN IF NOT EXISTS ultimo_desconto DATE,
ADD COLUMN IF NOT EXISTS ultima_parcela DATE;

-- Grant permissions (if needed, although leads usually already has them)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
