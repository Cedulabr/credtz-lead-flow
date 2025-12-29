-- Add permission columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS can_access_indicar boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_meus_clientes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_televendas boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_gestao_televendas boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_documentos boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_tabela_comissoes boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_minhas_comissoes boolean DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.can_access_indicar IS 'Permission to access Indicar section';
COMMENT ON COLUMN public.profiles.can_access_meus_clientes IS 'Permission to access Meus Clientes section';
COMMENT ON COLUMN public.profiles.can_access_televendas IS 'Permission to access Televendas section';
COMMENT ON COLUMN public.profiles.can_access_gestao_televendas IS 'Permission to access Gestão de Televendas section';
COMMENT ON COLUMN public.profiles.can_access_documentos IS 'Permission to access Documentos section';
COMMENT ON COLUMN public.profiles.can_access_tabela_comissoes IS 'Permission to access Tabela de Comissões section';
COMMENT ON COLUMN public.profiles.can_access_minhas_comissoes IS 'Permission to access Minhas Comissões section';