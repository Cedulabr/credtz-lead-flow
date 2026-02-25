import { useState, useEffect, useCallback } from "react";
import { Settings, Save, Play, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SettingRow {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
}

export const AutomationView = () => {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("sms_automation_settings").select("*");
    const map: Record<string, string> = {};
    ((data as any[]) || []).forEach((s: SettingRow) => { map[s.setting_key] = s.setting_value; });
    setSettings(map);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        await supabase.from("sms_automation_settings")
          .update({ setting_value: value, updated_at: new Date().toISOString() } as any)
          .eq("setting_key", key);
      }
      toast.success("Configurações salvas");
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("sms-automation-run");
      if (error) throw error;
      toast.success(`Automação executada: ${data?.sent || 0} enviados, ${data?.failed || 0} falhas, ${data?.skipped || 0} ignorados`);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setRunning(false);
    }
  };

  const isAdmin = profile?.role === "admin";

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Configurações de Automação
        </h2>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={handleRunNow} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Executar Agora
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Em Andamento Automation */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Automação - Propostas em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Ativada</Label>
              <Switch
                checked={settings["automacao_em_andamento_ativa"] === "true"}
                onCheckedChange={(v) => updateSetting("automacao_em_andamento_ativa", v ? "true" : "false")}
                disabled={!isAdmin}
              />
            </div>
            <div>
              <Label className="text-xs">Quantidade de dias</Label>
              <Input
                type="number"
                min={1}
                max={30}
                value={settings["automacao_em_andamento_dias"] || "5"}
                onChange={(e) => updateSetting("automacao_em_andamento_dias", e.target.value)}
                disabled={!isAdmin}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Intervalo entre envios (horas)</Label>
              <Input
                type="number"
                min={1}
                max={168}
                value={settings["automacao_em_andamento_intervalo_horas"] || "24"}
                onChange={(e) => updateSetting("automacao_em_andamento_intervalo_horas", e.target.value)}
                disabled={!isAdmin}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Mensagem</Label>
              <Textarea
                value={settings["msg_em_andamento"] || ""}
                onChange={(e) => updateSetting("msg_em_andamento", e.target.value)}
                rows={3}
                className="mt-1 text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Variáveis: {"{{nome}}"}, {"{{tipo_operacao}}"}</p>
            </div>
          </CardContent>
        </Card>

        {/* Pago Notification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Notificação - Propostas Pagas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Ativada</Label>
              <Switch
                checked={settings["automacao_pago_ativa"] === "true"}
                onCheckedChange={(v) => updateSetting("automacao_pago_ativa", v ? "true" : "false")}
                disabled={!isAdmin}
              />
            </div>
            <div>
              <Label className="text-xs">Mensagem</Label>
              <Textarea
                value={settings["msg_pago_novo_emprestimo"] || ""}
                onChange={(e) => updateSetting("msg_pago_novo_emprestimo", e.target.value)}
                rows={3}
                className="mt-1 text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Variáveis: {"{{nome}}"}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <p>Esta mensagem é enviada automaticamente quando uma proposta de <strong>Novo Empréstimo</strong> é marcada como <strong>Paga</strong>.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
