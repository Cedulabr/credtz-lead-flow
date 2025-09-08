-- Add permission fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN leads_premium_enabled boolean DEFAULT false,
ADD COLUMN sms_enabled boolean DEFAULT false,
ADD COLUMN whatsapp_enabled boolean DEFAULT false;