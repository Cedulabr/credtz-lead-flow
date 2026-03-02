
-- Table to track user DIDs from BR DID API
CREATE TABLE public.user_dids (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  numero TEXT NOT NULL,
  cn INTEGER,
  area_local TEXT,
  codigo INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  sip_usuario TEXT,
  sip_senha TEXT,
  sip_dominio TEXT,
  sip_destino TEXT,
  whatsapp_configured BOOLEAN DEFAULT false,
  valor_mensal NUMERIC,
  valor_instalacao NUMERIC,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_dids ENABLE ROW LEVEL SECURITY;

-- Users can see their own DIDs
CREATE POLICY "Users can view their own DIDs"
ON public.user_dids FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own DIDs
CREATE POLICY "Users can insert their own DIDs"
ON public.user_dids FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own DIDs
CREATE POLICY "Users can update their own DIDs"
ON public.user_dids FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own DIDs
CREATE POLICY "Users can delete their own DIDs"
ON public.user_dids FOR DELETE
USING (auth.uid() = user_id);

-- Admins can see all DIDs
CREATE POLICY "Admins can view all DIDs"
ON public.user_dids FOR SELECT
USING (public.is_global_admin(auth.uid()));

-- Gestors can see company DIDs
CREATE POLICY "Gestors can view company DIDs"
ON public.user_dids FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
    AND uc.company_id = user_dids.company_id
    AND uc.company_role = 'gestor'
    AND uc.is_active = true
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_user_dids_updated_at
BEFORE UPDATE ON public.user_dids
FOR EACH ROW
EXECUTE FUNCTION public.update_company_updated_at();
