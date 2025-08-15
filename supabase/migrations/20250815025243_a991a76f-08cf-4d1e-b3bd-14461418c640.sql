-- Criar tabela de comissões
CREATE TABLE public.commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_name text NOT NULL,
  product_type text NOT NULL,
  bank_name text NOT NULL,
  credit_value numeric NOT NULL,
  commission_amount numeric NOT NULL,
  commission_percentage numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  payment_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  proposal_date date,
  payment_method text
);

-- Habilitar RLS
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own commissions" 
ON public.commissions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own commissions" 
ON public.commissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all commissions" 
ON public.commissions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all commissions" 
ON public.commissions 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_commissions_updated_at
BEFORE UPDATE ON public.commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de bancos e produtos
CREATE TABLE public.banks_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name text NOT NULL,
  product_name text NOT NULL,
  term text, -- Prazo (84x, 96x)
  base_commission_percentage numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.banks_products ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Everyone can view active banks and products" 
ON public.banks_products 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Only admins can manage banks and products" 
ON public.banks_products 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_banks_products_updated_at
BEFORE UPDATE ON public.banks_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar tabela de configuração de comissões por usuário
CREATE TABLE public.user_commission_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  bank_product_id uuid NOT NULL REFERENCES public.banks_products(id),
  commission_percentage numeric NOT NULL, -- Repasse específico para o usuário
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, bank_product_id)
);

-- Habilitar RLS
ALTER TABLE public.user_commission_config ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own commission config" 
ON public.user_commission_config 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can manage commission config" 
ON public.user_commission_config 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_user_commission_config_updated_at
BEFORE UPDATE ON public.user_commission_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados de exemplo

-- Bancos e produtos
INSERT INTO public.banks_products (bank_name, product_name, term, base_commission_percentage) VALUES
-- Banco BRB
('Banco BRB', 'INSS - Novo', '84x', 3.5),
('Banco BRB', 'INSS - Refinanciamento', '84x', 3.0),
('Banco BRB', 'INSS - Portabilidade', '84x', 2.8),
('Banco BRB', 'INSS - Refinanciamento da Portabilidade', '84x', 2.5),
('Banco BRB', 'INSS - Cartão de Crédito', '84x', 4.0),
('Banco BRB', 'INSS - Saque Complementar', '84x', 3.2),
('Banco BRB', 'SIAPE - Novo', '96x', 3.8),
('Banco BRB', 'SIAPE - Refinanciamento', '96x', 3.3),
('Banco BRB', 'SIAPE - Portabilidade', '96x', 3.0),
('Banco BRB', 'SIAPE - Refinanciamento da Portabilidade', '96x', 2.7),
('Banco BRB', 'SIAPE - Cartão de Crédito', '96x', 4.2),
('Banco BRB', 'SIAPE - Saque Complementar', '96x', 3.5),

-- Credtz Serviços
('Credtz Serviços', 'Novo', '84x', 3.0),
('Credtz Serviços', 'Refinanciamento', '84x', 2.5),
('Credtz Serviços', 'Portabilidade', '84x', 2.2),
('Credtz Serviços', 'Refinanciamento da Portabilidade', '84x', 2.0),
('Credtz Serviços', 'Cartão de Crédito', '84x', 3.5),
('Credtz Serviços', 'Saque Complementar', '84x', 2.8),

-- Happy
('Happy', 'Novo', '84x', 3.2),
('Happy', 'Refinanciamento', '84x', 2.7),
('Happy', 'Portabilidade', '84x', 2.4),
('Happy', 'Refinanciamento da Portabilidade', '84x', 2.1),
('Happy', 'Cartão de Crédito', '84x', 3.7),
('Happy', 'Saque Complementar', '84x', 3.0),

-- PicPay
('PicPay', 'Novo', '84x', 2.8),
('PicPay', 'Refinanciamento', '84x', 2.3),
('PicPay', 'Portabilidade', '84x', 2.0),
('PicPay', 'Refinanciamento da Portabilidade', '84x', 1.8),
('PicPay', 'Cartão de Crédito', '84x', 3.3),
('PicPay', 'Saque Complementar', '84x', 2.6),

-- QualiBank
('QualiBank', 'Novo', '84x', 3.3),
('QualiBank', 'Refinanciamento', '84x', 2.8),
('QualiBank', 'Portabilidade', '84x', 2.5),
('QualiBank', 'Refinanciamento da Portabilidade', '84x', 2.2),
('QualiBank', 'Cartão de Crédito', '84x', 3.8),
('QualiBank', 'Saque Complementar', '84x', 3.1),

-- Facta
('Facta', 'Novo', '84x', 3.1),
('Facta', 'Refinanciamento', '84x', 2.6),
('Facta', 'Portabilidade', '84x', 2.3),
('Facta', 'Refinanciamento da Portabilidade', '84x', 2.0),
('Facta', 'Cartão de Crédito', '84x', 3.6),
('Facta', 'Saque Complementar', '84x', 2.9),

-- Mercantil
('Mercantil', 'Novo', '84x', 3.4),
('Mercantil', 'Refinanciamento', '84x', 2.9),
('Mercantil', 'Portabilidade', '84x', 2.6),
('Mercantil', 'Refinanciamento da Portabilidade', '84x', 2.3),
('Mercantil', 'Cartão de Crédito', '84x', 3.9),
('Mercantil', 'Saque Complementar', '84x', 3.2);

-- Inserir exemplos de comissões
INSERT INTO public.commissions (user_id, client_name, product_type, bank_name, credit_value, commission_amount, commission_percentage, status, payment_date, proposal_date, payment_method) VALUES
-- Assumindo que existe um usuário específico (substitua pelo UUID real)
((SELECT id FROM profiles LIMIT 1), 'Carlos Oliveira', 'INSS - Novo', 'Banco BRB', 25000.00, 875.00, 3.5, 'paid', '2024-01-15', '2024-01-05', 'PIX'),
((SELECT id FROM profiles LIMIT 1), 'Maria Silva', 'SIAPE - Refinanciamento', 'Banco BRB', 18000.00, 594.00, 3.3, 'pending', NULL, '2024-01-18', NULL),
((SELECT id FROM profiles LIMIT 1), 'João Santos', 'Novo', 'Credtz Serviços', 15000.00, 450.00, 3.0, 'approved', NULL, '2024-01-12', NULL),
((SELECT id FROM profiles LIMIT 1), 'Ana Costa', 'Cartão de Crédito', 'Happy', 8000.00, 296.00, 3.7, 'paid', '2024-01-10', '2024-01-02', 'PIX'),
((SELECT id FROM profiles LIMIT 1), 'Roberto Lima', 'Portabilidade', 'QualiBank', 22000.00, 550.00, 2.5, 'pending', NULL, '2024-01-20', NULL);