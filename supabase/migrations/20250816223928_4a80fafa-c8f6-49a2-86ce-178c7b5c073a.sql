-- Create table for managing allowed banks for BaseOFF
CREATE TABLE public.baseoff_allowed_banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_banco TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.baseoff_allowed_banks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view active allowed banks" 
ON public.baseoff_allowed_banks 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage allowed banks" 
ON public.baseoff_allowed_banks 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_baseoff_allowed_banks_updated_at
BEFORE UPDATE ON public.baseoff_allowed_banks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();