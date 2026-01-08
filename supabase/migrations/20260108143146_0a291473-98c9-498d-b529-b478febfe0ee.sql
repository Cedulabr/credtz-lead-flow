-- Tabela para registrar histórico de importações em todos os módulos
CREATE TABLE public.import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module VARCHAR(50) NOT NULL, -- 'activate_leads', 'leads_database', 'baseoff_clients'
  file_name VARCHAR(255) NOT NULL,
  total_records INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'completed', -- 'processing', 'completed', 'failed'
  error_details JSONB,
  imported_by UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para consultas frequentes
CREATE INDEX idx_import_logs_module ON public.import_logs(module);
CREATE INDEX idx_import_logs_imported_by ON public.import_logs(imported_by);
CREATE INDEX idx_import_logs_created_at ON public.import_logs(created_at DESC);
CREATE INDEX idx_import_logs_company_id ON public.import_logs(company_id);

-- Enable Row Level Security
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Admin pode ver todos os registros
CREATE POLICY "Admin pode ver todos os registros de importação" 
ON public.import_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Gestor pode ver registros da sua empresa
CREATE POLICY "Gestor pode ver registros de importação da empresa" 
ON public.import_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_companies uc ON uc.user_id = p.id
    WHERE p.id = auth.uid()
    AND p.role = 'partner'
    AND uc.company_id = public.import_logs.company_id
    AND uc.is_active = true
  )
);

-- Usuário pode ver seus próprios registros
CREATE POLICY "Usuário pode ver seus próprios registros de importação" 
ON public.import_logs 
FOR SELECT 
USING (auth.uid() = imported_by);

-- Qualquer usuário autenticado pode inserir registros
CREATE POLICY "Usuário autenticado pode inserir registro de importação" 
ON public.import_logs 
FOR INSERT 
WITH CHECK (auth.uid() = imported_by);

-- Comentário na tabela
COMMENT ON TABLE public.import_logs IS 'Registro de histórico de importações de leads e dados em todos os módulos';