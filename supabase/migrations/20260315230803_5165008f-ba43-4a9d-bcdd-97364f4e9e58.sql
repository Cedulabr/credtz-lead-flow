ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_access_meu_numero BOOLEAN DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_access_autolead BOOLEAN DEFAULT true;