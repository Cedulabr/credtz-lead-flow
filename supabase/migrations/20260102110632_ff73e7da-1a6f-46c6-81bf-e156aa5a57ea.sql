-- Tabela para configurar bancos e seus prazos de reaproveitamento
CREATE TABLE public.bank_reuse_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_name TEXT NOT NULL UNIQUE,
    reuse_months INTEGER NOT NULL DEFAULT 6,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Tabela para alertas de reaproveitamento de clientes
CREATE TABLE public.client_reuse_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposta_id INTEGER NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
    televendas_id UUID REFERENCES public.televendas(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_cpf TEXT,
    client_phone TEXT,
    bank_name TEXT NOT NULL,
    payment_date DATE NOT NULL,
    reuse_months INTEGER NOT NULL,
    alert_date DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    gestor_id UUID REFERENCES auth.users(id),
    company_id UUID REFERENCES public.companies(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'converted', 'dismissed')),
    notified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_bank_reuse_settings_name ON public.bank_reuse_settings(bank_name);
CREATE INDEX idx_bank_reuse_settings_active ON public.bank_reuse_settings(is_active);
CREATE INDEX idx_client_reuse_alerts_date ON public.client_reuse_alerts(alert_date);
CREATE INDEX idx_client_reuse_alerts_user ON public.client_reuse_alerts(user_id);
CREATE INDEX idx_client_reuse_alerts_gestor ON public.client_reuse_alerts(gestor_id);
CREATE INDEX idx_client_reuse_alerts_status ON public.client_reuse_alerts(status);
CREATE INDEX idx_client_reuse_alerts_proposta ON public.client_reuse_alerts(proposta_id);

-- Enable RLS
ALTER TABLE public.bank_reuse_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_reuse_alerts ENABLE ROW LEVEL SECURITY;

-- Políticas para bank_reuse_settings (somente admin pode gerenciar)
CREATE POLICY "Admin can manage bank settings"
ON public.bank_reuse_settings
FOR ALL
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "All authenticated users can view bank settings"
ON public.bank_reuse_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Políticas para client_reuse_alerts
CREATE POLICY "Users can view their own alerts"
ON public.client_reuse_alerts
FOR SELECT
USING (
    user_id = auth.uid() OR
    gestor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admin and gestor can create alerts"
ON public.client_reuse_alerts
FOR INSERT
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM public.user_companies WHERE user_id = auth.uid() AND company_role = 'gestor' AND is_active = true)
);

CREATE POLICY "Admin and gestor can update alerts"
ON public.client_reuse_alerts
FOR UPDATE
USING (
    user_id = auth.uid() OR
    gestor_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_bank_reuse_settings_updated_at
BEFORE UPDATE ON public.bank_reuse_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_reuse_alerts_updated_at
BEFORE UPDATE ON public.client_reuse_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir bancos padrão com prazos comuns
INSERT INTO public.bank_reuse_settings (bank_name, reuse_months) VALUES
    ('Banrisul', 6),
    ('Daycoval', 6),
    ('C6', 12),
    ('Pan', 12),
    ('BMG', 6),
    ('Safra', 6),
    ('Itaú', 12),
    ('Bradesco', 12),
    ('Santander', 12),
    ('Caixa', 12)
ON CONFLICT (bank_name) DO NOTHING;