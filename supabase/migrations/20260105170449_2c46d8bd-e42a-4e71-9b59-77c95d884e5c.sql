-- Create enum for person type
CREATE TYPE public.person_type AS ENUM ('pf', 'pj');

-- Create enum for document status
CREATE TYPE public.document_status AS ENUM ('pending', 'sent', 'approved', 'rejected');

-- Create enum for user data status
CREATE TYPE public.user_data_status AS ENUM ('incomplete', 'in_review', 'approved', 'rejected');

-- Create user_data table for extended profile information
CREATE TABLE public.user_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  person_type public.person_type NOT NULL DEFAULT 'pf',
  
  -- Common fields
  full_name TEXT,
  phone TEXT,
  personal_email TEXT,
  pix_key TEXT,
  pix_key_type TEXT,
  
  -- PF fields
  cpf TEXT,
  rg TEXT,
  birth_date DATE,
  marital_status TEXT,
  
  -- PJ fields
  cnpj TEXT,
  trade_name TEXT,
  legal_representative TEXT,
  legal_representative_cpf TEXT,
  
  -- Address
  cep TEXT,
  street TEXT,
  number TEXT,
  complement TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  
  -- Status
  status public.user_data_status NOT NULL DEFAULT 'incomplete',
  
  -- Internal observations (admin only)
  internal_observations TEXT,
  
  -- Audit
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_documents table
CREATE TABLE public.user_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  status public.document_status NOT NULL DEFAULT 'pending',
  
  -- Review
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_data_history table for audit
CREATE TABLE public.user_data_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_data_id UUID NOT NULL REFERENCES public.user_data(id) ON DELETE CASCADE,
  changed_by UUID,
  action TEXT NOT NULL,
  changes JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_data
CREATE POLICY "Users can view their own data"
  ON public.user_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data"
  ON public.user_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data"
  ON public.user_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all user data"
  ON public.user_data FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update any user data"
  ON public.user_data FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for user_documents
CREATE POLICY "Users can view their own documents"
  ON public.user_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
  ON public.user_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
  ON public.user_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
  ON public.user_documents FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all documents"
  ON public.user_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admin can update any document"
  ON public.user_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for user_data_history
CREATE POLICY "Users can view their own history"
  ON public.user_data_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_data 
      WHERE user_data.id = user_data_history.user_data_id 
      AND user_data.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can view all history"
  ON public.user_data_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert history"
  ON public.user_data_history FOR INSERT
  WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_user_data_updated_at
  BEFORE UPDATE ON public.user_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_documents_updated_at
  BEFORE UPDATE ON public.user_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_user_data_user_id ON public.user_data(user_id);
CREATE INDEX idx_user_data_status ON public.user_data(status);
CREATE INDEX idx_user_documents_user_id ON public.user_documents(user_id);
CREATE INDEX idx_user_documents_status ON public.user_documents(status);
CREATE INDEX idx_user_data_history_user_data_id ON public.user_data_history(user_data_id);

-- Create storage bucket for user documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-documents', 'user-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload their own documents storage"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents storage"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents storage"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'user-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admin can view all user documents storage"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-documents' AND
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );