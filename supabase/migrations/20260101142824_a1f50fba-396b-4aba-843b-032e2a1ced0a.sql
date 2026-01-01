-- Adicionar coluna saldo_devedor na tabela televendas
ALTER TABLE public.televendas 
ADD COLUMN saldo_devedor NUMERIC DEFAULT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.televendas.saldo_devedor IS 'Saldo devedor - usado apenas para operações de Portabilidade';