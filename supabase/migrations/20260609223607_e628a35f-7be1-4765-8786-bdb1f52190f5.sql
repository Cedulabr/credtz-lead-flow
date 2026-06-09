-- Remove column if it exists to avoid PostgREST schema cache issues
ALTER TABLE public.leads_database DROP COLUMN IF EXISTS emprestimos;

-- Ensure batch_id exists and is correctly typed/linked
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads_database' AND column_name = 'batch_id') THEN
        ALTER TABLE public.leads_database ADD COLUMN batch_id UUID REFERENCES public.import_logs(id);
    END IF;
END $$;

-- Update permissions just in case
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads_database TO authenticated;
GRANT ALL ON public.leads_database TO service_role;

-- Re-enable RLS if it was somehow disabled or ensure it's on
ALTER TABLE public.leads_database ENABLE ROW LEVEL SECURITY;
