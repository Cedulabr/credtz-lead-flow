-- Simplificar a tabela clients para manter apenas os campos necessários
-- Primeiro, vamos garantir que os campos obrigatórios não sejam nullable
ALTER TABLE public.clients 
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN cpf SET NOT NULL,
  ALTER COLUMN phone SET NOT NULL;

-- Renomear o campo company para convenio para melhor semântica
ALTER TABLE public.clients 
  RENAME COLUMN company TO convenio;

-- Opcional: Remover campos não utilizados se desejar limpar a tabela
-- ALTER TABLE public.clients DROP COLUMN IF EXISTS email;
-- ALTER TABLE public.clients DROP COLUMN IF EXISTS birth_date;
-- ALTER TABLE public.clients DROP COLUMN IF EXISTS user_id;