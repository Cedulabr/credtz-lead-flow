
ALTER TABLE public.leads_database
  ADD COLUMN IF NOT EXISTS margem_atualizada_em timestamptz,
  ADD COLUMN IF NOT EXISTS margem_anterior numeric,
  ADD COLUMN IF NOT EXISTS import_log_id uuid;

CREATE INDEX IF NOT EXISTS idx_leads_database_import_log ON public.leads_database(import_log_id);
CREATE INDEX IF NOT EXISTS idx_leads_database_created_at ON public.leads_database(created_at);

CREATE TABLE IF NOT EXISTS public.leads_margem_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads_database(id) ON DELETE CASCADE,
  margem_disponivel numeric,
  margem_total numeric,
  margem_disponivel_anterior numeric,
  import_log_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_margem_history_lead ON public.leads_margem_history(lead_id);

ALTER TABLE public.leads_margem_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read margem history" ON public.leads_margem_history;
CREATE POLICY "Admins read margem history"
ON public.leads_margem_history FOR SELECT
USING (public.has_role_safe(auth.uid()::text, 'admin'));

CREATE OR REPLACE FUNCTION public.import_leads_governo(
  leads_data jsonb,
  p_mode text DEFAULT 'full',
  p_import_log_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  lead_record jsonb;
  v_nome text;
  v_cpf text;
  v_convenio text;
  v_telefone text;
  v_matricula text;
  v_banco text;
  v_situacao text;
  v_ade text;
  v_servico_servidor text;
  v_tipo_servico_servidor text;
  v_servico_consignataria text;
  v_margem_disponivel numeric;
  v_margem_total numeric;
  v_parcela numeric;
  v_parcelas_em_aberto integer;
  v_parcelas_pagas integer;
  v_deferimento date;
  v_quitacao date;
  v_ultimo_desconto date;
  v_ultima_parcela date;
  v_origem text;
  imported_count integer := 0;
  duplicate_count integer := 0;
  updated_margin_count integer := 0;
  not_found_count integer := 0;
  error_count integer := 0;
  existing_lead record;
BEGIN
  IF leads_data IS NULL OR jsonb_array_length(leads_data) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nenhum dado fornecido');
  END IF;

  FOR lead_record IN SELECT * FROM jsonb_array_elements(leads_data)
  LOOP
    BEGIN
      v_nome := TRIM(COALESCE(lead_record->>'nome', ''));
      v_cpf := regexp_replace(COALESCE(lead_record->>'cpf', ''), '\D', '', 'g');
      v_convenio := UPPER(TRIM(COALESCE(NULLIF(lead_record->>'convenio',''), 'GOVERNO BA')));
      v_telefone := regexp_replace(COALESCE(lead_record->>'telefone', ''), '\D', '', 'g');
      v_matricula := NULLIF(TRIM(COALESCE(lead_record->>'matricula', '')), '');
      v_banco := NULLIF(TRIM(COALESCE(lead_record->>'banco', '')), '');
      v_situacao := NULLIF(TRIM(COALESCE(lead_record->>'situacao', '')), '');
      v_ade := NULLIF(TRIM(COALESCE(lead_record->>'ade', '')), '');
      v_servico_servidor := NULLIF(TRIM(COALESCE(lead_record->>'servico_servidor', '')), '');
      v_tipo_servico_servidor := NULLIF(TRIM(COALESCE(lead_record->>'tipo_servico_servidor', '')), '');
      v_servico_consignataria := NULLIF(TRIM(COALESCE(lead_record->>'servico_consignataria', '')), '');
      v_origem := COALESCE(NULLIF(lead_record->>'origem_base',''), 'governo_ba');

      v_margem_disponivel := NULLIF(lead_record->>'margem_disponivel', '')::numeric;
      v_margem_total := NULLIF(lead_record->>'margem_total', '')::numeric;
      v_parcela := NULLIF(lead_record->>'parcela', '')::numeric;
      v_parcelas_em_aberto := NULLIF(lead_record->>'parcelas_em_aberto', '')::integer;
      v_parcelas_pagas := NULLIF(lead_record->>'parcelas_pagas', '')::integer;
      v_deferimento := NULLIF(lead_record->>'deferimento', '')::date;
      v_quitacao := NULLIF(lead_record->>'quitacao', '')::date;
      v_ultimo_desconto := NULLIF(lead_record->>'ultimo_desconto', '')::date;
      v_ultima_parcela := NULLIF(lead_record->>'ultima_parcela', '')::date;

      IF v_nome = '' OR length(v_cpf) <> 11 THEN
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      SELECT * INTO existing_lead
      FROM public.leads_database
      WHERE cpf = v_cpf
        AND COALESCE(matricula,'') = COALESCE(v_matricula,'')
        AND COALESCE(banco,'') = COALESCE(v_banco,'')
        AND COALESCE(ade,'') = COALESCE(v_ade,'')
      LIMIT 1;

      IF existing_lead IS NULL THEN
        IF p_mode = 'margin_only' THEN
          not_found_count := not_found_count + 1;
          CONTINUE;
        END IF;

        INSERT INTO public.leads_database (
          name, cpf, phone, convenio, banco, matricula,
          margem_disponivel, margem_total, situacao, ade,
          servico_servidor, tipo_servico_servidor, servico_consignataria,
          parcela, parcelas_em_aberto, parcelas_pagas,
          deferimento, quitacao, ultimo_desconto, ultima_parcela,
          tipo_beneficio, is_available, origem_base,
          margem_atualizada_em, import_log_id
        ) VALUES (
          v_nome, v_cpf, v_telefone, v_convenio, v_banco, v_matricula,
          v_margem_disponivel, v_margem_total, v_situacao, v_ade,
          v_servico_servidor, v_tipo_servico_servidor, v_servico_consignataria,
          v_parcela, v_parcelas_em_aberto, v_parcelas_pagas,
          v_deferimento, v_quitacao, v_ultimo_desconto, v_ultima_parcela,
          v_convenio, true, v_origem,
          CASE WHEN v_margem_disponivel IS NOT NULL THEN now() ELSE NULL END,
          p_import_log_id
        );

        imported_count := imported_count + 1;
        CONTINUE;
      END IF;

      IF p_mode = 'margin_only' THEN
        UPDATE public.leads_database
        SET
          margem_disponivel = COALESCE(v_margem_disponivel, margem_disponivel),
          margem_total = COALESCE(v_margem_total, margem_total),
          situacao = COALESCE(v_situacao, situacao),
          parcelas_pagas = COALESCE(v_parcelas_pagas, parcelas_pagas),
          parcelas_em_aberto = COALESCE(v_parcelas_em_aberto, parcelas_em_aberto),
          ultimo_desconto = COALESCE(v_ultimo_desconto, ultimo_desconto),
          ultima_parcela = COALESCE(v_ultima_parcela, ultima_parcela),
          margem_anterior = CASE WHEN v_margem_disponivel IS DISTINCT FROM margem_disponivel THEN margem_disponivel ELSE margem_anterior END,
          margem_atualizada_em = CASE WHEN v_margem_disponivel IS DISTINCT FROM margem_disponivel THEN now() ELSE margem_atualizada_em END,
          updated_at = now()
        WHERE id = existing_lead.id;

        IF v_margem_disponivel IS DISTINCT FROM existing_lead.margem_disponivel THEN
          INSERT INTO public.leads_margem_history (lead_id, margem_disponivel, margem_total, margem_disponivel_anterior, import_log_id)
          VALUES (existing_lead.id, v_margem_disponivel, v_margem_total, existing_lead.margem_disponivel, p_import_log_id);
        END IF;

        updated_margin_count := updated_margin_count + 1;
        CONTINUE;
      END IF;

      UPDATE public.leads_database
      SET
        name = v_nome,
        situacao = v_situacao,
        margem_disponivel = v_margem_disponivel,
        margem_total = v_margem_total,
        parcela = v_parcela,
        parcelas_em_aberto = v_parcelas_em_aberto,
        parcelas_pagas = v_parcelas_pagas,
        deferimento = v_deferimento,
        quitacao = v_quitacao,
        ultimo_desconto = v_ultimo_desconto,
        ultima_parcela = v_ultima_parcela,
        servico_servidor = v_servico_servidor,
        tipo_servico_servidor = v_tipo_servico_servidor,
        servico_consignataria = v_servico_consignataria,
        margem_anterior = CASE WHEN v_margem_disponivel IS DISTINCT FROM margem_disponivel THEN margem_disponivel ELSE margem_anterior END,
        margem_atualizada_em = CASE WHEN v_margem_disponivel IS DISTINCT FROM margem_disponivel THEN now() ELSE margem_atualizada_em END,
        updated_at = now()
      WHERE id = existing_lead.id;

      IF v_margem_disponivel IS DISTINCT FROM existing_lead.margem_disponivel THEN
        INSERT INTO public.leads_margem_history (lead_id, margem_disponivel, margem_total, margem_disponivel_anterior, import_log_id)
        VALUES (existing_lead.id, v_margem_disponivel, v_margem_total, existing_lead.margem_disponivel, p_import_log_id);
      END IF;

      duplicate_count := duplicate_count + 1;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'imported', imported_count,
    'duplicates', duplicate_count,
    'updated_margin', updated_margin_count,
    'not_found', not_found_count,
    'invalid', error_count,
    'duplicate_details', '[]'::jsonb,
    'mode', p_mode
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_leads_by_import_log(p_log_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role_safe(auth.uid()::text, 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem apagar leads em lote';
  END IF;

  DELETE FROM public.leads_distribution
  WHERE lead_id IN (SELECT id FROM public.leads_database WHERE import_log_id = p_log_id);

  DELETE FROM public.leads_database WHERE import_log_id = p_log_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'deleted', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_leads_by_date(p_date date, p_origem text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role_safe(auth.uid()::text, 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem apagar leads em lote';
  END IF;

  DELETE FROM public.leads_distribution
  WHERE lead_id IN (
    SELECT id FROM public.leads_database
    WHERE created_at >= p_date::timestamptz
      AND created_at < (p_date + 1)::timestamptz
      AND (p_origem IS NULL OR origem_base = p_origem)
  );

  DELETE FROM public.leads_database
  WHERE created_at >= p_date::timestamptz
    AND created_at < (p_date + 1)::timestamptz
    AND (p_origem IS NULL OR origem_base = p_origem);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'deleted', v_count, 'date', p_date, 'origem', p_origem);
END;
$$;

CREATE OR REPLACE FUNCTION public.scan_duplicates_leads_database()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role_safe(auth.uid()::text, 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem executar varredura';
  END IF;

  WITH groups AS (
    SELECT
      cpf,
      COALESCE(matricula,'') AS matricula,
      COALESCE(banco,'') AS banco,
      COALESCE(ade,'') AS ade,
      array_agg(id ORDER BY created_at ASC) AS ids,
      array_agg(name ORDER BY created_at ASC) AS names,
      count(*) AS total
    FROM public.leads_database
    WHERE cpf IS NOT NULL AND length(cpf) = 11
    GROUP BY cpf, COALESCE(matricula,''), COALESCE(banco,''), COALESCE(ade,'')
    HAVING count(*) > 1
    LIMIT 500
  )
  SELECT jsonb_build_object(
    'total_groups', count(*),
    'total_duplicates', COALESCE(sum(total - 1), 0),
    'groups', COALESCE(jsonb_agg(jsonb_build_object(
      'cpf', cpf,
      'matricula', matricula,
      'banco', banco,
      'ade', ade,
      'name', names[1],
      'keep_id', ids[1],
      'remove_ids', ids[2:array_length(ids,1)],
      'total', total
    )), '[]'::jsonb)
  ) INTO result
  FROM groups;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.merge_duplicates_leads_database(remove_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.has_role_safe(auth.uid()::text, 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem mesclar duplicatas';
  END IF;

  DELETE FROM public.leads_distribution WHERE lead_id = ANY(remove_ids);
  DELETE FROM public.leads_database WHERE id = ANY(remove_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'removed', v_count);
END;
$$;
