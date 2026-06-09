CREATE TABLE IF NOT EXISTS public.agibank_credit_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    amount INTEGER NOT NULL,
    performance_snapshot JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    admin_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agibank_credit_requests TO authenticated;
GRANT ALL ON public.agibank_credit_requests TO service_role;

ALTER TABLE public.agibank_credit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own credit requests" ON public.agibank_credit_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit requests" ON public.agibank_credit_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all credit requests" ON public.agibank_credit_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update credit requests" ON public.agibank_credit_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE OR REPLACE FUNCTION public.update_agibank_credit_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_agibank_credit_requests_updated_at
BEFORE UPDATE ON public.agibank_credit_requests
FOR EACH ROW EXECUTE FUNCTION public.update_agibank_credit_requests_updated_at();