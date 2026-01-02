-- Create table to track BaseOff lead status and interactions
CREATE TABLE public.baseoff_lead_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cpf TEXT NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'Novo lead',
  future_contact_date DATE,
  offered_value NUMERIC,
  rejection_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cpf, user_id)
);

-- Enable RLS
ALTER TABLE public.baseoff_lead_tracking ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own tracking
CREATE POLICY "Users can view their own lead tracking"
ON public.baseoff_lead_tracking
FOR SELECT
USING (auth.uid() = user_id);

-- Policy for users to insert their own tracking
CREATE POLICY "Users can insert their own lead tracking"
ON public.baseoff_lead_tracking
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own tracking
CREATE POLICY "Users can update their own lead tracking"
ON public.baseoff_lead_tracking
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy for admins to see all
CREATE POLICY "Admins can view all lead tracking"
ON public.baseoff_lead_tracking
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create table for baseoff notifications (alerts)
CREATE TABLE public.baseoff_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id UUID REFERENCES public.baseoff_lead_tracking(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL,
  user_id UUID NOT NULL,
  gestor_id UUID,
  scheduled_date DATE NOT NULL,
  is_notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.baseoff_notifications ENABLE ROW LEVEL SECURITY;

-- Policy for users to see notifications for them
CREATE POLICY "Users can view their notifications"
ON public.baseoff_notifications
FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = gestor_id);

-- Policy for users to insert notifications
CREATE POLICY "Users can insert notifications"
ON public.baseoff_notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their notifications
CREATE POLICY "Users can update their notifications"
ON public.baseoff_notifications
FOR UPDATE
USING (auth.uid() = user_id OR auth.uid() = gestor_id);

-- Policy for admins
CREATE POLICY "Admins can view all notifications"
ON public.baseoff_notifications
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_baseoff_tracking_cpf_user ON public.baseoff_lead_tracking(cpf, user_id);
CREATE INDEX idx_baseoff_tracking_future_contact ON public.baseoff_lead_tracking(future_contact_date) WHERE future_contact_date IS NOT NULL;
CREATE INDEX idx_baseoff_notifications_scheduled ON public.baseoff_notifications(scheduled_date) WHERE is_notified = false;