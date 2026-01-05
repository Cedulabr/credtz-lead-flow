-- Create enum for permission types
CREATE TYPE public.collaborative_permission_type AS ENUM ('view', 'edit', 'create', 'delete');

-- Create enum for access types
CREATE TYPE public.collaborative_access_type AS ENUM ('admin', 'operator', 'readonly');

-- Create enum for link categories
CREATE TYPE public.collaborative_link_category AS ENUM ('banco', 'governo', 'parceiros', 'marketing', 'ferramentas', 'outros');

-- 1. Acessos & Senhas (encrypted passwords)
CREATE TABLE public.collaborative_passwords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    system_name TEXT NOT NULL,
    access_url TEXT,
    login_user TEXT,
    encrypted_password TEXT NOT NULL,
    access_type collaborative_access_type DEFAULT 'operator',
    responsible_id UUID REFERENCES auth.users(id),
    observations TEXT,
    company_id UUID REFERENCES public.companies(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 2. Links Importantes
CREATE TABLE public.collaborative_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category collaborative_link_category DEFAULT 'outros',
    url TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    company_id UUID REFERENCES public.companies(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 3. Sistemas & Portais
CREATE TABLE public.collaborative_systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    purpose TEXT,
    main_url TEXT,
    environment TEXT DEFAULT 'production', -- production, staging, development
    integrations TEXT[],
    technical_notes TEXT,
    company_id UUID REFERENCES public.companies(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 4. Processos Internos
CREATE TABLE public.collaborative_processes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT, -- Rich text content
    attachments JSONB DEFAULT '[]',
    version INTEGER DEFAULT 1,
    company_id UUID REFERENCES public.companies(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 5. Documentação
CREATE TABLE public.collaborative_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT, -- pdf, xlsx, docx, etc
    description TEXT,
    category TEXT,
    company_id UUID REFERENCES public.companies(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- 6. Audit Log for collaborative module
CREATE TABLE public.collaborative_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL, -- view, edit, create, delete, view_password, copy_password
    user_id UUID REFERENCES auth.users(id),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Password history for tracking changes
CREATE TABLE public.collaborative_password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    password_id UUID REFERENCES public.collaborative_passwords(id) ON DELETE CASCADE,
    encrypted_password TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Comments for collaborative records
CREATE TABLE public.collaborative_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    content TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.collaborative_passwords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_password_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborative_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaborative_passwords
CREATE POLICY "Users can view passwords from their company" ON public.collaborative_passwords
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can insert passwords" ON public.collaborative_passwords
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update passwords" ON public.collaborative_passwords
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "Users can delete passwords" ON public.collaborative_passwords
    FOR DELETE TO authenticated
    USING (true);

-- RLS Policies for collaborative_links
CREATE POLICY "Users can view links" ON public.collaborative_links
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can insert links" ON public.collaborative_links
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update links" ON public.collaborative_links
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "Users can delete links" ON public.collaborative_links
    FOR DELETE TO authenticated
    USING (true);

-- RLS Policies for collaborative_systems
CREATE POLICY "Users can view systems" ON public.collaborative_systems
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can insert systems" ON public.collaborative_systems
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update systems" ON public.collaborative_systems
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "Users can delete systems" ON public.collaborative_systems
    FOR DELETE TO authenticated
    USING (true);

-- RLS Policies for collaborative_processes
CREATE POLICY "Users can view processes" ON public.collaborative_processes
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can insert processes" ON public.collaborative_processes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update processes" ON public.collaborative_processes
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "Users can delete processes" ON public.collaborative_processes
    FOR DELETE TO authenticated
    USING (true);

-- RLS Policies for collaborative_documents
CREATE POLICY "Users can view documents" ON public.collaborative_documents
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can insert documents" ON public.collaborative_documents
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update documents" ON public.collaborative_documents
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "Users can delete documents" ON public.collaborative_documents
    FOR DELETE TO authenticated
    USING (true);

-- RLS Policies for audit log
CREATE POLICY "Users can view audit logs" ON public.collaborative_audit_log
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can insert audit logs" ON public.collaborative_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for password history
CREATE POLICY "Users can view password history" ON public.collaborative_password_history
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can insert password history" ON public.collaborative_password_history
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = changed_by);

-- RLS Policies for comments
CREATE POLICY "Users can view comments" ON public.collaborative_comments
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can insert comments" ON public.collaborative_comments
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their comments" ON public.collaborative_comments
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their comments" ON public.collaborative_comments
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_collaborative_passwords_updated_at
    BEFORE UPDATE ON public.collaborative_passwords
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaborative_links_updated_at
    BEFORE UPDATE ON public.collaborative_links
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaborative_systems_updated_at
    BEFORE UPDATE ON public.collaborative_systems
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaborative_processes_updated_at
    BEFORE UPDATE ON public.collaborative_processes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaborative_documents_updated_at
    BEFORE UPDATE ON public.collaborative_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collaborative_comments_updated_at
    BEFORE UPDATE ON public.collaborative_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();