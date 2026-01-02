-- Adicionar novas colunas de permissões para os novos módulos
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS can_access_gerador_propostas BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_activate_leads BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_alertas BOOLEAN DEFAULT true;