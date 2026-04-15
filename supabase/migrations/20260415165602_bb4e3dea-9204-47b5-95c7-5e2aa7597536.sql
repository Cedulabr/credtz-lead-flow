-- Backfill existing documents with company_id
UPDATE client_documents cd
SET company_id = uc.company_id
FROM user_companies uc
WHERE cd.uploaded_by = uc.user_id
  AND uc.is_active = true
  AND cd.company_id IS NULL;

-- Create trigger function to auto-fill company_id on insert
CREATE OR REPLACE FUNCTION public.set_client_document_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.uploaded_by IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.user_companies
    WHERE user_id = NEW.uploaded_by AND is_active = true
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER trg_set_client_document_company_id
BEFORE INSERT ON public.client_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_client_document_company_id();