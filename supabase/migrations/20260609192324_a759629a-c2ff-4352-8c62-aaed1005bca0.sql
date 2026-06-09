ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS matricula TEXT,
ADD COLUMN IF NOT EXISTS margem_total NUMERIC,
ADD COLUMN IF NOT EXISTS emprestimos JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.leads.emprestimos IS 'Stores a list of loan objects: {banco: string, parcela: number, parcelas_pagas: number}';