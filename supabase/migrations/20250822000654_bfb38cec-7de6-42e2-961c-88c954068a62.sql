-- Create baseoff table for lead data
CREATE TABLE public.baseoff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cpf TEXT NOT NULL,
  nome TEXT NOT NULL,
  telefone1 TEXT,
  telefone2 TEXT,
  telefone3 TEXT,
  banco TEXT NOT NULL,
  valor_beneficio TEXT,
  uf TEXT,
  municipio TEXT,
  margem_disponivel TEXT
);

-- Enable RLS on baseoff
ALTER TABLE public.baseoff ENABLE ROW LEVEL SECURITY;

-- Create policies for baseoff access
CREATE POLICY "Admins can manage baseoff data" 
ON public.baseoff 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners can access baseoff data via functions" 
ON public.baseoff 
FOR SELECT 
USING (
  (current_setting('app.baseoff_access', true) = 'allowed')
  AND (has_role(auth.uid(), 'partner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Create baseoff_allowed_banks table
CREATE TABLE public.baseoff_allowed_banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo_banco TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on baseoff_allowed_banks
ALTER TABLE public.baseoff_allowed_banks ENABLE ROW LEVEL SECURITY;

-- Create policies for baseoff_allowed_banks
CREATE POLICY "Admins can manage allowed banks" 
ON public.baseoff_allowed_banks 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view active allowed banks" 
ON public.baseoff_allowed_banks 
FOR SELECT 
USING (is_active = true AND (auth.role() = 'authenticated'::text));

-- Create baseoff_requests table for tracking requests
CREATE TABLE public.baseoff_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  leads_count INTEGER NOT NULL DEFAULT 0,
  codigo_banco TEXT,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on baseoff_requests
ALTER TABLE public.baseoff_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for baseoff_requests
CREATE POLICY "Admins can view all baseoff requests" 
ON public.baseoff_requests 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create their own baseoff requests" 
ON public.baseoff_requests 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own baseoff requests" 
ON public.baseoff_requests 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create registrodiariobaseoff table for daily usage tracking
CREATE TABLE public.registrodiariobaseoff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade_leads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, data_registro)
);

-- Enable RLS on registrodiariobaseoff
ALTER TABLE public.registrodiariobaseoff ENABLE ROW LEVEL SECURITY;

-- Create policies for registrodiariobaseoff
CREATE POLICY "Admins can view all daily baseoff usage" 
ON public.registrodiariobaseoff 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own daily baseoff usage" 
ON public.registrodiariobaseoff 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create trigger for updated_at columns
CREATE TRIGGER update_baseoff_updated_at
BEFORE UPDATE ON public.baseoff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_baseoff_allowed_banks_updated_at
BEFORE UPDATE ON public.baseoff_allowed_banks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_registrodiariobaseoff_updated_at
BEFORE UPDATE ON public.registrodiariobaseoff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();