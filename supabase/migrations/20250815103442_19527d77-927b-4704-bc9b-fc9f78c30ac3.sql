-- Drop the commission_rules table as it's no longer needed
DROP TABLE public.commission_rules CASCADE;

-- Update commission_table to ensure it has all required fields for the new structure
-- Add any missing fields if they don't exist
ALTER TABLE public.commission_table 
ADD COLUMN IF NOT EXISTS user_percentage_profile text DEFAULT NULL;

-- Add a unique constraint to prevent duplicates based on bank_name, product_name, and term
-- This will allow for upsert functionality
CREATE UNIQUE INDEX IF NOT EXISTS unique_commission_entry 
ON public.commission_table (bank_name, product_name, COALESCE(term, ''));

-- Update the RLS policies to be more specific
DROP POLICY IF EXISTS "Everyone can view active commission table" ON public.commission_table;
DROP POLICY IF EXISTS "Only admins can manage commission table" ON public.commission_table;

-- Create new RLS policies
CREATE POLICY "Everyone can view active commission table" 
ON public.commission_table 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage commission table" 
ON public.commission_table 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));