ALTER TABLE public.sms_history ADD COLUMN IF NOT EXISTS error_code text;
ALTER TABLE public.sms_history ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE public.sms_history ADD COLUMN IF NOT EXISTS delivery_status text;