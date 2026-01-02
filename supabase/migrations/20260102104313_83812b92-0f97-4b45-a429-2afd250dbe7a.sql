-- Create activate_leads table
CREATE TABLE public.activate_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  origem TEXT NOT NULL DEFAULT 'importacao',
  produto TEXT,
  status TEXT NOT NULL DEFAULT 'novo',
  assigned_to UUID,
  company_id UUID REFERENCES public.companies(id),
  motivo_recusa TEXT,
  data_proxima_operacao DATE,
  ultima_interacao TIMESTAMP WITH TIME ZONE,
  proxima_acao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create activate_leads_history table for tracking all actions
CREATE TABLE public.activate_leads_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.activate_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activate_leads_notifications table for alerts
CREATE TABLE public.activate_leads_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.activate_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  gestor_id UUID,
  scheduled_date DATE NOT NULL,
  notification_type TEXT NOT NULL,
  is_notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activate_leads_distribution to track lead distribution
CREATE TABLE public.activate_leads_distribution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.activate_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  distributed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.activate_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activate_leads_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activate_leads_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activate_leads_distribution ENABLE ROW LEVEL SECURITY;

-- RLS policies for activate_leads
CREATE POLICY "Users can view leads assigned to them or unassigned" 
ON public.activate_leads FOR SELECT 
USING (auth.uid() = assigned_to OR assigned_to IS NULL OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users can update leads assigned to them" 
ON public.activate_leads FOR UPDATE 
USING (auth.uid() = assigned_to OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admin and gestor can insert leads" 
ON public.activate_leads FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR EXISTS (
    SELECT 1 FROM user_companies WHERE user_id = auth.uid() AND company_role = 'gestor'
  ))
) OR auth.uid() IS NOT NULL);

CREATE POLICY "Admin can delete leads" 
ON public.activate_leads FOR DELETE 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS policies for activate_leads_history
CREATE POLICY "Users can view history of their leads" 
ON public.activate_leads_history FOR SELECT 
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users can insert history" 
ON public.activate_leads_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS policies for activate_leads_notifications
CREATE POLICY "Users can view their notifications" 
ON public.activate_leads_notifications FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = gestor_id OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users can insert notifications" 
ON public.activate_leads_notifications FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" 
ON public.activate_leads_notifications FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = gestor_id);

-- RLS policies for activate_leads_distribution
CREATE POLICY "Users can view their distribution" 
ON public.activate_leads_distribution FOR SELECT 
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));

CREATE POLICY "System can insert distribution" 
ON public.activate_leads_distribution FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_activate_leads_assigned_to ON public.activate_leads(assigned_to);
CREATE INDEX idx_activate_leads_status ON public.activate_leads(status);
CREATE INDEX idx_activate_leads_origem ON public.activate_leads(origem);
CREATE INDEX idx_activate_leads_created_at ON public.activate_leads(created_at);
CREATE INDEX idx_activate_leads_history_lead_id ON public.activate_leads_history(lead_id);
CREATE INDEX idx_activate_leads_notifications_scheduled ON public.activate_leads_notifications(scheduled_date, is_notified);
CREATE INDEX idx_activate_leads_distribution_user ON public.activate_leads_distribution(user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_activate_leads_updated_at
BEFORE UPDATE ON public.activate_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();