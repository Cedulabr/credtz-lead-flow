-- Drop existing constraint and add new one with correct values
ALTER TABLE public.propostas DROP CONSTRAINT IF EXISTS propostas_origem_lead_check;

ALTER TABLE public.propostas 
ADD CONSTRAINT propostas_origem_lead_check 
CHECK (origem_lead = ANY (ARRAY['marketing'::text, 'indicacao'::text, 'ativo'::text, 'leads_premium'::text, 'activate_leads'::text]));