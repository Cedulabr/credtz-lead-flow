ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS abacatepay_id TEXT;
ALTER TABLE public.billing_events ADD COLUMN IF NOT EXISTS abacatepay_event_id TEXT;
ALTER TABLE public.billing_events ALTER COLUMN stripe_event_id DROP NOT NULL;
