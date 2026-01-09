import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, Save, Loader2, Coffee } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { TimeClockSettings } from './types';
import { BreakTypesManager } from './BreakTypesManager';

export function Settings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TimeClockSettings | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('time_clock_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (data) {
      setSettings(data as TimeClockSettings);
    } else {
      // Criar configuração padrão
      const defaultSettings = {
        default_entry_time: '08:00',
        default_exit_time: '18:00',
        tolerance_minutes: 10,
        require_photo: true,
        require_location: true,
        allow_manual_adjustment: true,
        block_duplicate_clock: true,
        retention_years: 5,
      };
      
      const { data: newData } = await supabase
        .from('time_clock_settings')
        .insert(defaultSettings)
        .select()
        .single();
      
      if (newData) {
        setSettings(newData as TimeClockSettings);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('time_clock_settings')
      .update({
        default_entry_time: settings.default_entry_time,
        default_exit_time: settings.default_exit_time,
        tolerance_minutes: settings.tolerance_minutes,
        require_photo: settings.require_photo,
        require_location: settings.require_location,
        allow_manual_adjustment: settings.allow_manual_adjustment,
        block_duplicate_clock: settings.block_duplicate_clock,
        retention_years: settings.retention_years,
      })
      .eq('id', settings.id);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Configurações salvas com sucesso!' });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="general" className="space-y-4">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="general" className="flex items-center gap-2">
          <SettingsIcon className="h-4 w-4" />
          Geral
        </TabsTrigger>
        <TabsTrigger value="breaks" className="flex items-center gap-2">
          <Coffee className="h-4 w-4" />
          Tipos de Pausa
        </TabsTrigger>
      </TabsList>

      <TabsContent value="general">
        {settings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Configurações do Ponto
              </CardTitle>
              <CardDescription>
                Configure as regras do controle de ponto
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="entry_time">Horário Padrão de Entrada</Label>
                  <Input
                    id="entry_time"
                    type="time"
                    value={settings.default_entry_time}
                    onChange={(e) =>
                      setSettings({ ...settings, default_entry_time: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exit_time">Horário Padrão de Saída</Label>
                  <Input
                    id="exit_time"
                    type="time"
                    value={settings.default_exit_time}
                    onChange={(e) =>
                      setSettings({ ...settings, default_exit_time: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tolerance">Tolerância (minutos)</Label>
                  <Input
                    id="tolerance"
                    type="number"
                    min="0"
                    max="60"
                    value={settings.tolerance_minutes}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        tolerance_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retention">Retenção de Dados (anos)</Label>
                  <Input
                    id="retention"
                    type="number"
                    min="1"
                    max="10"
                    value={settings.retention_years}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        retention_years: parseInt(e.target.value) || 5,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Exigir Foto</Label>
                    <p className="text-sm text-muted-foreground">
                      Colaboradores devem tirar foto ao registrar ponto
                    </p>
                  </div>
                  <Switch
                    checked={settings.require_photo}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, require_photo: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Exigir Localização</Label>
                    <p className="text-sm text-muted-foreground">
                      Capturar GPS ao registrar ponto
                    </p>
                  </div>
                  <Switch
                    checked={settings.require_location}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, require_location: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Permitir Ajuste Manual</Label>
                    <p className="text-sm text-muted-foreground">
                      Gestores podem ajustar horários com justificativa
                    </p>
                  </div>
                  <Switch
                    checked={settings.allow_manual_adjustment}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, allow_manual_adjustment: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Bloquear Ponto Duplicado</Label>
                    <p className="text-sm text-muted-foreground">
                      Impedir múltiplos registros do mesmo tipo no dia
                    </p>
                  </div>
                  <Switch
                    checked={settings.block_duplicate_clock}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, block_duplicate_clock: checked })
                    }
                  />
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="breaks">
        <BreakTypesManager />
      </TabsContent>
    </Tabs>
  );
}
