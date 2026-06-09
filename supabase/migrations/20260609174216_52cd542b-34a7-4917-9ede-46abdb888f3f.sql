ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS agibank_account_type TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS agibank_link_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS agibank_products TEXT;

ALTER TABLE public.leads_database ADD COLUMN IF NOT EXISTS agibank_account_type TEXT;
ALTER TABLE public.leads_database ADD COLUMN IF NOT EXISTS agibank_link_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leads_database ADD COLUMN IF NOT EXISTS agibank_products TEXT;