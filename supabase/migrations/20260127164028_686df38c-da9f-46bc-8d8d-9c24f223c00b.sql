-- =====================================================
-- BLACKLIST SYSTEM FOR ACTIVATE LEADS MODULE
-- =====================================================

-- Create blacklist table for Activate Leads (by telefone since CPF may be null)
CREATE TABLE IF NOT EXISTS public.activate_leads_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telefone TEXT NOT NULL,
  nome TEXT,
  cpf TEXT,
  reason TEXT NOT NULL,
  blacklisted_by UUID REFERENCES auth.users(id),
  blacklisted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  original_lead_id UUID REFERENCES public.activate_leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_activate_blacklist_telefone UNIQUE(telefone)
);

-- Enable RLS
ALTER TABLE public.activate_leads_blacklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activate_leads_blacklist
CREATE POLICY "Admins can view all activate leads blacklist"
  ON public.activate_leads_blacklist
  FOR SELECT
  USING (public.has_role_safe(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert into activate leads blacklist"
  ON public.activate_leads_blacklist
  FOR INSERT
  WITH CHECK (public.has_role_safe(auth.uid(), 'admin'::app_role) OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can view blacklist entries they created"
  ON public.activate_leads_blacklist
  FOR SELECT
  USING (blacklisted_by = auth.uid());

-- =====================================================
-- UPDATE EXISTING add_lead_to_blacklist TO USE 30 DAYS
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_lead_to_blacklist(lead_cpf text, blacklist_reason text DEFAULT 'recusou_oferta'::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into blacklist with 30-day expiration
  INSERT INTO public.leads_blacklist (cpf, reason, blacklisted_by, expires_at)
  VALUES (lead_cpf, blacklist_reason, auth.uid(), now() + interval '30 days')
  ON CONFLICT ON CONSTRAINT unique_blacklist_cpf DO UPDATE
  SET 
    reason = EXCLUDED.reason,
    blacklisted_at = now(),
    expires_at = now() + interval '30 days',
    blacklisted_by = auth.uid();
END;
$$;

-- =====================================================
-- CREATE FUNCTION FOR ACTIVATE LEADS BLACKLIST
-- =====================================================

CREATE OR REPLACE FUNCTION public.add_activate_lead_to_blacklist(
  p_telefone TEXT,
  p_nome TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT 'sem_possibilidade',
  p_lead_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into activate_leads_blacklist with 30-day expiration
  INSERT INTO public.activate_leads_blacklist (telefone, nome, cpf, reason, blacklisted_by, expires_at, original_lead_id)
  VALUES (p_telefone, p_nome, p_cpf, p_reason, auth.uid(), now() + interval '30 days', p_lead_id)
  ON CONFLICT ON CONSTRAINT unique_activate_blacklist_telefone DO UPDATE
  SET 
    nome = COALESCE(EXCLUDED.nome, activate_leads_blacklist.nome),
    cpf = COALESCE(EXCLUDED.cpf, activate_leads_blacklist.cpf),
    reason = EXCLUDED.reason,
    blacklisted_at = now(),
    expires_at = now() + interval '30 days',
    blacklisted_by = auth.uid(),
    original_lead_id = COALESCE(EXCLUDED.original_lead_id, activate_leads_blacklist.original_lead_id);
END;
$$;

-- =====================================================
-- FUNCTION TO RELEASE EXPIRED BLACKLISTED LEADS
-- =====================================================

CREATE OR REPLACE FUNCTION public.release_expired_blacklisted_leads()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  leads_premium_released INTEGER := 0;
  activate_leads_released INTEGER := 0;
  expired_cpfs TEXT[];
  expired_telefones TEXT[];
BEGIN
  -- 1. Get expired CPFs from leads_blacklist
  SELECT ARRAY_AGG(cpf) INTO expired_cpfs
  FROM public.leads_blacklist
  WHERE expires_at <= now();

  -- 2. Release Leads Premium (mark as available again)
  IF expired_cpfs IS NOT NULL AND array_length(expired_cpfs, 1) > 0 THEN
    UPDATE public.leads_database
    SET is_available = true, updated_at = now()
    WHERE cpf = ANY(expired_cpfs);
    
    GET DIAGNOSTICS leads_premium_released = ROW_COUNT;
    
    -- Delete expired entries from blacklist
    DELETE FROM public.leads_blacklist
    WHERE expires_at <= now();
  END IF;

  -- 3. Get expired telefones from activate_leads_blacklist
  SELECT ARRAY_AGG(telefone) INTO expired_telefones
  FROM public.activate_leads_blacklist
  WHERE expires_at <= now();

  -- 4. Release Activate Leads (reset to 'novo' status)
  IF expired_telefones IS NOT NULL AND array_length(expired_telefones, 1) > 0 THEN
    UPDATE public.activate_leads
    SET 
      status = 'novo',
      assigned_to = NULL,
      motivo_recusa = NULL,
      ultima_interacao = now(),
      updated_at = now()
    WHERE telefone = ANY(expired_telefones)
    AND status IN ('sem_possibilidade', 'sem_interesse', 'fora_do_perfil');
    
    GET DIAGNOSTICS activate_leads_released = ROW_COUNT;
    
    -- Add history entry for released leads
    INSERT INTO public.activate_leads_history (lead_id, user_id, action_type, from_status, to_status, notes)
    SELECT 
      al.id,
      '00000000-0000-0000-0000-000000000000'::uuid,
      'auto_release',
      al.status,
      'novo',
      'Lead liberado automaticamente após período de blacklist (30 dias)'
    FROM public.activate_leads al
    WHERE al.telefone = ANY(expired_telefones)
    AND al.status = 'novo';
    
    -- Delete expired entries from blacklist
    DELETE FROM public.activate_leads_blacklist
    WHERE expires_at <= now();
  END IF;

  -- Log the operation
  INSERT INTO public.audit_log (user_id, table_name, operation, record_id)
  VALUES (NULL, 'blacklist', 'AUTO_RELEASE', gen_random_uuid());

  RETURN jsonb_build_object(
    'success', true,
    'leads_premium_released', leads_premium_released,
    'activate_leads_released', activate_leads_released,
    'executed_at', now()
  );
END;
$$;

-- Create index for faster expiration checks
CREATE INDEX IF NOT EXISTS idx_activate_leads_blacklist_expires_at 
  ON public.activate_leads_blacklist(expires_at);

CREATE INDEX IF NOT EXISTS idx_leads_blacklist_expires_at 
  ON public.leads_blacklist(expires_at);