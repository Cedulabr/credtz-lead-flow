CREATE TABLE public.leads_import_field_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  convenio TEXT NOT NULL,
  field_key TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (company_id, convenio, field_key)
);

CREATE INDEX idx_leads_import_field_config_company ON public.leads_import_field_config(company_id, convenio);

ALTER TABLE public.leads_import_field_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view import field config of their company"
ON public.leads_import_field_config
FOR SELECT
TO authenticated
USING (
  has_role_safe(auth.uid()::text, 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = leads_import_field_config.company_id
      AND uc.is_active = true
  )
);

CREATE POLICY "Admins and gestores can insert import field config"
ON public.leads_import_field_config
FOR INSERT
TO authenticated
WITH CHECK (
  has_role_safe(auth.uid()::text, 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = leads_import_field_config.company_id
      AND uc.company_role = 'gestor'
      AND uc.is_active = true
  )
);

CREATE POLICY "Admins and gestores can update import field config"
ON public.leads_import_field_config
FOR UPDATE
TO authenticated
USING (
  has_role_safe(auth.uid()::text, 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = leads_import_field_config.company_id
      AND uc.company_role = 'gestor'
      AND uc.is_active = true
  )
);

CREATE POLICY "Admins and gestores can delete import field config"
ON public.leads_import_field_config
FOR DELETE
TO authenticated
USING (
  has_role_safe(auth.uid()::text, 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = leads_import_field_config.company_id
      AND uc.company_role = 'gestor'
      AND uc.is_active = true
  )
);

CREATE TRIGGER update_leads_import_field_config_updated_at
BEFORE UPDATE ON public.leads_import_field_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();