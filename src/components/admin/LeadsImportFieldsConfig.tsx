import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Convenio,
  CONVENIO_LABELS,
  DEFAULT_FIELDS_BY_CONVENIO,
  FieldDef,
} from '@/components/leads/wizard/columnsConfig';

const CONVENIOS: Convenio[] = ['INSS', 'SIAPE', 'SERVIDOR_PUBLICO'];

type RequiredMap = Record<Convenio, Record<string, boolean>>;

function buildDefaultMap(): RequiredMap {
  const m: any = {};
  for (const c of CONVENIOS) {
    m[c] = {};
    for (const f of DEFAULT_FIELDS_BY_CONVENIO[c]) m[c][f.key] = f.required;
  }
  return m as RequiredMap;
}

export function LeadsImportFieldsConfig() {
  const { toast } = useToast();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [required, setRequired] = useState<RequiredMap>(buildDefaultMap());
  const [activeTab, setActiveTab] = useState<Convenio>('INSS');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes?.user?.id;
        if (!userId) return;
        const { data: uc } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();
        const cId = uc?.company_id ?? null;
        setCompanyId(cId);
        if (!cId) return;

        const { data: rows } = await supabase
          .from('leads_import_field_config')
          .select('convenio, field_key, is_required')
          .eq('company_id', cId);

        const next = buildDefaultMap();
        (rows ?? []).forEach((r: any) => {
          const c = r.convenio as Convenio;
          if (next[c]) next[c][r.field_key] = !!r.is_required;
        });
        setRequired(next);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fieldsByConvenio = useMemo(() => {
    const map: Record<Convenio, FieldDef[]> = {} as any;
    for (const c of CONVENIOS) map[c] = DEFAULT_FIELDS_BY_CONVENIO[c];
    return map;
  }, []);

  const toggle = (convenio: Convenio, key: string) => {
    setRequired(prev => ({
      ...prev,
      [convenio]: { ...prev[convenio], [key]: !prev[convenio][key] },
    }));
  };

  const restoreDefaults = (convenio: Convenio) => {
    const def: Record<string, boolean> = {};
    for (const f of DEFAULT_FIELDS_BY_CONVENIO[convenio]) def[f.key] = f.required;
    setRequired(prev => ({ ...prev, [convenio]: def }));
  };

  const handleSave = async () => {
    if (!companyId) {
      toast({ title: 'Empresa não identificada', description: 'Não foi possível salvar.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const updated_by = userRes?.user?.id ?? null;

      const rows: Array<{ company_id: string; convenio: Convenio; field_key: string; is_required: boolean; updated_by: string | null }> = [];
      for (const c of CONVENIOS) {
        for (const f of DEFAULT_FIELDS_BY_CONVENIO[c]) {
          rows.push({
            company_id: companyId,
            convenio: c,
            field_key: f.key,
            is_required: !!required[c][f.key],
            updated_by,
          });
        }
      }

      const { error } = await supabase
        .from('leads_import_field_config')
        .upsert(rows, { onConflict: 'company_id,convenio,field_key' });

      if (error) throw error;

      toast({ title: 'Configuração salva', description: 'As regras de importação foram atualizadas.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message ?? 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando configuração...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campos obrigatórios na importação</CardTitle>
          <CardDescription>
            Defina por convênio quais campos devem ser obrigatórios ao importar uma listagem de leads.
            Campos não obrigatórios continuam podendo ser mapeados, mas não bloqueiam a importação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Convenio)}>
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              {CONVENIOS.map(c => (
                <TabsTrigger key={c} value={c}>{CONVENIO_LABELS[c]}</TabsTrigger>
              ))}
            </TabsList>

            {CONVENIOS.map(c => (
              <TabsContent key={c} value={c} className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {fieldsByConvenio[c].length} campos disponíveis
                    {' · '}
                    <strong>{Object.values(required[c]).filter(Boolean).length}</strong> obrigatórios
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => restoreDefaults(c)}
                    className="gap-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
                  </Button>
                </div>

                <div className="rounded-md border divide-y">
                  {fieldsByConvenio[c].map(f => (
                    <div key={f.key} className="flex items-center justify-between p-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {f.label}
                          {f.group && (
                            <Badge variant="outline" className="text-[10px] uppercase">{f.group}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{f.key}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {required[c][f.key] ? 'Obrigatório' : 'Opcional'}
                        </span>
                        <Switch
                          checked={!!required[c][f.key]}
                          onCheckedChange={() => toggle(c, f.key)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex justify-end mt-6">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar configuração
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
