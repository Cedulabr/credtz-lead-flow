import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save, Loader2, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { HourBankSettings as HBSettings } from './types';

export function HourBankSettingsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<HBSettings | null>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('hour_bank_settings').select('*').limit(1).maybeSingle();
    if (data) {
      setSettings(data as unknown as HBSettings);
    } else {
      // Create default settings
      const { data: newData } = await supabase.from('hour_bank_settings').insert({
        tolerance_delay_minutes: 10,
        max_overtime_monthly_minutes: 2400,
        max_bank_balance_minutes: 7200,
        allow_negative_discount: true,
        overtime_multiplier: 1.50,
      }).select().single();
      if (newData) setSettings(newData as unknown as HBSettings);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase.from('hour_bank_settings').update({
      tolerance_delay_minutes: settings.tolerance_delay_minutes,
      max_overtime_monthly_minutes: settings.max_overtime_monthly_minutes,
      max_bank_balance_minutes: settings.max_bank_balance_minutes,
      allow_negative_discount: settings.allow_negative_discount,
      overtime_multiplier: settings.overtime_multiplier,
    }).eq('id', settings.id);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Configurações do banco de horas salvas!' });
    }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  if (!settings) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Regras do Banco de Horas</CardTitle>
        <CardDescription>Configure limites e tolerâncias para o banco de horas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Tolerância de Atraso (minutos)</Label>
            <Input type="number" min="0" max="60" value={settings.tolerance_delay_minutes} onChange={e => setSettings({ ...settings, tolerance_delay_minutes: parseInt(e.target.value) || 0 })} />
            <p className="text-xs text-muted-foreground">Minutos de tolerância antes de considerar atraso</p>
          </div>
          <div className="space-y-2">
            <Label>Multiplicador de Hora Extra</Label>
            <Input type="number" min="1" max="3" step="0.05" value={settings.overtime_multiplier} onChange={e => setSettings({ ...settings, overtime_multiplier: parseFloat(e.target.value) || 1.5 })} />
            <p className="text-xs text-muted-foreground">Ex: 1.50 = 50% adicional</p>
          </div>
          <div className="space-y-2">
            <Label>Limite Mensal de Horas Extras (min)</Label>
            <Input type="number" min="0" value={settings.max_overtime_monthly_minutes} onChange={e => setSettings({ ...settings, max_overtime_monthly_minutes: parseInt(e.target.value) || 0 })} />
            <p className="text-xs text-muted-foreground">{Math.floor(settings.max_overtime_monthly_minutes / 60)}h por mês</p>
          </div>
          <div className="space-y-2">
            <Label>Limite Máximo do Banco (min)</Label>
            <Input type="number" min="0" value={settings.max_bank_balance_minutes} onChange={e => setSettings({ ...settings, max_bank_balance_minutes: parseInt(e.target.value) || 0 })} />
            <p className="text-xs text-muted-foreground">{Math.floor(settings.max_bank_balance_minutes / 60)}h de saldo máximo</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Permitir Desconto de Horas Negativas</Label>
            <p className="text-sm text-muted-foreground">Horas negativas podem ser descontadas em folha</p>
          </div>
          <Switch checked={settings.allow_negative_discount} onCheckedChange={checked => setSettings({ ...settings, allow_negative_discount: checked })} />
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
