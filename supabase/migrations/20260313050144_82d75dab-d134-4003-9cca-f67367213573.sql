
-- AutoLead Jobs table
CREATE TABLE public.autolead_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id),
  total_leads int NOT NULL DEFAULT 0,
  leads_sent int NOT NULL DEFAULT 0,
  leads_failed int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  message_template text,
  use_default_message boolean NOT NULL DEFAULT true,
  selected_ddds text[] DEFAULT '{}',
  selected_tags text[] DEFAULT '{}',
  tipo_lead text,
  whatsapp_instance_ids text[] DEFAULT '{}',
  max_per_number_day int NOT NULL DEFAULT 40,
  pause_every int NOT NULL DEFAULT 10,
  pause_minutes int NOT NULL DEFAULT 10,
  send_window_start time NOT NULL DEFAULT '08:30',
  send_window_end time NOT NULL DEFAULT '18:30',
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  paused_at timestamptz,
  finished_at timestamptz
);

-- AutoLead Messages queue
CREATE TABLE public.autolead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.autolead_jobs(id) ON DELETE CASCADE,
  lead_id uuid,
  lead_name text,
  phone text NOT NULL,
  whatsapp_instance_id text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  scheduled_at timestamptz NOT NULL,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_autolead_jobs_user ON public.autolead_jobs(user_id);
CREATE INDEX idx_autolead_jobs_status ON public.autolead_jobs(status);
CREATE INDEX idx_autolead_messages_job ON public.autolead_messages(job_id);
CREATE INDEX idx_autolead_messages_scheduled ON public.autolead_messages(status, scheduled_at) WHERE status = 'scheduled';

-- RLS
ALTER TABLE public.autolead_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autolead_messages ENABLE ROW LEVEL SECURITY;

-- Jobs: user sees own, admin sees all
CREATE POLICY "Users can view own autolead jobs"
ON public.autolead_jobs FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_global_admin(auth.uid())
  OR public.is_company_gestor(auth.uid(), company_id)
);

CREATE POLICY "Users can insert own autolead jobs"
ON public.autolead_jobs FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own autolead jobs"
ON public.autolead_jobs FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_global_admin(auth.uid())
);

-- Messages: via job ownership
CREATE POLICY "Users can view own autolead messages"
ON public.autolead_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.autolead_jobs j
    WHERE j.id = job_id
    AND (j.user_id = auth.uid() OR public.is_global_admin(auth.uid()) OR public.is_company_gestor(auth.uid(), j.company_id))
  )
);

CREATE POLICY "Users can insert own autolead messages"
ON public.autolead_messages FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.autolead_jobs j
    WHERE j.id = job_id AND j.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own autolead messages"
ON public.autolead_messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.autolead_jobs j
    WHERE j.id = job_id
    AND (j.user_id = auth.uid() OR public.is_global_admin(auth.uid()))
  )
);
