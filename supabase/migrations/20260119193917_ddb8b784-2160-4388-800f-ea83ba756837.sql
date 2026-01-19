-- Remove the faulty trigger from leads table (leads table doesn't have 'origem' field)
DROP TRIGGER IF EXISTS trigger_auto_scan_leads_duplicates ON public.leads;

-- Drop the function that references the non-existent field
DROP FUNCTION IF EXISTS public.auto_scan_leads_duplicates_after_import();