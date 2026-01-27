-- Fix the remove_leads_database_duplicates function to handle foreign key constraints
-- by deleting related records in leads_distribution first

CREATE OR REPLACE FUNCTION public.remove_leads_database_duplicates()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- First, delete leads_distribution records that reference duplicate leads
  -- We keep the distribution for the most recent lead (the one we're keeping)
  DELETE FROM public.leads_distribution
  WHERE lead_id IN (
    SELECT ld.id
    FROM public.leads_database ld
    WHERE EXISTS (
      SELECT 1 
      FROM public.leads_database ld2 
      WHERE ld2.name = ld.name 
        AND ld2.phone = ld.phone 
        AND COALESCE(ld2.convenio, '') = COALESCE(ld.convenio, '')
        AND ld2.id != ld.id 
        AND ld2.created_at > ld.created_at
    )
  );

  -- Now delete the duplicate leads (keeping the most recent one)
  WITH duplicates AS (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY name, phone, COALESCE(convenio, '')
             ORDER BY created_at DESC
           ) as rn
    FROM public.leads_database
    WHERE name IS NOT NULL AND phone IS NOT NULL
  )
  DELETE FROM public.leads_database
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the operation
  INSERT INTO public.audit_log (user_id, table_name, operation, record_id)
  VALUES (auth.uid(), 'leads_database', 'BULK_DELETE_DUPLICATES', gen_random_uuid());
  
  RETURN deleted_count;
END;
$$;