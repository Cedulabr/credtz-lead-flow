ALTER TABLE public.leads_database ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES public.import_logs(id);
CREATE INDEX IF NOT EXISTS idx_leads_database_batch_id ON public.leads_database(batch_id);
GRANT ALL ON public.leads_database TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads_database TO authenticated;