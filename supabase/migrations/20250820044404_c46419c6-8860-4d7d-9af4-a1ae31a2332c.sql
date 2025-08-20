-- Update database for VPS deployment readiness
-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_indicados_created_by ON leads_indicados(created_by);
CREATE INDEX IF NOT EXISTS idx_leads_indicados_status ON leads_indicados(status);
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add invitations table for user management
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'partner',
    is_used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now() + interval '7 days',
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on invitations
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Policies for invitations
CREATE POLICY "Only admins can manage invitations" 
ON public.invitations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure all critical tables have proper constraints
ALTER TABLE leads_indicados ADD CONSTRAINT check_cpf_format CHECK (length(cpf) >= 11);
ALTER TABLE profiles ADD CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');