-- Tabela de logs para o webhook
CREATE TABLE IF NOT EXISTS public.abacatepay_webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT,
    event_type TEXT,
    payload JSONB,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    error TEXT,
    status TEXT DEFAULT 'success'
);

GRANT SELECT, INSERT ON public.abacatepay_webhook_logs TO authenticated;
GRANT ALL ON public.abacatepay_webhook_logs TO service_role;

-- Melhorias na tabela de leads para suporte a pagamentos PIX
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS abacatepay_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pix_amount NUMERIC;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS pix_paid_at TIMESTAMP WITH TIME ZONE;

-- Tabela de comissões de afiliados
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.leads(id),
    user_id UUID REFERENCES auth.users(id),
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, released, cancelled
    released_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    metadata JSONB
);

GRANT SELECT, INSERT, UPDATE ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own commissions" ON public.affiliate_commissions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all commissions" ON public.affiliate_commissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
