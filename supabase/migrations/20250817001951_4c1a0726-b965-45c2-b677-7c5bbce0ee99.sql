-- Verificar se a tabela baseoff existe e adicioná-la se necessário
CREATE TABLE IF NOT EXISTS public.baseoff (
  CPF text NOT NULL,
  Nome text,
  Telefone1 text,
  Telefone2 text,
  Telefone3 text,
  Banco text,
  Valor_Beneficio text,
  UF text,
  Municipio text,
  Margem_Disponivel text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela baseoff
ALTER TABLE public.baseoff ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura de dados
CREATE POLICY "Everyone can view baseoff data" 
ON public.baseoff 
FOR SELECT 
USING (true);