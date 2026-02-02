-- =====================================================
-- SPRINT 1: ÍNDICES E FUNÇÃO DE BUSCA OTIMIZADA
-- Para 1M+ registros com múltiplos usuários simultâneos
-- =====================================================

-- 1. Índices B-tree para busca rápida (< 200ms)
CREATE INDEX IF NOT EXISTS idx_baseoff_clients_cpf ON public.baseoff_clients (cpf);
CREATE INDEX IF NOT EXISTS idx_baseoff_clients_nb ON public.baseoff_clients (nb);
CREATE INDEX IF NOT EXISTS idx_baseoff_clients_tel_cel_1 ON public.baseoff_clients (tel_cel_1) WHERE tel_cel_1 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_baseoff_clients_tel_cel_2 ON public.baseoff_clients (tel_cel_2) WHERE tel_cel_2 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_baseoff_clients_tel_fixo_1 ON public.baseoff_clients (tel_fixo_1) WHERE tel_fixo_1 IS NOT NULL;

-- Índice para ordenação comum
CREATE INDEX IF NOT EXISTS idx_baseoff_clients_updated_at ON public.baseoff_clients (updated_at DESC);

-- 2. Função de normalização de telefone
CREATE OR REPLACE FUNCTION public.normalize_phone(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  IF phone_input IS NULL OR phone_input = '' THEN
    RETURN NULL;
  END IF;
  RETURN REGEXP_REPLACE(phone_input, '[^0-9]', '', 'g');
END;
$function$;

-- 3. Função RPC de busca otimizada com priorização
CREATE OR REPLACE FUNCTION public.search_baseoff_clients(
  search_term text,
  search_limit integer DEFAULT 50,
  search_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  nb text,
  cpf text,
  nome text,
  data_nascimento text,
  sexo text,
  nome_mae text,
  esp text,
  mr numeric,
  banco_pagto text,
  status_beneficio text,
  municipio text,
  uf text,
  tel_cel_1 text,
  tel_cel_2 text,
  tel_fixo_1 text,
  email_1 text,
  created_at timestamptz,
  updated_at timestamptz,
  match_type text,
  match_score integer,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cleaned_term text;
  is_numeric boolean;
  total bigint;
BEGIN
  -- Normalizar termo de busca
  cleaned_term := TRIM(REGEXP_REPLACE(search_term, '[^0-9a-zA-ZÀ-ÿ\s]', '', 'g'));
  is_numeric := cleaned_term ~ '^[0-9]+$';
  
  -- Contar total de resultados
  IF is_numeric THEN
    SELECT COUNT(*) INTO total
    FROM public.baseoff_clients bc
    WHERE 
      public.normalize_cpf(bc.cpf) = LPAD(cleaned_term, 11, '0')
      OR bc.nb LIKE cleaned_term || '%'
      OR public.normalize_phone(bc.tel_cel_1) LIKE '%' || cleaned_term || '%'
      OR public.normalize_phone(bc.tel_cel_2) LIKE '%' || cleaned_term || '%'
      OR public.normalize_phone(bc.tel_fixo_1) LIKE '%' || cleaned_term || '%';
  ELSE
    SELECT COUNT(*) INTO total
    FROM public.baseoff_clients bc
    WHERE bc.nome ILIKE '%' || cleaned_term || '%';
  END IF;

  RETURN QUERY
  WITH ranked_results AS (
    SELECT 
      bc.id,
      bc.nb,
      bc.cpf,
      bc.nome,
      bc.data_nascimento,
      bc.sexo,
      bc.nome_mae,
      bc.esp,
      bc.mr,
      bc.banco_pagto,
      bc.status_beneficio,
      bc.municipio,
      bc.uf,
      bc.tel_cel_1,
      bc.tel_cel_2,
      bc.tel_fixo_1,
      bc.email_1,
      bc.created_at,
      bc.updated_at,
      CASE 
        WHEN is_numeric AND public.normalize_cpf(bc.cpf) = LPAD(cleaned_term, 11, '0') THEN 'cpf'
        WHEN is_numeric AND bc.nb LIKE cleaned_term || '%' THEN 'nb'
        WHEN is_numeric AND (
          public.normalize_phone(bc.tel_cel_1) LIKE '%' || cleaned_term || '%'
          OR public.normalize_phone(bc.tel_cel_2) LIKE '%' || cleaned_term || '%'
          OR public.normalize_phone(bc.tel_fixo_1) LIKE '%' || cleaned_term || '%'
        ) THEN 'telefone'
        ELSE 'nome'
      END as match_type,
      CASE 
        WHEN is_numeric AND public.normalize_cpf(bc.cpf) = LPAD(cleaned_term, 11, '0') THEN 100
        WHEN is_numeric AND bc.nb = cleaned_term THEN 95
        WHEN is_numeric AND bc.nb LIKE cleaned_term || '%' THEN 90
        WHEN is_numeric AND (
          public.normalize_phone(bc.tel_cel_1) = cleaned_term
          OR public.normalize_phone(bc.tel_cel_2) = cleaned_term
        ) THEN 85
        WHEN is_numeric AND (
          public.normalize_phone(bc.tel_cel_1) LIKE '%' || cleaned_term || '%'
          OR public.normalize_phone(bc.tel_cel_2) LIKE '%' || cleaned_term || '%'
        ) THEN 80
        WHEN NOT is_numeric AND bc.nome ILIKE cleaned_term || '%' THEN 75
        WHEN NOT is_numeric AND bc.nome ILIKE '%' || cleaned_term || '%' THEN 70
        ELSE 50
      END as match_score
    FROM public.baseoff_clients bc
    WHERE 
      CASE 
        WHEN is_numeric THEN
          public.normalize_cpf(bc.cpf) = LPAD(cleaned_term, 11, '0')
          OR bc.nb LIKE cleaned_term || '%'
          OR public.normalize_phone(bc.tel_cel_1) LIKE '%' || cleaned_term || '%'
          OR public.normalize_phone(bc.tel_cel_2) LIKE '%' || cleaned_term || '%'
          OR public.normalize_phone(bc.tel_fixo_1) LIKE '%' || cleaned_term || '%'
        ELSE
          bc.nome ILIKE '%' || cleaned_term || '%'
      END
  )
  SELECT 
    rr.*,
    total as total_count
  FROM ranked_results rr
  ORDER BY rr.match_score DESC, rr.updated_at DESC
  LIMIT search_limit
  OFFSET search_offset;
END;
$function$;

-- 4. Função para contagem de contratos (otimizada)
CREATE OR REPLACE FUNCTION public.get_client_contracts_count(client_id_param uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COUNT(*)::integer
  FROM public.baseoff_contracts
  WHERE client_id = client_id_param;
$function$;

-- 5. Índices para Activate Leads (priorização)
CREATE INDEX IF NOT EXISTS idx_activate_leads_status ON public.activate_leads (status);
CREATE INDEX IF NOT EXISTS idx_activate_leads_created_at ON public.activate_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activate_leads_assigned ON public.activate_leads (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activate_leads_simulation ON public.activate_leads (simulation_status) WHERE simulation_status IS NOT NULL;

-- 6. Índices para Leads Database (Premium)
CREATE INDEX IF NOT EXISTS idx_leads_database_available ON public.leads_database (is_available) WHERE is_available = true;
CREATE INDEX IF NOT EXISTS idx_leads_database_convenio ON public.leads_database (convenio);
CREATE INDEX IF NOT EXISTS idx_leads_database_banco ON public.leads_database (banco);

-- 7. Função para calcular prioridade de lead
CREATE OR REPLACE FUNCTION public.calculate_lead_priority(
  lead_created_at timestamptz,
  lead_status text,
  ultima_interacao timestamptz,
  proxima_acao text
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  age_hours integer;
  inactivity_hours integer;
  priority_score integer := 0;
  sla_status text;
  suggested_action text;
BEGIN
  age_hours := EXTRACT(EPOCH FROM (NOW() - lead_created_at)) / 3600;
  
  IF ultima_interacao IS NOT NULL THEN
    inactivity_hours := EXTRACT(EPOCH FROM (NOW() - ultima_interacao)) / 3600;
  ELSE
    inactivity_hours := age_hours;
  END IF;
  
  IF lead_status = 'novo' THEN
    priority_score := priority_score + 40;
  ELSIF lead_status = 'em_contato' THEN
    priority_score := priority_score + 30;
  ELSIF lead_status = 'interessado' THEN
    priority_score := priority_score + 35;
  END IF;
  
  IF inactivity_hours > 48 THEN
    priority_score := priority_score + 30;
  ELSIF inactivity_hours > 24 THEN
    priority_score := priority_score + 20;
  ELSIF inactivity_hours > 12 THEN
    priority_score := priority_score + 10;
  END IF;
  
  IF age_hours BETWEEN 2 AND 24 THEN
    priority_score := priority_score + 15;
  ELSIF age_hours BETWEEN 24 AND 72 THEN
    priority_score := priority_score + 10;
  END IF;
  
  IF lead_status = 'novo' AND age_hours > 4 THEN
    sla_status := 'critico';
  ELSIF lead_status = 'novo' AND age_hours > 2 THEN
    sla_status := 'atencao';
  ELSIF inactivity_hours > 24 THEN
    sla_status := 'atencao';
  ELSE
    sla_status := 'ok';
  END IF;
  
  IF proxima_acao IS NOT NULL AND proxima_acao != '' THEN
    suggested_action := proxima_acao;
  ELSIF lead_status = 'novo' THEN
    suggested_action := 'Fazer primeiro contato';
  ELSIF lead_status = 'em_contato' AND inactivity_hours > 24 THEN
    suggested_action := 'Retornar contato';
  ELSIF lead_status = 'interessado' THEN
    suggested_action := 'Enviar proposta';
  ELSE
    suggested_action := 'Verificar situação';
  END IF;
  
  RETURN jsonb_build_object(
    'score', LEAST(100, priority_score),
    'sla_status', sla_status,
    'age_hours', age_hours,
    'inactivity_hours', inactivity_hours,
    'suggested_action', suggested_action
  );
END;
$function$;