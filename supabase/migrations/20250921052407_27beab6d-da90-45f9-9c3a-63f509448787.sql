-- First, drop the constraint that failed and fix whitelabel_config table
ALTER TABLE public.whitelabel_config DROP CONSTRAINT IF EXISTS whitelabel_config_single_row;

-- Keep only one record (the latest one) and delete others
DELETE FROM public.whitelabel_config WHERE id NOT IN (
  SELECT id FROM public.whitelabel_config ORDER BY created_at DESC LIMIT 1
);

-- Add user session restrictions to profiles table if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS can_access_whatsapp BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_sms BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_premium_leads BOOLEAN DEFAULT true;