-- Fix the unique constraint issue for commission_table upsert
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_table_unique 
ON public.commission_table (bank_name, product_name, COALESCE(term, ''));

-- Test the upsert functionality
INSERT INTO public.commission_table (
  bank_name, 
  product_name, 
  term, 
  commission_percentage, 
  user_percentage, 
  user_percentage_profile, 
  is_active
) VALUES (
  'BRB', 
  'Refinanciamento da Portabilidade', 
  '96x', 
  3.0, 
  2.50, 
  'Home office Senior', 
  true
) ON CONFLICT (bank_name, product_name, COALESCE(term, ''))
DO UPDATE SET 
  commission_percentage = EXCLUDED.commission_percentage,
  user_percentage = EXCLUDED.user_percentage,
  user_percentage_profile = EXCLUDED.user_percentage_profile,
  updated_at = now();