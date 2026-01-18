import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useGestorInactivityNotifications } from '@/hooks/useGestorInactivityNotifications';
import { Clock, Save, AlertTriangle } from 'lucide-react';

export function AdminInactivitySettings() {
  const { settings, updateSettings } = useGestorInactivityNotifications();
  const { toast } = useToast();
  const [days, setDays] = useState(settings?.inactivity_days || 3);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (settings?.inactivity_days) {
      setDays(settings.inactivity_days);
    }
  }, [settings]);

  const handleSave = async () => {
    if (days < 1 || days > 30) {
      toast({
        title: "Valor inválido",
        description: "O número de dias deve ser entre 1 e 30",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await updateSettings(days);
      toast({
        title: "Configuração salva",
        description: `Gestores serão notificados quando usuários não retirarem leads há ${days} dias`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar configuração",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-5 w-5" />
          Alertas de Inatividade
        </CardTitle>
        <CardDescription className="text-amber-700 dark:text-amber-300">
          Configure quando os gestores devem ser notificados sobre usuários que não retiram leads
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="inactivity-days" className="text-amber-800 dark:text-amber-200">
              Dias de inatividade
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <Input
                id="inactivity-days"
                type="number"
                min={1}
                max={30}
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 1)}
                className="w-24 bg-white dark:bg-gray-800"
              />
              <span className="text-sm text-amber-700 dark:text-amber-300">dias</span>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
              Gestores receberão alerta quando um usuário não retirar leads por este período
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
