-- Add columns to televendas to link with leads and simulations
ALTER TABLE public.televendas
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS simulation_data JSONB,
ADD COLUMN IF NOT EXISTS simulation_file_url TEXT;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_televendas_lead_id ON public.televendas(lead_id);

-- Update RLS policy for televendas to allow inserting with lead_id
DROP POLICY IF EXISTS "Users can create their own televendas" ON public.televendas;
CREATE POLICY "Users can create their own televendas" ON public.televendas
FOR INSERT WITH CHECK (auth.uid() = user_id);