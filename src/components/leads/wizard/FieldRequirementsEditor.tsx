import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Settings, Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Convenio, FieldDef, DEFAULT_FIELDS_BY_CONVENIO } from './columnsConfig';

interface Props {
  convenio: Convenio;
  fields: FieldDef[];
  onSaved: () => void; // recarrega a config no wizard
}

/**
 * Botão exibido apenas para admin/gestor que abre um popover permitindo
 * alterar a obrigatoriedade dos campos de importação direto no wizard.
 */
export function FieldRequirementsEditor({ convenio, fields, onSaved }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes?.user?.id;
        if (!userId) return;

        const [{ data: profile }, { data: uc }] = await Promise.all([
          supabase.from('profiles').select('role').eq('id', userId).maybeSingle(),
          supabase
            .from('user_companies')
            .select('company_id, company_role')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle(),
        ]);

        const isAdmin = profile?.role === 'admin';
        const isGestor = uc?.company_role === 'gestor';
        setCompanyId(uc?.company_id ?? null);
        setCanEdit(isAdmin || isGestor);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // Sempre que abrir, sincroniza com os fields atuais (já com overrides aplicados)
  useEffect(() => {
    if (open) {
      const next: Record<string, boolean> = {};
      for (const f of fields) next[f.key] = !!f.required;
      setLocal(next);
    }
  }, [open, fields]);

  const toggle = (key: string) => setLocal(prev => ({ ...prev, [key]: !prev[key] }));

  const restoreDefaults = () => {
    const def: Record<string, boolean> = {};
    for (const f of DEFAULT_FIELDS_BY_CONVENIO[convenio]) def[f.key] = f.required;
    setLocal(def);
  };

  const save = async () => {
    if (!companyId) {
      toast({ title: 'Empresa não identificada', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const updated_by = userRes?.user?.id ?? null;

      const rows = DEFAULT_FIELDS_BY_CONVENIO[convenio].map(f => ({
        company_id: companyId,
        convenio,
        field_key: f.key,
        is_required: !!local[f.key],
        updated_by,
      }));

      const { error } = await supabase
        .from('leads_import_field_config')
        .upsert(rows, { onConflict: 'company_id,convenio,field_key' });

      if (error) throw error;

      toast({ title: 'Configuração salva', description: 'Obrigatoriedade atualizada.' });
      setOpen(false);
      onSaved();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e?.message ?? 'Tente novamente.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (checking || !canEdit) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-3.5 w-3.5" />
          Editar campos obrigatórios
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Campos obrigatórios</p>
            <p className="text-xs text-muted-foreground">Aplica-se à empresa toda.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={restoreDefaults} className="gap-1 h-7 text-xs">
            <RotateCcw className="h-3 w-3" /> Padrão
          </Button>
        </div>
        <div className="max-h-[320px] overflow-y-auto divide-y">
          {DEFAULT_FIELDS_BY_CONVENIO[convenio].map(f => (
            <div key={f.key} className="flex items-center justify-between px-3 py-2">
              <div className="text-sm">{f.label}</div>
              <Switch checked={!!local[f.key]} onCheckedChange={() => toggle(f.key)} />
            </div>
          ))}
        </div>
        <div className="p-3 border-t flex justify-end gap-2 bg-muted/30">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={save} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Salvar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
