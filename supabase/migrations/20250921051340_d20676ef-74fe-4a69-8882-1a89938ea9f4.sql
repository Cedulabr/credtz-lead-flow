-- Create whitelabel_config table
CREATE TABLE public.whitelabel_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  logo_url TEXT,
  favicon_url TEXT,
  company_name TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whitelabel_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view whitelabel config" 
ON public.whitelabel_config 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage whitelabel config" 
ON public.whitelabel_config 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for timestamps
CREATE TRIGGER update_whitelabel_config_updated_at
BEFORE UPDATE ON public.whitelabel_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();