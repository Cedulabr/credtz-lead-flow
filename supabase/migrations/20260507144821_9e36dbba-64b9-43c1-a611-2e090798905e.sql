
-- Enum tipo de ajuste
DO $$ BEGIN
  CREATE TYPE public.adjustment_type AS ENUM (
    'add_entry','add_exit','add_break_start','add_break_end',
    'edit_entry','edit_exit','edit_break_start','edit_break_end',
    'remove_record','justify_absence','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.adjustment_status AS ENUM ('pending','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.time_clock_adjustment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  clock_date DATE NOT NULL,
  adjustment_type public.adjustment_type NOT NULL,
  target_record_id UUID NULL,
  proposed_time TIME NULL,
  reason TEXT NOT NULL,
  attachment_path TEXT NULL,
  status public.adjustment_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMPTZ NULL,
  review_notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tc_adj_user_date ON public.time_clock_adjustment_requests(user_id, clock_date);
CREATE INDEX IF NOT EXISTS idx_tc_adj_company_status ON public.time_clock_adjustment_requests(company_id, status);

ALTER TABLE public.time_clock_adjustment_requests ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "adj_select_own" ON public.time_clock_adjustment_requests;
CREATE POLICY "adj_select_own" ON public.time_clock_adjustment_requests
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "adj_insert_own" ON public.time_clock_adjustment_requests;
CREATE POLICY "adj_insert_own" ON public.time_clock_adjustment_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "adj_update_own_pending" ON public.time_clock_adjustment_requests;
CREATE POLICY "adj_update_own_pending" ON public.time_clock_adjustment_requests
FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

DROP POLICY IF EXISTS "adj_select_admin" ON public.time_clock_adjustment_requests;
CREATE POLICY "adj_select_admin" ON public.time_clock_adjustment_requests
FOR SELECT USING (public.has_role_safe(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "adj_update_admin" ON public.time_clock_adjustment_requests;
CREATE POLICY "adj_update_admin" ON public.time_clock_adjustment_requests
FOR UPDATE USING (public.has_role_safe(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "adj_select_gestor" ON public.time_clock_adjustment_requests;
CREATE POLICY "adj_select_gestor" ON public.time_clock_adjustment_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = time_clock_adjustment_requests.company_id
      AND uc.company_role = 'gestor'
      AND uc.is_active = true
  )
);

DROP POLICY IF EXISTS "adj_update_gestor" ON public.time_clock_adjustment_requests;
CREATE POLICY "adj_update_gestor" ON public.time_clock_adjustment_requests
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = time_clock_adjustment_requests.company_id
      AND uc.company_role = 'gestor'
      AND uc.is_active = true
  )
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_tc_adj_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_tc_adj_updated_at ON public.time_clock_adjustment_requests;
CREATE TRIGGER trg_tc_adj_updated_at
BEFORE UPDATE ON public.time_clock_adjustment_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_tc_adj_updated_at();

-- Trigger: quando aprovado, dispara recálculo do dia
CREATE OR REPLACE FUNCTION public.tg_tc_adj_on_approve()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    PERFORM public.recalc_user_day(NEW.user_id, NEW.clock_date);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tc_adj_on_approve ON public.time_clock_adjustment_requests;
CREATE TRIGGER trg_tc_adj_on_approve
AFTER UPDATE ON public.time_clock_adjustment_requests
FOR EACH ROW EXECUTE FUNCTION public.tg_tc_adj_on_approve();

-- Bucket de anexos (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('time-clock-attachments','time-clock-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "tc_attach_select_own" ON storage.objects;
CREATE POLICY "tc_attach_select_own" ON storage.objects
FOR SELECT USING (
  bucket_id = 'time-clock-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "tc_attach_insert_own" ON storage.objects;
CREATE POLICY "tc_attach_insert_own" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'time-clock-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "tc_attach_select_admin" ON storage.objects;
CREATE POLICY "tc_attach_select_admin" ON storage.objects
FOR SELECT USING (
  bucket_id = 'time-clock-attachments'
  AND public.has_role_safe(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "tc_attach_select_gestor" ON storage.objects;
CREATE POLICY "tc_attach_select_gestor" ON storage.objects
FOR SELECT USING (
  bucket_id = 'time-clock-attachments'
  AND EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_role = 'gestor'
      AND uc.is_active = true
  )
);
