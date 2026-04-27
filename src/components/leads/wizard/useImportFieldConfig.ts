import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Convenio,
  FieldDef,
  DEFAULT_FIELDS_BY_CONVENIO,
  applyFieldOverrides,
} from './columnsConfig';

type OverridesByConvenio = Partial<Record<Convenio, Record<string, boolean>>>;

/**
 * Carrega overrides de obrigatoriedade dos campos de importação
 * configurados pelo admin/gestor para a empresa do usuário atual.
 */
export function useImportFieldConfig() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<OverridesByConvenio>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) { setLoading(false); return; }

      const { data: uc } = await supabase
        .from('user_companies')
        .select('company_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      const cId = uc?.company_id ?? null;
      setCompanyId(cId);
      if (!cId) { setOverrides({}); setLoading(false); return; }

      const { data: rows } = await supabase
        .from('leads_import_field_config')
        .select('convenio, field_key, is_required')
        .eq('company_id', cId);

      const map: OverridesByConvenio = {};
      (rows ?? []).forEach((r: any) => {
        const c = r.convenio as Convenio;
        if (!map[c]) map[c] = {};
        map[c]![r.field_key] = !!r.is_required;
      });
      setOverrides(map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getFields = useCallback((convenio: Convenio): FieldDef[] => {
    return applyFieldOverrides(
      DEFAULT_FIELDS_BY_CONVENIO[convenio] ?? [],
      overrides[convenio],
    );
  }, [overrides]);

  return { getFields, loading, companyId, reload: load, overrides };
}
