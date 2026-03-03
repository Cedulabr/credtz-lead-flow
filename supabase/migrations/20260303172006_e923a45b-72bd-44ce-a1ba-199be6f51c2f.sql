ALTER TABLE public.sms_proposal_notifications 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();