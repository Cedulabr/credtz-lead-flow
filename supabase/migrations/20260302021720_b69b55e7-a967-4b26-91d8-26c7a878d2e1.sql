
-- Add columns to whatsapp_instances
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS api_token text;
ALTER TABLE public.whatsapp_instances ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id);

-- Add columns to whatsapp_messages
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS direction text DEFAULT 'outgoing';
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text';
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS client_name text;

-- Index for company lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_company ON public.whatsapp_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user ON public.whatsapp_instances(user_id);

-- RLS: allow users to manage their own instances
DROP POLICY IF EXISTS "Users can view own whatsapp instances" ON public.whatsapp_instances;
CREATE POLICY "Users can view own whatsapp instances" ON public.whatsapp_instances
  FOR SELECT USING (
    auth.uid() = user_id 
    OR public.is_global_admin(auth.uid())
    OR (company_id IS NOT NULL AND company_id IN (SELECT public.get_user_company_ids(auth.uid())))
  );

DROP POLICY IF EXISTS "Users can insert own whatsapp instances" ON public.whatsapp_instances;
CREATE POLICY "Users can insert own whatsapp instances" ON public.whatsapp_instances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own whatsapp instances" ON public.whatsapp_instances;
CREATE POLICY "Users can update own whatsapp instances" ON public.whatsapp_instances
  FOR UPDATE USING (
    auth.uid() = user_id 
    OR public.is_global_admin(auth.uid())
    OR (company_id IS NOT NULL AND public.is_company_gestor(auth.uid(), company_id))
  );

DROP POLICY IF EXISTS "Users can delete own whatsapp instances" ON public.whatsapp_instances;
CREATE POLICY "Users can delete own whatsapp instances" ON public.whatsapp_instances
  FOR DELETE USING (auth.uid() = user_id OR public.is_global_admin(auth.uid()));

-- RLS for whatsapp_messages
DROP POLICY IF EXISTS "Users can view own whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users can view own whatsapp messages" ON public.whatsapp_messages
  FOR SELECT USING (
    auth.uid() = user_id 
    OR public.is_global_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert whatsapp messages" ON public.whatsapp_messages;
CREATE POLICY "Users can insert whatsapp messages" ON public.whatsapp_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
