-- Create storage bucket for contact attempt proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('contact-proofs', 'contact-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the bucket
CREATE POLICY "Users can upload their own proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contact-proofs' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their own proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contact-proofs' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Admins and gestors can view all proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'contact-proofs'
  AND EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND (p.role = 'admin' OR EXISTS (
      SELECT 1 FROM user_companies uc 
      WHERE uc.user_id = p.id 
      AND uc.company_role = 'gestor' 
      AND uc.is_active = true
    ))
  )
);

-- Create table for contact attempt proofs
CREATE TABLE IF NOT EXISTS public.activate_leads_contact_proofs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.activate_leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  proof_type TEXT NOT NULL CHECK (proof_type IN ('whatsapp', 'ligacao', 'mensagem', 'outro')),
  proof_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activate_leads_contact_proofs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for contact proofs table
CREATE POLICY "Users can view their own contact proofs"
ON public.activate_leads_contact_proofs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own contact proofs"
ON public.activate_leads_contact_proofs FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all contact proofs"
ON public.activate_leads_contact_proofs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
  )
);

CREATE POLICY "Gestors can view company contact proofs"
ON public.activate_leads_contact_proofs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_companies uc 
    WHERE uc.user_id = auth.uid() 
    AND uc.company_role = 'gestor' 
    AND uc.is_active = true
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contact_proofs_lead_id ON public.activate_leads_contact_proofs(lead_id);
CREATE INDEX IF NOT EXISTS idx_contact_proofs_user_id ON public.activate_leads_contact_proofs(user_id);

-- Add column to track second attempt status on leads
ALTER TABLE public.activate_leads 
ADD COLUMN IF NOT EXISTS segunda_tentativa BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS segunda_tentativa_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS segunda_tentativa_by UUID;