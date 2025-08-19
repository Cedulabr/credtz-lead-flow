-- SECURITY FIX: Set search_path for security functions to prevent SQL injection

-- Fix search_path for validation functions
CREATE OR REPLACE FUNCTION public.validate_cpf(cpf_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cpf text;
  sum_1 integer := 0;
  sum_2 integer := 0;
  digit_1 integer;
  digit_2 integer;
  i integer;
BEGIN
  -- Remove formatting
  cpf := regexp_replace(cpf_input, '[^0-9]', '', 'g');
  
  -- Check length and known invalid sequences
  IF length(cpf) != 11 OR 
     cpf IN ('00000000000', '11111111111', '22222222222', '33333333333', 
             '44444444444', '55555555555', '66666666666', '77777777777',
             '88888888888', '99999999999') THEN
    RETURN false;
  END IF;
  
  -- Calculate first verification digit
  FOR i IN 1..9 LOOP
    sum_1 := sum_1 + (substring(cpf, i, 1)::integer * (11 - i));
  END LOOP;
  
  digit_1 := 11 - (sum_1 % 11);
  IF digit_1 >= 10 THEN
    digit_1 := 0;
  END IF;
  
  -- Calculate second verification digit
  FOR i IN 1..10 LOOP
    sum_2 := sum_2 + (substring(cpf, i, 1)::integer * (12 - i));
  END LOOP;
  
  digit_2 := 11 - (sum_2 % 11);
  IF digit_2 >= 10 THEN
    digit_2 := 0;
  END IF;
  
  -- Verify digits
  RETURN digit_1 = substring(cpf, 10, 1)::integer AND 
         digit_2 = substring(cpf, 11, 1)::integer;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_email(email_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN email_input ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_phone(phone_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  phone text;
BEGIN
  -- Remove formatting
  phone := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  -- Check if it's a valid Brazilian phone number (10 or 11 digits)
  RETURN length(phone) IN (10, 11) AND phone ~ '^[0-9]+$';
END;
$$;