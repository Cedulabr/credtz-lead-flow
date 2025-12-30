-- Adicionar campo 'table_name' para distinguir diferentes tabelas de comissão para o mesmo produto
ALTER TABLE public.commission_table 
ADD COLUMN IF NOT EXISTS table_name text DEFAULT NULL;

-- Comentário para documentar o campo
COMMENT ON COLUMN public.commission_table.table_name IS 'Nome da tabela de comissão (ex: Tabela 1, Tabela Premium) para diferenciar múltiplas tabelas do mesmo produto';