-- Fix RLS issues by enabling RLS on tables that don't have it
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Add policies for contratos table
CREATE POLICY "Users can view contratos" 
ON public.contratos 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage contratos" 
ON public.contratos 
FOR ALL 
USING (true);

-- Add policies for clientes table  
CREATE POLICY "Users can view clientes" 
ON public.clientes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage clientes" 
ON public.clientes 
FOR ALL 
USING (true);