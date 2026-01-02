-- Add new fields for lead management automation
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS rejection_offered_value NUMERIC,
ADD COLUMN IF NOT EXISTS rejection_bank TEXT,
ADD COLUMN IF NOT EXISTS rejection_description TEXT,
ADD COLUMN IF NOT EXISTS future_contact_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_rework BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS rework_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS original_status TEXT,
ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create lead_alerts table for future contact automation
CREATE TABLE IF NOT EXISTS public.lead_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  alert_type TEXT NOT NULL, -- 'future_contact', 'rework'
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  executed BOOLEAN DEFAULT FALSE,
  executed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lead_alerts
ALTER TABLE public.lead_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for lead_alerts
CREATE POLICY "Users can view their own lead alerts" 
ON public.lead_alerts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead alerts" 
ON public.lead_alerts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead alerts" 
ON public.lead_alerts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead alerts" 
ON public.lead_alerts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_lead_alerts_scheduled ON public.lead_alerts(scheduled_date, executed);
CREATE INDEX IF NOT EXISTS idx_lead_alerts_user ON public.lead_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);

-- Function to process expired future contacts and return them as new leads
CREATE OR REPLACE FUNCTION public.process_expired_future_contacts()
RETURNS INTEGER AS $$
DECLARE
  processed_count INTEGER := 0;
  lead_record RECORD;
BEGIN
  -- Find all leads with expired future contact dates
  FOR lead_record IN 
    SELECT l.id, l.status, l.assigned_to
    FROM leads l
    WHERE l.status = 'contato_futuro' 
    AND l.future_contact_date <= NOW()
    AND l.future_contact_date IS NOT NULL
  LOOP
    -- Update lead to new_lead with rework flag
    UPDATE leads 
    SET 
      status = 'new_lead',
      original_status = lead_record.status,
      is_rework = TRUE,
      rework_date = NOW(),
      notes = COALESCE(notes || E'\n', '') || 'Lead em re-trabalho - Retorno automático em ' || to_char(NOW(), 'DD/MM/YYYY'),
      history = COALESCE(history, '[]'::jsonb) || jsonb_build_object(
        'action', 'auto_rework',
        'from_status', 'contato_futuro',
        'to_status', 'new_lead',
        'timestamp', NOW()::text,
        'note', 'Lead em re-trabalho'
      )
    WHERE id = lead_record.id;
    
    -- Mark the alert as executed
    UPDATE lead_alerts 
    SET executed = TRUE, executed_at = NOW()
    WHERE lead_id = lead_record.id AND alert_type = 'future_contact' AND executed = FALSE;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;