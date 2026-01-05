-- Corrigir search_path das funções para segurança
CREATE OR REPLACE FUNCTION public.normalize_cpf(input_cpf TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_cpf IS NULL OR input_cpf = '' THEN
    RETURN input_cpf;
  END IF;
  RETURN LPAD(REGEXP_REPLACE(input_cpf, '[^0-9]', '', 'g'), 11, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.normalize_cpf_on_insert_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
    NEW.cpf := LPAD(REGEXP_REPLACE(NEW.cpf, '[^0-9]', '', 'g'), 11, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;