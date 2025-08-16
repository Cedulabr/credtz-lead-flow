-- Add phone column to leads_semtelefone table
ALTER TABLE public.leads_semtelefone ADD COLUMN phone TEXT;

-- Add id column for better management
ALTER TABLE public.leads_semtelefone ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- Add management columns for BaseOFF leads
ALTER TABLE public.leads_semtelefone ADD COLUMN status TEXT DEFAULT 'novo_lead';
ALTER TABLE public.leads_semtelefone ADD COLUMN assigned_to UUID;
ALTER TABLE public.leads_semtelefone ADD COLUMN created_by UUID;
ALTER TABLE public.leads_semtelefone ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.leads_semtelefone ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.leads_semtelefone ADD COLUMN is_available BOOLEAN DEFAULT true;

-- Enable RLS
ALTER TABLE public.leads_semtelefone ENABLE ROW LEVEL SECURITY;

-- Create policies for leads_semtelefone
CREATE POLICY "Users can view available leads_semtelefone" 
ON public.leads_semtelefone 
FOR SELECT 
USING (is_available = true);

CREATE POLICY "Users can update leads_semtelefone" 
ON public.leads_semtelefone 
FOR UPDATE 
USING (true);

CREATE POLICY "Admins can manage leads_semtelefone" 
ON public.leads_semtelefone 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create table for BaseOFF lead requests
CREATE TABLE public.baseoff_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  leads_count INTEGER NOT NULL DEFAULT 0,
  codigo_banco TEXT,
  valor_parcela_min NUMERIC,
  valor_parcela_max NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable RLS for baseoff_requests
ALTER TABLE public.baseoff_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for baseoff_requests
CREATE POLICY "Users can create their own baseoff requests" 
ON public.baseoff_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own baseoff requests" 
ON public.baseoff_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all baseoff requests" 
ON public.baseoff_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to check BaseOFF daily limit
CREATE OR REPLACE FUNCTION public.check_baseoff_daily_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  daily_limit integer := 50;
  today_requests integer;
BEGIN
  -- Count today's requests for the user
  SELECT COALESCE(SUM(leads_count), 0) INTO today_requests
  FROM public.baseoff_requests
  WHERE user_id = user_id_param
  AND DATE(requested_at) = CURRENT_DATE;
  
  -- Return remaining leads available
  RETURN GREATEST(0, daily_limit - today_requests);
END;
$$;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_leads_semtelefone_updated_at
BEFORE UPDATE ON public.leads_semtelefone
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();