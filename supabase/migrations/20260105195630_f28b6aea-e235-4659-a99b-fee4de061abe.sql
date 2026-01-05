-- Create table for user data notifications
CREATE TABLE IF NOT EXISTS public.user_data_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  related_user_data_id UUID REFERENCES public.user_data(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_data_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.user_data_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.user_data_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin and Partner can insert notifications for any user
CREATE POLICY "Admin and Partner can insert notifications"
  ON public.user_data_notifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'partner')
    )
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_data_notifications_user_id ON public.user_data_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_data_notifications_unread ON public.user_data_notifications(user_id, is_read) WHERE is_read = false;

-- Add partner policies for user_data table
CREATE POLICY "Partner can view all user data"
  ON public.user_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'partner'
    )
  );

CREATE POLICY "Partner can update any user data"
  ON public.user_data FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'partner'
    )
  );

-- Add partner policies for user_documents table
CREATE POLICY "Partner can view all documents"
  ON public.user_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'partner'
    )
  );

CREATE POLICY "Partner can update any documents"
  ON public.user_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'partner'
    )
  );

-- Add partner policies for user_data_history
CREATE POLICY "Partner can view all history"
  ON public.user_data_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'partner'
    )
  );

CREATE POLICY "Partner can insert history"
  ON public.user_data_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'partner'
    )
  );