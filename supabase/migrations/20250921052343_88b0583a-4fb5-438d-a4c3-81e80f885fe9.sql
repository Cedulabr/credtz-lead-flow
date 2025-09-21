-- Fix whitelabel_config table to have only one configuration record
-- Delete all existing records and create a single default record
DELETE FROM public.whitelabel_config;

-- Add unique constraint to ensure only one configuration exists
ALTER TABLE public.whitelabel_config 
ADD CONSTRAINT whitelabel_config_single_row CHECK (id = gen_random_uuid());

-- Insert a single default configuration
INSERT INTO public.whitelabel_config (logo_url, favicon_url, company_name, primary_color, secondary_color)
VALUES (null, null, 'Credtz', '#0066cc', '#00cc66');

-- Add user session restrictions to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS can_access_whatsapp BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_sms BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_premium_leads BOOLEAN DEFAULT true;