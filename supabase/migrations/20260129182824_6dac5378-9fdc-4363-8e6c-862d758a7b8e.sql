-- Create client_deletion_requests table for the deletion approval workflow
CREATE TABLE public.client_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id integer NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  requested_at timestamptz DEFAULT now(),
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  review_notes text,
  company_id uuid REFERENCES public.companies(id),
  created_at timestamptz DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX idx_client_deletion_requests_status ON public.client_deletion_requests(status);
CREATE INDEX idx_client_deletion_requests_company ON public.client_deletion_requests(company_id);
CREATE INDEX idx_client_deletion_requests_proposta ON public.client_deletion_requests(proposta_id);

-- Enable RLS
ALTER TABLE public.client_deletion_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Colaboradores can create requests for their own clients
CREATE POLICY "Users can create deletion requests for their clients"
ON public.client_deletion_requests
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = requested_by
  AND EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = proposta_id AND p.created_by_id = auth.uid()
  )
);

-- Colaboradores can view their own requests
CREATE POLICY "Users can view their own deletion requests"
ON public.client_deletion_requests
FOR SELECT
TO authenticated
USING (
  requested_by = auth.uid()
  OR public.is_global_admin(auth.uid())
  OR public.is_company_gestor(auth.uid(), company_id)
);

-- Gestores and admins can update requests (approve/reject)
CREATE POLICY "Gestores and admins can update deletion requests"
ON public.client_deletion_requests
FOR UPDATE
TO authenticated
USING (
  public.is_global_admin(auth.uid())
  OR public.is_company_gestor(auth.uid(), company_id)
)
WITH CHECK (
  public.is_global_admin(auth.uid())
  OR public.is_company_gestor(auth.uid(), company_id)
);

-- Admins can delete requests
CREATE POLICY "Admins can delete deletion requests"
ON public.client_deletion_requests
FOR DELETE
TO authenticated
USING (
  public.is_global_admin(auth.uid())
);