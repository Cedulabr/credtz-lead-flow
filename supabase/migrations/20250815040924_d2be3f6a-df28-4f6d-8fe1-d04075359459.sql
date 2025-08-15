-- Inserir produtos padrão na tabela banks_products se não existirem
INSERT INTO public.banks_products (bank_name, product_name, base_commission_percentage, term, is_active)
VALUES 
  ('Banco BRB', 'Novo', 3.5, '84x', true),
  ('Banco BRB', 'Refinanciamento', 3.2, '84x', true),
  ('Banco BRB', 'Portabilidade', 3.0, '84x', true),
  ('Banco BRB', 'Refinanciamento da Portabilidade', 3.8, '84x', true),
  ('Banco BRB', 'Cartão de Crédito', 2.5, '24x', true),
  ('Banco BRB', 'Saque Complementar', 3.0, '84x', true),
  ('Credtz Serviços', 'Novo', 3.3, '96x', true),
  ('Credtz Serviços', 'Refinanciamento', 3.0, '96x', true),
  ('Credtz Serviços', 'Portabilidade', 2.8, '96x', true),
  ('Happy', 'Novo', 3.7, '84x', true),
  ('Happy', 'Cartão de Crédito', 2.8, '24x', true),
  ('PicPay', 'Novo', 3.4, '84x', true),
  ('PicPay', 'Refinanciamento', 3.1, '84x', true),
  ('QualiBank', 'Novo', 3.6, '96x', true),
  ('QualiBank', 'Portabilidade', 2.9, '96x', true),
  ('Facta', 'Novo', 3.5, '84x', true),
  ('Facta', 'Refinanciamento', 3.2, '84x', true),
  ('Mercantil', 'Novo', 3.4, '96x', true),
  ('Mercantil', 'Saque Complementar', 3.1, '96x', true)
ON CONFLICT DO NOTHING;

-- Criar tabela para armazenar regras de comissão personalizadas (Tabela de Comissão)
CREATE TABLE IF NOT EXISTS public.commission_table (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name text NOT NULL,
  product_name text NOT NULL,
  commission_percentage numeric NOT NULL,
  user_percentage numeric NOT NULL,
  term text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.commission_table ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para commission_table
CREATE POLICY "Everyone can view active commission table"
ON public.commission_table
FOR SELECT
USING (is_active = true);

CREATE POLICY "Only admins can manage commission table"
ON public.commission_table
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_commission_table_updated_at
  BEFORE UPDATE ON public.commission_table
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir alguns exemplos na tabela de comissão
INSERT INTO public.commission_table (bank_name, product_name, commission_percentage, user_percentage, term, created_by)
VALUES 
  ('Banco BRB', 'Novo', 3.5, 2.8, '84x', (SELECT id FROM auth.users LIMIT 1)),
  ('Banco BRB', 'Refinanciamento', 3.2, 2.5, '84x', (SELECT id FROM auth.users LIMIT 1)),
  ('Credtz Serviços', 'Novo', 3.3, 2.6, '96x', (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT DO NOTHING;