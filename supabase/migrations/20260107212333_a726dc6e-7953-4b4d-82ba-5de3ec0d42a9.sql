-- Add company_id column to saved_proposals table
ALTER TABLE public.saved_proposals 
ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_saved_proposals_company_id ON public.saved_proposals(company_id);

-- Create a function to get user's primary company_id
CREATE OR REPLACE FUNCTION public.get_user_primary_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.user_companies
  WHERE user_id = _user_id AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1
$$;

-- Create trigger function to auto-set company_id on insert
CREATE OR REPLACE FUNCTION public.set_saved_proposal_company_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.get_user_primary_company_id(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_saved_proposal_company_id_trigger ON public.saved_proposals;
CREATE TRIGGER set_saved_proposal_company_id_trigger
  BEFORE INSERT ON public.saved_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.set_saved_proposal_company_id();

-- Update existing records to set company_id based on user's company
UPDATE public.saved_proposals sp
SET company_id = (
  SELECT company_id FROM public.user_companies uc 
  WHERE uc.user_id = sp.user_id AND uc.is_active = true 
  ORDER BY uc.created_at ASC LIMIT 1
)
WHERE sp.company_id IS NULL;