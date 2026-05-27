CREATE TABLE public.agibank_lead_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  region TEXT,
  income_range TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agibank_lead_requests TO authenticated;
GRANT ALL ON public.agibank_lead_requests TO service_role;

ALTER TABLE public.agibank_lead_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own requests"
ON public.agibank_lead_requests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own requests"
ON public.agibank_lead_requests FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role_safe(auth.uid(), 'admin'));

CREATE POLICY "Admins update requests"
ON public.agibank_lead_requests FOR UPDATE TO authenticated
USING (public.has_role_safe(auth.uid(), 'admin'));

CREATE TRIGGER update_agibank_lead_requests_updated_at
BEFORE UPDATE ON public.agibank_lead_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_agibank_lead_requests_user ON public.agibank_lead_requests(user_id, created_at DESC);
CREATE INDEX idx_agibank_lead_requests_status ON public.agibank_lead_requests(status) WHERE status = 'pending';