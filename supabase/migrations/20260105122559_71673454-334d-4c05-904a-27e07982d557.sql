-- Criar função para normalizar CPF
CREATE OR REPLACE FUNCTION normalize_cpf(input_cpf TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_cpf IS NULL OR input_cpf = '' THEN
    RETURN input_cpf;
  END IF;
  -- Remove caracteres não numéricos e adiciona zeros à esquerda
  RETURN LPAD(REGEXP_REPLACE(input_cpf, '[^0-9]', '', 'g'), 11, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Criar trigger para normalizar CPF automaticamente em baseoff_clients
CREATE OR REPLACE FUNCTION normalize_cpf_on_insert_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.cpf IS NOT NULL AND NEW.cpf != '' THEN
    NEW.cpf := LPAD(REGEXP_REPLACE(NEW.cpf, '[^0-9]', '', 'g'), 11, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para baseoff_clients
DROP TRIGGER IF EXISTS normalize_cpf_baseoff_clients ON baseoff_clients;
CREATE TRIGGER normalize_cpf_baseoff_clients
  BEFORE INSERT OR UPDATE ON baseoff_clients
  FOR EACH ROW
  EXECUTE FUNCTION normalize_cpf_on_insert_update();

-- Trigger para baseoff_contracts
DROP TRIGGER IF EXISTS normalize_cpf_baseoff_contracts ON baseoff_contracts;
CREATE TRIGGER normalize_cpf_baseoff_contracts
  BEFORE INSERT OR UPDATE ON baseoff_contracts
  FOR EACH ROW
  EXECUTE FUNCTION normalize_cpf_on_insert_update();