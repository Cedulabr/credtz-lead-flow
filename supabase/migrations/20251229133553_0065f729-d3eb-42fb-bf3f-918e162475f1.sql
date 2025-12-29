-- ============================================
-- 1. Tabela de Documentos dos Clientes
-- ============================================
CREATE TABLE public.client_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_cpf TEXT NOT NULL,
    client_name TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('rg_frente', 'rg_verso', 'extrato_emprestimo')),
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para documentos
CREATE POLICY "Users can view their own uploaded documents"
ON public.client_documents
FOR SELECT
USING (auth.uid() = uploaded_by OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can upload documents"
ON public.client_documents
FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Admins can manage all documents"
ON public.client_documents
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 2. Adicionar campos ao propostas para Kanban
-- ============================================
ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS pipeline_stage TEXT DEFAULT 'contato_iniciado' 
    CHECK (pipeline_stage IN ('contato_iniciado', 'proposta_enviada', 'aceitou_proposta', 'recusou_proposta')),
ADD COLUMN IF NOT EXISTS origem_lead TEXT DEFAULT 'ativo'
    CHECK (origem_lead IN ('marketing', 'indicacao', 'ativo')),
ADD COLUMN IF NOT EXISTS valor_proposta NUMERIC,
ADD COLUMN IF NOT EXISTS assigned_to UUID,
ADD COLUMN IF NOT EXISTS telefone TEXT,
ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- ============================================
-- 3. Tabela de Histórico de Movimentações (Kanban Log)
-- ============================================
CREATE TABLE public.pipeline_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposta_id INTEGER NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    changed_by UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_history ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para histórico
CREATE POLICY "Users can view history of their proposals"
ON public.pipeline_history
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.propostas p 
        WHERE p.id = proposta_id 
        AND (p.created_by_id = auth.uid() OR p.assigned_to = auth.uid())
    )
    OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can add history entries"
ON public.pipeline_history
FOR INSERT
WITH CHECK (auth.uid() = changed_by);

CREATE POLICY "Admins can manage all history"
ON public.pipeline_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 4. Storage Bucket para documentos
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'client-documents', 
    'client-documents', 
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para documentos
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'client-documents' 
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can view documents they uploaded or are admin"
ON storage.objects
FOR SELECT
USING (
    bucket_id = 'client-documents'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR has_role(auth.uid(), 'admin'::app_role)
    )
);

CREATE POLICY "Admins can delete documents"
ON storage.objects
FOR DELETE
USING (
    bucket_id = 'client-documents'
    AND has_role(auth.uid(), 'admin'::app_role)
);

-- ============================================
-- 5. Trigger para log de mudanças de pipeline
-- ============================================
CREATE OR REPLACE FUNCTION public.log_pipeline_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
        INSERT INTO public.pipeline_history (proposta_id, from_stage, to_stage, changed_by)
        VALUES (NEW.id, OLD.pipeline_stage, NEW.pipeline_stage, auth.uid());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_log_pipeline_change
BEFORE UPDATE ON public.propostas
FOR EACH ROW
EXECUTE FUNCTION public.log_pipeline_change();

-- ============================================
-- 6. Índices para performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_propostas_pipeline_stage ON public.propostas(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_propostas_assigned_to ON public.propostas(assigned_to);
CREATE INDEX IF NOT EXISTS idx_propostas_origem_lead ON public.propostas(origem_lead);
CREATE INDEX IF NOT EXISTS idx_client_documents_cpf ON public.client_documents(client_cpf);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_proposta ON public.pipeline_history(proposta_id);