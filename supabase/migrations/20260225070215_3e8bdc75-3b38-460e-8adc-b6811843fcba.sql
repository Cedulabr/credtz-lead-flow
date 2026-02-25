
-- =============================================
-- SMS Module Tables
-- =============================================

-- SMS Templates
CREATE TABLE public.sms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  variables TEXT[] DEFAULT '{}',
  created_by UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates from their company"
  ON public.sms_templates FOR SELECT
  USING (
    public.is_global_admin(auth.uid())
    OR public.user_belongs_to_company(auth.uid(), company_id)
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create templates"
  ON public.sms_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins and creators can update templates"
  ON public.sms_templates FOR UPDATE
  USING (
    public.is_global_admin(auth.uid())
    OR created_by = auth.uid()
  );

CREATE POLICY "Admins and creators can delete templates"
  ON public.sms_templates FOR DELETE
  USING (
    public.is_global_admin(auth.uid())
    OR created_by = auth.uid()
  );

-- SMS Contact Lists
CREATE TABLE public.sms_contact_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  contact_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_contact_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contact lists from their company"
  ON public.sms_contact_lists FOR SELECT
  USING (
    public.is_global_admin(auth.uid())
    OR public.user_belongs_to_company(auth.uid(), company_id)
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create contact lists"
  ON public.sms_contact_lists FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators and admins can update contact lists"
  ON public.sms_contact_lists FOR UPDATE
  USING (public.is_global_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "Creators and admins can delete contact lists"
  ON public.sms_contact_lists FOR DELETE
  USING (public.is_global_admin(auth.uid()) OR created_by = auth.uid());

-- SMS Contacts (individual contacts in a list)
CREATE TABLE public.sms_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.sms_contact_lists(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT NOT NULL,
  source TEXT DEFAULT 'manual', -- manual, csv, activate_leads, leads_premium, televendas
  source_id TEXT, -- ID from the source module
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contacts from accessible lists"
  ON public.sms_contacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sms_contact_lists cl
      WHERE cl.id = list_id
      AND (
        public.is_global_admin(auth.uid())
        OR public.user_belongs_to_company(auth.uid(), cl.company_id)
        OR cl.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert contacts into their lists"
  ON public.sms_contacts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sms_contact_lists cl
      WHERE cl.id = list_id
      AND (public.is_global_admin(auth.uid()) OR cl.created_by = auth.uid())
    )
  );

CREATE POLICY "Users can delete contacts from their lists"
  ON public.sms_contacts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sms_contact_lists cl
      WHERE cl.id = list_id
      AND (public.is_global_admin(auth.uid()) OR cl.created_by = auth.uid())
    )
  );

-- SMS Campaigns (bulk sends)
CREATE TABLE public.sms_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  template_id UUID REFERENCES public.sms_templates(id),
  message_content TEXT NOT NULL,
  contact_list_id UUID REFERENCES public.sms_contact_lists(id),
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, completed, failed
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view campaigns from their company"
  ON public.sms_campaigns FOR SELECT
  USING (
    public.is_global_admin(auth.uid())
    OR public.user_belongs_to_company(auth.uid(), company_id)
    OR created_by = auth.uid()
  );

CREATE POLICY "Users can create campaigns"
  ON public.sms_campaigns FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators and admins can update campaigns"
  ON public.sms_campaigns FOR UPDATE
  USING (public.is_global_admin(auth.uid()) OR created_by = auth.uid());

-- SMS Send History (individual message records)
CREATE TABLE public.sms_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.sms_campaigns(id),
  phone TEXT NOT NULL,
  contact_name TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  sent_by UUID NOT NULL,
  company_id UUID REFERENCES public.companies(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view history from their company"
  ON public.sms_history FOR SELECT
  USING (
    public.is_global_admin(auth.uid())
    OR public.user_belongs_to_company(auth.uid(), company_id)
    OR sent_by = auth.uid()
  );

CREATE POLICY "Users can insert history"
  ON public.sms_history FOR INSERT
  WITH CHECK (auth.uid() = sent_by);

-- Indexes
CREATE INDEX idx_sms_contacts_list_id ON public.sms_contacts(list_id);
CREATE INDEX idx_sms_contacts_phone ON public.sms_contacts(phone);
CREATE INDEX idx_sms_history_campaign_id ON public.sms_history(campaign_id);
CREATE INDEX idx_sms_history_sent_by ON public.sms_history(sent_by);
CREATE INDEX idx_sms_history_status ON public.sms_history(status);
CREATE INDEX idx_sms_campaigns_status ON public.sms_campaigns(status);

-- Trigger to update contact_count
CREATE OR REPLACE FUNCTION public.update_sms_contact_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.sms_contact_lists SET contact_count = contact_count + 1, updated_at = now() WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.sms_contact_lists SET contact_count = GREATEST(0, contact_count - 1), updated_at = now() WHERE id = OLD.list_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_sms_contact_count
AFTER INSERT OR DELETE ON public.sms_contacts
FOR EACH ROW EXECUTE FUNCTION public.update_sms_contact_count();
