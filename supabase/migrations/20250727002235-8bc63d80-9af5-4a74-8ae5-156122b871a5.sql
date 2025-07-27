-- Criar tabela de webhooks
CREATE TABLE public.webhooks (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by_id UUID REFERENCES auth.users(id),
    organization_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de avisos
CREATE TABLE public.announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by_id UUID REFERENCES auth.users(id),
    organization_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de comissões por produto
CREATE TABLE public.commission_rules (
    id SERIAL PRIMARY KEY,
    product_name TEXT NOT NULL,
    commission_percentage DECIMAL(5,2) NOT NULL,
    minimum_value DECIMAL(10,2) DEFAULT 50.00,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by_id UUID REFERENCES auth.users(id),
    organization_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de solicitações de saque
CREATE TABLE public.withdrawal_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    webhook_sent_at TIMESTAMP WITH TIME ZONE,
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by_id UUID REFERENCES auth.users(id),
    organization_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Políticas para webhooks (apenas admins)
CREATE POLICY "Only admins can manage webhooks" ON public.webhooks
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Políticas para avisos
CREATE POLICY "Everyone can view active announcements" ON public.announcements
FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage announcements" ON public.announcements
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Only admins can update announcements" ON public.announcements
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Políticas para regras de comissão
CREATE POLICY "Everyone can view commission rules" ON public.commission_rules
FOR SELECT USING (is_active = true);

CREATE POLICY "Only admins can manage commission rules" ON public.commission_rules
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Políticas para solicitações de saque
CREATE POLICY "Users can view their own withdrawal requests" ON public.withdrawal_requests
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawal requests" ON public.withdrawal_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawal requests" ON public.withdrawal_requests
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Admins can update withdrawal requests" ON public.withdrawal_requests
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Trigger para updated_at
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON public.webhooks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commission_rules_updated_at
    BEFORE UPDATE ON public.commission_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at
    BEFORE UPDATE ON public.withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir algumas regras de comissão padrão
INSERT INTO public.commission_rules (product_name, commission_percentage, description) VALUES
('Crédito Consignado', 3.00, 'Comissão padrão para crédito consignado'),
('Empréstimo Pessoal', 3.00, 'Comissão padrão para empréstimo pessoal'),
('Crédito Imobiliário', 2.00, 'Comissão padrão para crédito imobiliário'),
('Beneficiário INSS', 3.50, 'Comissão para beneficiários do INSS'),
('Crédito do trabalhador', 3.00, 'Comissão para crédito do trabalhador'),
('Saque FGTS', 2.50, 'Comissão para saque FGTS'),
('Bolsa Família', 3.00, 'Comissão para beneficiários do Bolsa Família'),
('Servidor Público', 3.50, 'Comissão para servidores públicos');