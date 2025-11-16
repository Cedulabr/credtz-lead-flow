-- Alterar a enum user_level para os novos valores
-- Primeiro, converter a coluna para text temporariamente
ALTER TABLE public.profiles 
  ALTER COLUMN level TYPE text;

-- Atualizar os valores existentes
UPDATE public.profiles 
SET level = CASE 
  WHEN level = 'junior' THEN 'bronze'
  WHEN level = 'pleno' THEN 'prata'
  WHEN level = 'senior' THEN 'ouro'
  ELSE level
END
WHERE level IS NOT NULL;

-- Remover a enum antiga
DROP TYPE IF EXISTS public.user_level;

-- Criar a nova enum com os novos valores
CREATE TYPE public.user_level AS ENUM ('bronze', 'prata', 'ouro', 'diamante');

-- Converter a coluna de volta para a nova enum
ALTER TABLE public.profiles 
  ALTER COLUMN level TYPE public.user_level 
  USING level::public.user_level;