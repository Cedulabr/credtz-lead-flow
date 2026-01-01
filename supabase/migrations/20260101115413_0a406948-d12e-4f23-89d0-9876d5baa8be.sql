-- Add finance access permission to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS can_access_financas BOOLEAN DEFAULT true;