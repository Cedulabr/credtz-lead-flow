-- Adicionar novas colunas de permissão para módulos
-- Estas colunas controlam o acesso aos novos módulos do sistema

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS can_access_baseoff_consulta BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_relatorio_desempenho BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_access_colaborativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS can_access_controle_ponto BOOLEAN DEFAULT true;

-- Comentários para documentação
COMMENT ON COLUMN public.profiles.can_access_baseoff_consulta IS 'Permissão para acessar módulo Consulta Base OFF';
COMMENT ON COLUMN public.profiles.can_access_relatorio_desempenho IS 'Permissão para acessar módulo Relatório de Desempenho';
COMMENT ON COLUMN public.profiles.can_access_colaborativo IS 'Permissão para acessar módulo Colaborativo';
COMMENT ON COLUMN public.profiles.can_access_controle_ponto IS 'Permissão para acessar módulo Controle de Ponto';