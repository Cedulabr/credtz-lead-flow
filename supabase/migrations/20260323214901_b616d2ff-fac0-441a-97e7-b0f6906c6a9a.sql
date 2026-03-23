-- Drop 4-param overload (uses profiles.credits which doesn't exist)
DROP FUNCTION IF EXISTS public.request_leads_with_credits(text, text, text, integer);

-- Drop 5-param overload (uses profiles.credits which doesn't exist)
DROP FUNCTION IF EXISTS public.request_leads_with_credits(text, text, text, integer, text[]);