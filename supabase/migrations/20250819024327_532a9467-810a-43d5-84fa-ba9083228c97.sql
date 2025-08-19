-- Create leads_indicados table for storing client indications
CREATE TABLE public.leads_indicados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cpf TEXT NOT NULL,
  telefone TEXT NOT NULL,
  convenio TEXT NOT NULL,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'lead_digitado',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads_indicados ENABLE ROW LEVEL SECURITY;

-- Create policies for leads_indicados
CREATE POLICY "Users can view their own indicated leads" 
ON public.leads_indicados 
FOR SELECT 
USING (auth.uid() = created_by);

CREATE POLICY "Users can create indicated leads" 
ON public.leads_indicados 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own indicated leads" 
ON public.leads_indicados 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Admins can view all indicated leads" 
ON public.leads_indicados 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all indicated leads" 
ON public.leads_indicados 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_leads_indicados_updated_at
BEFORE UPDATE ON public.leads_indicados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();