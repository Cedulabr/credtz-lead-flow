-- Create leads_blacklist table that is referenced by request_leads function
CREATE TABLE IF NOT EXISTS public.leads_blacklist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf text NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '90 days'),
  created_by uuid REFERENCES auth.users(id)
);

-- Create unique index on cpf to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS leads_blacklist_cpf_unique ON public.leads_blacklist(cpf);

-- Enable RLS
ALTER TABLE public.leads_blacklist ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage blacklist" ON public.leads_blacklist
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view blacklist" ON public.leads_blacklist
  FOR SELECT USING (auth.role() = 'authenticated');