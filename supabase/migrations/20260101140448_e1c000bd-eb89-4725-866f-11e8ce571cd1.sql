-- Create televendas_banks table
CREATE TABLE public.televendas_banks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  code text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.televendas_banks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage televendas_banks"
ON public.televendas_banks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view active televendas_banks"
ON public.televendas_banks
FOR SELECT
USING (is_active = true AND auth.role() = 'authenticated');

-- Trigger for updated_at
CREATE TRIGGER update_televendas_banks_updated_at
BEFORE UPDATE ON public.televendas_banks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();