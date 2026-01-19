-- Create activate_leads_simulations table following the same structure as lead_simulations
CREATE TABLE public.activate_leads_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.activate_leads(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'solicitada' CHECK (status IN ('solicitada', 'em_andamento', 'enviada', 'recebida')),
  notes TEXT,
  produto TEXT,
  parcela NUMERIC,
  valor_liberado NUMERIC,
  banco TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create simulation_notifications for activate_leads
CREATE TABLE public.activate_leads_simulation_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES public.activate_leads(id) ON DELETE CASCADE,
  simulation_id UUID NOT NULL REFERENCES public.activate_leads_simulations(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('simulation_requested', 'simulation_completed', 'simulation_confirmed')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add simulation fields to activate_leads table
ALTER TABLE public.activate_leads
ADD COLUMN IF NOT EXISTS simulation_status TEXT,
ADD COLUMN IF NOT EXISTS simulation_id UUID REFERENCES public.activate_leads_simulations(id);

-- Enable RLS
ALTER TABLE public.activate_leads_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activate_leads_simulation_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for simulations
CREATE POLICY "Admins and gestors can manage simulations"
ON public.activate_leads_simulations
FOR ALL
USING (public.is_gestor_or_admin(auth.uid()));

CREATE POLICY "Users can view their own requested simulations"
ON public.activate_leads_simulations
FOR SELECT
USING (requested_by = auth.uid() OR public.is_gestor_or_admin(auth.uid()));

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.activate_leads_simulation_notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.activate_leads_simulation_notifications
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins and gestors can insert notifications"
ON public.activate_leads_simulation_notifications
FOR INSERT
WITH CHECK (public.is_gestor_or_admin(auth.uid()) OR user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_activate_leads_simulations_lead_id ON public.activate_leads_simulations(lead_id);
CREATE INDEX idx_activate_leads_simulations_status ON public.activate_leads_simulations(status);
CREATE INDEX idx_activate_leads_simulations_requested_by ON public.activate_leads_simulations(requested_by);
CREATE INDEX idx_activate_leads_simulation_notifications_user_id ON public.activate_leads_simulation_notifications(user_id);
CREATE INDEX idx_activate_leads_simulation_notifications_is_read ON public.activate_leads_simulation_notifications(is_read);

-- Update trigger for updated_at
CREATE TRIGGER update_activate_leads_simulations_updated_at
  BEFORE UPDATE ON public.activate_leads_simulations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();