-- Update daily limit to 80 and add blacklist functionality
ALTER TABLE public.leads_semtelefone 
ADD COLUMN IF NOT EXISTS reserved_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reserved_by UUID;

-- Create daily usage tracking table
CREATE TABLE IF NOT EXISTS public.registrodiariobaseoff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  quantidade_leads INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, data_registro)
);

-- Enable RLS for the new table
ALTER TABLE public.registrodiariobaseoff ENABLE ROW LEVEL SECURITY;

-- Create policies for registrodiariobaseoff
CREATE POLICY "Users can view their own daily records" 
ON public.registrodiariobaseoff 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily records" 
ON public.registrodiariobaseoff 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily records" 
ON public.registrodiariobaseoff 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all daily records" 
ON public.registrodiariobaseoff 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update the baseoff daily limit check function
CREATE OR REPLACE FUNCTION public.check_baseoff_daily_limit(user_id_param uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  daily_limit integer := 80;
  today_usage integer;
BEGIN
  -- Get today's usage for the user
  SELECT COALESCE(quantidade_leads, 0) INTO today_usage
  FROM public.registrodiariobaseoff
  WHERE user_id = user_id_param
  AND data_registro = CURRENT_DATE;
  
  -- Return remaining leads available
  RETURN GREATEST(0, daily_limit - COALESCE(today_usage, 0));
END;
$function$;

-- Create function to update daily usage
CREATE OR REPLACE FUNCTION public.update_daily_baseoff_usage(user_id_param uuid, leads_count_param integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.registrodiariobaseoff (user_id, data_registro, quantidade_leads)
  VALUES (user_id_param, CURRENT_DATE, leads_count_param)
  ON CONFLICT (user_id, data_registro)
  DO UPDATE SET 
    quantidade_leads = registrodiariobaseoff.quantidade_leads + leads_count_param,
    updated_at = now();
END;
$function$;

-- Add trigger for automatic timestamp updates on registrodiariobaseoff
CREATE TRIGGER update_registrodiariobaseoff_updated_at
BEFORE UPDATE ON public.registrodiariobaseoff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();