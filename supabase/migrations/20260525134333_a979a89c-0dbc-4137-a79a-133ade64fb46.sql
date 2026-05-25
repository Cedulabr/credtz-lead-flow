
-- Map legacy profile flag -> module_key
CREATE OR REPLACE FUNCTION public._profile_flag_to_module_key(_flag text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _flag
    WHEN 'can_access_controle_ponto' THEN 'time-clock'
    WHEN 'can_access_premium_leads' THEN 'leads'
    WHEN 'can_access_digitacao' THEN 'digitacao'
    WHEN 'can_access_portflow' THEN 'digitacao-agibank'
    WHEN 'can_access_autolead' THEN 'autolead'
    WHEN 'can_access_sms' THEN 'sms'
    WHEN 'can_access_whatsapp' THEN 'whatsapp'
    WHEN 'can_access_meu_numero' THEN 'meu-numero'
    WHEN 'can_access_radar' THEN 'radar'
    WHEN 'can_access_audios' THEN 'audios'
    WHEN 'can_access_notas' THEN 'notas'
    WHEN 'can_access_telefonia' THEN 'telefonia'
    WHEN 'can_access_reaproveitamento' THEN 'reaproveitamento'
    WHEN 'can_access_baseoff_consulta' THEN 'baseoff-consulta'
    WHEN 'can_access_financas' THEN 'finances'
    WHEN 'can_access_tabela_comissoes' THEN 'commission-table'
    WHEN 'can_access_minhas_comissoes' THEN 'commissions'
    WHEN 'can_access_alertas' THEN 'reuse-alerts'
    WHEN 'can_access_relatorio_desempenho' THEN 'performance-report'
    WHEN 'can_access_colaborativo' THEN 'collaborative'
    WHEN 'can_access_documentos' THEN 'documents'
    WHEN 'can_access_gerador_propostas' THEN 'proposal-generator'
    WHEN 'can_access_activate_leads' THEN 'activate-leads'
    WHEN 'can_access_meus_clientes' THEN 'my-clients'
    WHEN 'can_access_televendas' THEN 'televendas'
    WHEN 'can_access_gestao_televendas' THEN 'televendas-manage'
  END
$$;

-- Map module_key -> default category (matches MODULE_CATALOG)
CREATE OR REPLACE FUNCTION public._module_default_category(_key text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE _key
    WHEN 'time-clock' THEN 'gestao'
    WHEN 'notas' THEN 'gestao'
    WHEN 'collaborative' THEN 'gestao'
    WHEN 'documents' THEN 'gestao'
    WHEN 'finances' THEN 'financeiro'
    WHEN 'commission-table' THEN 'financeiro'
    WHEN 'commissions' THEN 'financeiro'
    WHEN 'performance-report' THEN 'financeiro'
    WHEN 'televendas' THEN 'televendas'
    WHEN 'digitacao' THEN 'televendas'
    WHEN 'digitacao-agibank' THEN 'televendas'
    WHEN 'televendas-manage' THEN 'televendas'
    WHEN 'my-clients' THEN 'televendas'
    WHEN 'proposal-generator' THEN 'captacao'
    WHEN 'activate-leads' THEN 'captacao'
    WHEN 'leads' THEN 'captacao'
    WHEN 'leads-agibank' THEN 'captacao'
    WHEN 'radar' THEN 'captacao'
    WHEN 'baseoff-consulta' THEN 'captacao'
    WHEN 'reaproveitamento' THEN 'captacao'
    WHEN 'reuse-alerts' THEN 'captacao'
    WHEN 'whatsapp' THEN 'gestao_whatsapp'
    WHEN 'autolead' THEN 'gestao_whatsapp'
    WHEN 'sms' THEN 'gestao_whatsapp'
    WHEN 'meu-numero' THEN 'gestao_whatsapp'
    WHEN 'telefonia' THEN 'gestao_whatsapp'
    WHEN 'voicer' THEN 'gestao_whatsapp'
    WHEN 'audios' THEN 'gestao_whatsapp'
    WHEN 'easyn-flow' THEN 'gestao_whatsapp'
  END
$$;

-- Trigger 1: profiles.can_access_* changed -> upsert module_permissions
CREATE OR REPLACE FUNCTION public.sync_profile_flags_to_module_permissions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  flag_rec record;
  mk text;
  cat text;
  new_val boolean;
  old_val boolean;
BEGIN
  -- Skip if triggered by the reverse sync to avoid loops
  IF current_setting('app.skip_perm_sync', true) = 'on' THEN
    RETURN NEW;
  END IF;

  FOR flag_rec IN
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name LIKE 'can_access_%'
  LOOP
    mk := public._profile_flag_to_module_key(flag_rec.column_name);
    IF mk IS NULL THEN CONTINUE; END IF;

    EXECUTE format('SELECT ($1).%I, ($2).%I', flag_rec.column_name, flag_rec.column_name)
      INTO new_val, old_val USING NEW, OLD;

    IF new_val IS DISTINCT FROM old_val THEN
      cat := public._module_default_category(mk);
      IF cat IS NULL THEN cat := 'gestao'; END IF;

      PERFORM set_config('app.skip_perm_sync', 'on', true);
      INSERT INTO public.module_permissions (user_id, module_key, is_active, category_key)
      VALUES (NEW.id, mk, COALESCE(new_val, false), cat)
      ON CONFLICT (user_id, module_key)
      DO UPDATE SET is_active = COALESCE(EXCLUDED.is_active, false), updated_at = now();
      PERFORM set_config('app.skip_perm_sync', 'off', true);
    END IF;
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_profile_flags ON public.profiles;
CREATE TRIGGER trg_sync_profile_flags
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_profile_flags_to_module_permissions();

-- Trigger 2: module_permissions.is_active changed -> update profiles flag
CREATE OR REPLACE FUNCTION public.sync_module_permissions_to_profile_flags()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  flag_name text;
BEGIN
  IF current_setting('app.skip_perm_sync', true) = 'on' THEN
    RETURN NEW;
  END IF;

  flag_name := CASE NEW.module_key
    WHEN 'time-clock' THEN 'can_access_controle_ponto'
    WHEN 'leads' THEN 'can_access_premium_leads'
    WHEN 'digitacao' THEN 'can_access_digitacao'
    WHEN 'digitacao-agibank' THEN 'can_access_portflow'
    WHEN 'autolead' THEN 'can_access_autolead'
    WHEN 'sms' THEN 'can_access_sms'
    WHEN 'whatsapp' THEN 'can_access_whatsapp'
    WHEN 'meu-numero' THEN 'can_access_meu_numero'
    WHEN 'radar' THEN 'can_access_radar'
    WHEN 'audios' THEN 'can_access_audios'
    WHEN 'notas' THEN 'can_access_notas'
    WHEN 'telefonia' THEN 'can_access_telefonia'
    WHEN 'reaproveitamento' THEN 'can_access_reaproveitamento'
    WHEN 'baseoff-consulta' THEN 'can_access_baseoff_consulta'
    WHEN 'finances' THEN 'can_access_financas'
    WHEN 'commission-table' THEN 'can_access_tabela_comissoes'
    WHEN 'commissions' THEN 'can_access_minhas_comissoes'
    WHEN 'reuse-alerts' THEN 'can_access_alertas'
    WHEN 'performance-report' THEN 'can_access_relatorio_desempenho'
    WHEN 'collaborative' THEN 'can_access_colaborativo'
    WHEN 'documents' THEN 'can_access_documentos'
    WHEN 'proposal-generator' THEN 'can_access_gerador_propostas'
    WHEN 'activate-leads' THEN 'can_access_activate_leads'
    WHEN 'my-clients' THEN 'can_access_meus_clientes'
    WHEN 'televendas' THEN 'can_access_televendas'
    WHEN 'televendas-manage' THEN 'can_access_gestao_televendas'
  END;

  IF flag_name IS NULL THEN RETURN NEW; END IF;

  PERFORM set_config('app.skip_perm_sync', 'on', true);
  EXECUTE format('UPDATE public.profiles SET %I = $1, updated_at = now() WHERE id = $2', flag_name)
    USING NEW.is_active, NEW.user_id;
  PERFORM set_config('app.skip_perm_sync', 'off', true);

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_module_permissions ON public.module_permissions;
CREATE TRIGGER trg_sync_module_permissions
  AFTER INSERT OR UPDATE OF is_active ON public.module_permissions
  FOR EACH ROW EXECUTE FUNCTION public.sync_module_permissions_to_profile_flags();

-- Ensure realtime replication captures full row (idempotent)
ALTER TABLE public.module_permissions REPLICA IDENTITY FULL;

-- Backfill: for every profile flag that is TRUE, ensure module_permissions has a matching active row
DO $$
DECLARE
  r record;
  mk text;
  cat text;
BEGIN
  PERFORM set_config('app.skip_perm_sync', 'on', true);
  FOR r IN
    SELECT p.id AS user_id, c.column_name AS flag,
           (to_jsonb(p) ->> c.column_name)::boolean AS active
    FROM public.profiles p
    CROSS JOIN information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'profiles'
      AND c.column_name LIKE 'can_access_%'
  LOOP
    IF r.active IS NOT TRUE THEN CONTINUE; END IF;
    mk := public._profile_flag_to_module_key(r.flag);
    IF mk IS NULL THEN CONTINUE; END IF;
    cat := COALESCE(public._module_default_category(mk), 'gestao');
    INSERT INTO public.module_permissions (user_id, module_key, is_active, category_key)
    VALUES (r.user_id, mk, true, cat)
    ON CONFLICT (user_id, module_key)
    DO UPDATE SET is_active = true, updated_at = now()
    WHERE public.module_permissions.is_active IS DISTINCT FROM true;
  END LOOP;
  PERFORM set_config('app.skip_perm_sync', 'off', true);
END $$;
