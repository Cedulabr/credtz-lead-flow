-- Create leads_database table for storing the main leads database
CREATE TABLE public.leads_database (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  name text NOT NULL,
  cpf text NOT NULL,
  phone text NOT NULL,
  tipo_beneficio text,
  banco text,
  parcela numeric,
  parcelas_em_aberto integer,
  parcelas_pagas integer,
  idade integer,
  data_nascimento date,
  convenio text NOT NULL,
  is_available boolean NOT NULL DEFAULT true
);

-- Create lead_requests table for tracking daily limits
CREATE TABLE public.lead_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  requested_at timestamp with time zone NOT NULL DEFAULT now(),
  convenio text,
  banco text,
  produto text,
  leads_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
);

-- Create daily_limits table for admin-configurable limits
CREATE TABLE public.daily_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  max_leads_per_day integer NOT NULL DEFAULT 30,
  created_by uuid
);

-- Insert default daily limit
INSERT INTO public.daily_limits (max_leads_per_day) VALUES (30);

-- Update leads table to include new status options
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'new_lead';

-- Add some sample data to leads_database
INSERT INTO public.leads_database (name, cpf, phone, tipo_beneficio, banco, parcela, parcelas_em_aberto, parcelas_pagas, idade, data_nascimento, convenio) VALUES
('Maria Santos Silva', '123.456.789-10', '(11) 98765-4321', 'Aposentadoria', 'C6', 450.00, 24, 12, 65, '1959-03-15', 'INSS'),
('João Ferreira Costa', '987.654.321-00', '(21) 99876-5432', 'Pensão', 'PAN', 680.00, 18, 6, 58, '1966-07-22', 'INSS'),
('Ana Oliveira Lima', '456.789.123-45', '(31) 97654-3210', 'Auxílio Doença', 'Itaú', 320.00, 30, 18, 45, '1979-11-08', 'INSS'),
('Carlos Eduardo Santos', '789.123.456-78', '(85) 96543-2109', 'Aposentadoria', 'Safra', 750.00, 12, 24, 62, '1962-01-30', 'SIAPE'),
('Lucia Aparecida Rocha', '321.654.987-12', '(62) 95432-1098', 'Pensão', 'BMG', 520.00, 20, 16, 55, '1969-09-14', 'SIAPE'),
('Roberto Silva Mendes', '654.987.321-33', '(48) 94321-0987', 'Aposentadoria', 'Santander', 890.00, 15, 21, 67, '1957-05-03', 'GOV BA'),
('Fernanda Costa Lima', '147.258.369-66', '(19) 93210-8765', 'Auxílio Doença', 'C6', 380.00, 28, 8, 42, '1982-12-19', 'INSS'),
('Pedro Henrique Silva', '258.369.147-99', '(27) 92109-7654', 'Pensão', 'PAN', 640.00, 22, 14, 60, '1964-04-11', 'SIAPE');

-- Enable RLS
ALTER TABLE public.leads_database ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_limits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for leads_database
CREATE POLICY "Everyone can view available leads" 
ON public.leads_database 
FOR SELECT 
USING (is_available = true);

CREATE POLICY "Admins can manage leads database" 
ON public.leads_database 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for lead_requests
CREATE POLICY "Users can create their own requests" 
ON public.lead_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests" 
ON public.lead_requests 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all requests" 
ON public.lead_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for daily_limits
CREATE POLICY "Everyone can view daily limits" 
ON public.daily_limits 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage daily limits" 
ON public.daily_limits 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to check daily limit
CREATE OR REPLACE FUNCTION public.check_daily_lead_limit(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  daily_limit integer;
  today_requests integer;
BEGIN
  -- Get current daily limit
  SELECT max_leads_per_day INTO daily_limit
  FROM public.daily_limits
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Count today's requests for the user
  SELECT COALESCE(SUM(leads_count), 0) INTO today_requests
  FROM public.lead_requests
  WHERE user_id = user_id_param
  AND DATE(requested_at) = CURRENT_DATE;
  
  -- Return remaining leads available
  RETURN GREATEST(0, daily_limit - today_requests);
END;
$$;

-- Create function to request leads
CREATE OR REPLACE FUNCTION public.request_leads(
  convenio_filter text DEFAULT NULL,
  banco_filter text DEFAULT NULL,
  produto_filter text DEFAULT NULL,
  leads_requested integer DEFAULT 10
)
RETURNS TABLE(
  lead_id uuid,
  name text,
  cpf text,
  phone text,
  convenio text,
  banco text,
  tipo_beneficio text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  remaining_limit integer;
  actual_leads_count integer;
BEGIN
  -- Check daily limit
  SELECT public.check_daily_lead_limit(auth.uid()) INTO remaining_limit;
  
  IF remaining_limit <= 0 THEN
    RAISE EXCEPTION 'Daily lead limit exceeded';
  END IF;
  
  -- Limit the requested amount to remaining limit
  actual_leads_count := LEAST(leads_requested, remaining_limit);
  
  -- Insert request record
  INSERT INTO public.lead_requests (user_id, convenio, banco, produto, leads_count)
  VALUES (auth.uid(), convenio_filter, banco_filter, produto_filter, actual_leads_count);
  
  -- Return leads matching filters
  RETURN QUERY
  SELECT 
    ld.id,
    ld.name,
    ld.cpf,
    ld.phone,
    ld.convenio,
    ld.banco,
    ld.tipo_beneficio
  FROM public.leads_database ld
  WHERE ld.is_available = true
    AND (convenio_filter IS NULL OR ld.convenio = convenio_filter)
    AND (banco_filter IS NULL OR ld.banco = banco_filter)
  ORDER BY RANDOM()
  LIMIT actual_leads_count;
  
  -- Mark selected leads as assigned (optional - depends on business logic)
  -- UPDATE public.leads_database 
  -- SET is_available = false 
  -- WHERE id IN (SELECT lead_id FROM returned_leads);
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_leads_database_updated_at
  BEFORE UPDATE ON public.leads_database
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_limits_updated_at
  BEFORE UPDATE ON public.daily_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();