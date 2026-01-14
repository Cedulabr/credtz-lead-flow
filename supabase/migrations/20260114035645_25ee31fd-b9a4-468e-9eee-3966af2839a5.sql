-- Tabela de controle de jobs de importação para arquivos grandes
CREATE TABLE public.import_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_path TEXT, -- Caminho no Storage
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  module TEXT NOT NULL DEFAULT 'baseoff_clients', -- Módulo que está importando
  status TEXT NOT NULL DEFAULT 'uploaded', -- uploaded | processing | paused | completed | failed
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  current_chunk INTEGER DEFAULT 0, -- Chunk atual para retomada
  error_log JSONB DEFAULT '[]'::jsonb, -- Array de erros por linha
  metadata JSONB DEFAULT '{}'::jsonb, -- Dados adicionais (headers, config, etc)
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_import_jobs_user_id ON public.import_jobs(user_id);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_import_jobs_module ON public.import_jobs(module);
CREATE INDEX idx_import_jobs_created_at ON public.import_jobs(created_at DESC);

-- RLS Policies
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver apenas seus próprios jobs
CREATE POLICY "Users can view their own import jobs"
ON public.import_jobs FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem criar seus próprios jobs
CREATE POLICY "Users can create their own import jobs"
ON public.import_jobs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios jobs
CREATE POLICY "Users can update their own import jobs"
ON public.import_jobs FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_import_jobs_updated_at
BEFORE UPDATE ON public.import_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar bucket para arquivos de importação (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imports', 
  'imports', 
  false, 
  629145600, -- 600MB
  ARRAY['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 629145600,
  allowed_mime_types = ARRAY['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'];

-- RLS para o bucket de imports
CREATE POLICY "Users can upload import files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own import files"
ON storage.objects FOR SELECT
USING (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own import files"
ON storage.objects FOR DELETE
USING (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);