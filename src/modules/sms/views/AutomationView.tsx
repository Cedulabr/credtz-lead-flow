import { useState, useEffect, useCallback } from "react";
import { Settings, Save, Play, Loader2, Zap, Users, Clock, CalendarDays, ChevronDown, Sparkles, Send, Ban, Search, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCompany } from "../hooks/useUserCompany";
import { toast } from "sonner";

interface QueueItem {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
  tipo_operacao: string;
  dias_enviados: number;
  dias_envio_total: number;
  ultimo_envio_at: string | null;
}

const WEEKDAYS = [
  { value: "1", label: "Seg" },
  { value: "2", label: "Ter" },
  { value: "3", label: "Qua" },
  { value: "4", label: "Qui" },
  { value: "5", label: "Sex" },
  { value: "6", label: "Sáb" },
  { value: "0", label: "Dom" },
];

const SECTION_COLORS = {
  portabilidade: { border: "border-l-blue-500", bg: "bg-blue-500/5", icon: "text-blue-500", badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300" },
  pago: { border: "border-l-emerald-500", bg: "bg-emerald-500/5", icon: "text-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300" },
  remarketing: { border: "border-l-violet-500", bg: "bg-violet-500/5", icon: "text-violet-500", badge: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300" },
  contato_futuro: { border: "border-l-amber-500", bg: "bg-amber-500/5", icon: "text-amber-500", badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" },
  proposta: { border: "border-l-teal-500", bg: "bg-teal-500/5", icon: "text-teal-500", badge: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300" },
};

// ─── High-Contrast Automation Toggle ───
const AutomationToggle = ({ checked, onCheckedChange, disabled }: { checked: boolean; onCheckedChange: (v: boolean) => void; disabled?: boolean }) => (
  <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all ${checked ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-destructive/10 border border-destructive/20"}`}>
    <span className={`text-xs font-bold tracking-wide ${checked ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
      {checked ? "ATIVADA" : "DESATIVADA"}
    </span>
    <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
  </div>
);

// ─── Status Badge (high contrast) ───
const StatusBadge = ({ active }: { active: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${active ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40" : "bg-destructive/15 text-destructive border-destructive/30"}`}>
    <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-500 animate-pulse" : "bg-destructive"}`} />
    {active ? "Ativa" : "Inativa"}
  </span>
);

// ─── Manual Dispatch Dialog ───
interface DispatchClient {
  id: string;
  cliente_nome: string;
  cliente_telefone: string;
}

const ManualDispatchDialog = ({
  open,
  onOpenChange,
  section,
  isAdmin,
  companyId,
  settings,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  section: string;
  isAdmin: boolean;
  companyId: string | null;
  settings: Record<string, string>;
}) => {
  const [mode, setMode] = useState<"all" | "quantity" | "specific">("all");
  const [quantity, setQuantity] = useState(10);
  const [search, setSearch] = useState("");
  const [clients, setClients] = useState<DispatchClient[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [totalQueue, setTotalQueue] = useState(0);

  const tableName = section === "remarketing" || section === "contato_futuro" ? "sms_remarketing_queue" : section === "proposta" ? "sms_proposal_notifications" : "sms_televendas_queue";

  const fetchClients = useCallback(async (searchTerm: string) => {
    setSearching(true);
    try {
      let query: any;
      if (tableName === "sms_proposal_notifications") {
        query = supabase.from(tableName).select("id, cliente_nome, cliente_telefone").eq("sent", false);
        if (!isAdmin && companyId) query = query.eq("company_id", companyId);
        if (searchTerm) query = query.or(`cliente_nome.ilike.%${searchTerm}%,cliente_telefone.ilike.%${searchTerm}%`);
      } else {
        query = supabase.from(tableName).select("id, cliente_nome, cliente_telefone").eq("automacao_ativa", true).eq("automacao_status", "ativo");
        if (!isAdmin && companyId) query = query.eq("company_id", companyId);
        if (section === "portabilidade") query = query.ilike("tipo_operacao", "%portabilidade%");
        if (section === "remarketing") query = query.eq("queue_type", "remarketing");
        if (section === "contato_futuro") query = query.eq("queue_type", "contato_futuro");
        if (searchTerm) query = query.or(`cliente_nome.ilike.%${searchTerm}%,cliente_telefone.ilike.%${searchTerm}%`);
      }
      const { data } = await query.limit(100);
      const items = (data as DispatchClient[]) || [];
      setClients(items);
      if (!searchTerm) setTotalQueue(items.length);
    } finally {
      setSearching(false);
    }
  }, [tableName, isAdmin, companyId, section]);

  useEffect(() => {
    if (open) {
      setMode("all");
      setSearch("");
      setSelectedIds(new Set());
      fetchClients("");
    }
  }, [open, fetchClients]);

  useEffect(() => {
    if (mode === "specific" && search.length >= 2) {
      const t = setTimeout(() => fetchClients(search), 300);
      return () => clearTimeout(t);
    }
  }, [search, mode, fetchClients]);

  const toggleClient = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleDispatch = async () => {
    setDispatching(true);
    try {
      if (mode === "all") {
        const { data, error } = await supabase.functions.invoke("sms-automation-run", { body: { section } });
        if (error) throw error;
        toast.success(`Disparado: ${data?.sent || 0} enviados, ${data?.failed || 0} falhas`);
      } else {
        let targets: DispatchClient[] = [];
        if (mode === "quantity") {
          targets = clients.slice(0, quantity);
        } else {
          targets = clients.filter((c) => selectedIds.has(c.id));
        }
        if (targets.length === 0) { toast.error("Nenhum cliente selecionado"); return; }

        let sent = 0, failed = 0;
        const templateKey = section === "contato_futuro" ? "msg_contato_futuro" : section === "remarketing" ? "msg_remarketing_dia_1" : section === "proposta" ? "msg_proposta_criada" : "msg_em_andamento";
        const template = settings[templateKey] || "Olá {{nome}}, temos uma oferta para você!";

        for (const t of targets) {
          const firstName = (t.cliente_nome || "").trim().split(" ")[0];
          const message = template.replace(/\{\{nome\}\}/gi, firstName);
          try {
            const { data, error } = await supabase.functions.invoke("send-sms", { body: { phone: t.cliente_telefone, message, send_type: "manual", contact_name: t.cliente_nome } });
            if (error || !data?.success) { failed++; } else { sent++; }
          } catch { failed++; }
        }
        toast.success(`${sent} enviados, ${failed} falhas`);
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Disparar Agora
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <RadioGroup value={mode} onValueChange={(v) => setMode(v as any)} className="space-y-2">
            <div className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-muted/30 cursor-pointer">
              <RadioGroupItem value="all" id="d-all" />
              <Label htmlFor="d-all" className="flex-1 cursor-pointer">
                <span className="text-sm font-medium">Disparar para todos</span>
                <span className="text-[10px] text-muted-foreground block">{totalQueue} clientes na fila</span>
              </Label>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-muted/30 cursor-pointer">
              <RadioGroupItem value="quantity" id="d-qty" />
              <Label htmlFor="d-qty" className="flex-1 cursor-pointer">
                <span className="text-sm font-medium">Selecionar quantidade</span>
                <span className="text-[10px] text-muted-foreground block">Dispara para os primeiros N da fila</span>
              </Label>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg border hover:bg-muted/30 cursor-pointer">
              <RadioGroupItem value="specific" id="d-spec" />
              <Label htmlFor="d-spec" className="flex-1 cursor-pointer">
                <span className="text-sm font-medium">Buscar cliente específico</span>
                <span className="text-[10px] text-muted-foreground block">Busque por nome ou telefone</span>
              </Label>
            </div>
          </RadioGroup>

          {mode === "quantity" && (
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <Input type="number" min={1} max={totalQueue || 100} value={quantity} onChange={(e) => setQuantity(parseInt(e.target.value) || 1)} className="w-24" />
              <span className="text-xs text-muted-foreground">de {totalQueue} disponíveis</span>
            </div>
          )}

          {mode === "specific" && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar por nome ou telefone..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-1.5">
                {searching ? (
                  <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                ) : clients.length === 0 ? (
                  <p className="text-xs text-center text-muted-foreground py-4">Nenhum cliente encontrado</p>
                ) : (
                  clients.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/40 cursor-pointer text-sm">
                      <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggleClient(c.id)} />
                      <span className="font-medium truncate flex-1">{c.cliente_nome}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{c.cliente_telefone}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedIds.size > 0 && <p className="text-xs text-primary font-medium">{selectedIds.size} selecionado(s)</p>}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleDispatch} disabled={dispatching || (mode === "specific" && selectedIds.size === 0)} className="gap-1.5">
            {dispatching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Confirmar Disparo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const AutomationView = () => {
  const { profile } = useAuth();
  const { companyId, isAdmin, loading: companyLoading } = useUserCompany();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningAll, setRunningAll] = useState(false);
  const [runningSection, setRunningSection] = useState<string | null>(null);
  const [nextSends, setNextSends] = useState<QueueItem[]>([]);
  const [loadingNext, setLoadingNext] = useState(false);
  const [msgsOpen, setMsgsOpen] = useState(false);
  const [dispatchSection, setDispatchSection] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("sms_automation_settings").select("*");
    const map: Record<string, string> = {};
    ((data as any[]) || []).forEach((s: any) => { map[s.setting_key] = s.setting_value; });
    setSettings(map);
    setLoading(false);
  }, []);

  const fetchNextSends = useCallback(async () => {
    if (companyLoading) return;
    setLoadingNext(true);
    let query = supabase
      .from("sms_televendas_queue")
      .select("id, cliente_nome, cliente_telefone, tipo_operacao, dias_enviados, dias_envio_total, ultimo_envio_at")
      .eq("automacao_ativa", true)
      .eq("automacao_status", "ativo")
      .ilike("tipo_operacao", "%portabilidade%")
      .order("ultimo_envio_at", { ascending: true, nullsFirst: true })
      .limit(50);

    if (!isAdmin && companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data } = await query;
    const filtered = ((data as any[]) || []).filter((i: QueueItem) => i.dias_enviados < i.dias_envio_total);
    setNextSends(filtered);
    setLoadingNext(false);
  }, [isAdmin, companyId, companyLoading]);

  useEffect(() => { fetchSettings(); fetchNextSends(); }, [fetchSettings, fetchNextSends]);

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

  const handleRunNow = async (section?: string) => {
    if (section) setRunningSection(section);
    else setRunningAll(true);
    try {
      const body = section ? { section } : {};
      const { data, error } = await supabase.functions.invoke("sms-automation-run", { body });
      if (error) throw error;
      const msg = data?.message
        ? data.message
        : `${section ? "Seção executada" : "Automação executada"}: ${data?.sent || 0} enviados, ${data?.failed || 0} falhas, ${data?.skipped || 0} ignorados`;
      toast.success(msg);
      fetchNextSends();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setRunningAll(false);
      setRunningSection(null);
    }
  };

  const selectedDays = (settings["remarketing_dias_semana"] || "1,2,3,4,5").split(",").filter(Boolean);

  const toggleWeekday = (day: string) => {
    const current = new Set(selectedDays);
    if (current.has(day)) current.delete(day);
    else current.add(day);
    updateSetting("remarketing_dias_semana", Array.from(current).sort().join(","));
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  const SectionTriggerButton = ({ section }: { section: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setDispatchSection(section)}
      disabled={!!runningSection || runningAll}
      className="gap-1.5 text-xs h-8"
    >
      {runningSection === section ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
      Disparar Agora
    </Button>
  );

  const FirstNameHint = () => (
    <p className="text-[10px] text-muted-foreground mt-1">
      Variáveis: <code className="bg-muted px-1 py-0.5 rounded">{"{{nome}}"}</code> <span className="text-emerald-600 dark:text-emerald-400 font-semibold">(primeiro nome)</span>
    </p>
  );

  return (
    <div className="space-y-6">
      {/* Manual Dispatch Dialog */}
      <ManualDispatchDialog
        open={!!dispatchSection}
        onOpenChange={(v) => { if (!v) setDispatchSection(null); }}
        section={dispatchSection || ""}
        isAdmin={isAdmin}
        companyId={companyId}
        settings={settings}
      />

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Central de Automações</h2>
              <p className="text-xs text-muted-foreground">Configure e dispare automações SMS por seção</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={() => handleRunNow()} disabled={runningAll || !!runningSection} className="gap-2">
                {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Executar Todas
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ─── Portabilidade em Andamento ─── */}
        <Card className={`border-l-4 ${SECTION_COLORS.portabilidade.border} overflow-hidden`}>
          <div className={`px-5 py-3.5 ${SECTION_COLORS.portabilidade.bg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Zap className={`h-4 w-4 ${SECTION_COLORS.portabilidade.icon}`} />
              <span className="text-sm font-semibold">Portabilidade em Andamento</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge active={settings["automacao_em_andamento_ativa"] === "true"} />
              {isAdmin && <SectionTriggerButton section="portabilidade" />}
            </div>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="p-2.5 rounded-lg bg-muted/40 text-xs text-muted-foreground">
              ⚡ Apenas propostas de <strong>Portabilidade</strong> com status em andamento receberão mensagens automáticas.
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Automação</Label>
              <AutomationToggle
                checked={settings["automacao_em_andamento_ativa"] === "true"}
                onCheckedChange={(v) => updateSetting("automacao_em_andamento_ativa", v ? "true" : "false")}
                disabled={!isAdmin}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quantidade de dias</Label>
                <Input type="number" min={1} max={30} value={settings["automacao_em_andamento_dias"] || "5"} onChange={(e) => updateSetting("automacao_em_andamento_dias", e.target.value)} disabled={!isAdmin} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Intervalo (horas)</Label>
                <Input type="number" min={1} max={168} value={settings["automacao_em_andamento_intervalo_horas"] || "24"} onChange={(e) => updateSetting("automacao_em_andamento_intervalo_horas", e.target.value)} disabled={!isAdmin} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Horário Início</Label>
                <Input type="number" min={0} max={23} value={settings["automacao_horario_inicio"] || "8"} onChange={(e) => updateSetting("automacao_horario_inicio", e.target.value)} disabled={!isAdmin} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1"><Clock className="h-3 w-3" /> Horário Fim</Label>
                <Input type="number" min={0} max={23} value={settings["automacao_horario_fim"] || "20"} onChange={(e) => updateSetting("automacao_horario_fim", e.target.value)} disabled={!isAdmin} className="mt-1" />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">Envios automáticos só ocorrem dentro deste horário (fuso Brasília)</p>
            <div>
              <Label className="text-xs">Mensagem</Label>
              <Textarea value={settings["msg_em_andamento"] || ""} onChange={(e) => updateSetting("msg_em_andamento", e.target.value)} rows={3} className="mt-1 text-sm" />
              <FirstNameHint />
              <p className="text-[10px] text-muted-foreground">Também: <code className="bg-muted px-1 py-0.5 rounded">{"{{tipo_operacao}}"}</code></p>
            </div>
          </CardContent>
        </Card>

        {/* ─── Propostas Pagas ─── */}
        <Card className={`border-l-4 ${SECTION_COLORS.pago.border} overflow-hidden`}>
          <div className={`px-5 py-3.5 ${SECTION_COLORS.pago.bg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Zap className={`h-4 w-4 ${SECTION_COLORS.pago.icon}`} />
              <span className="text-sm font-semibold">Notificação — Propostas Pagas</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge active={settings["automacao_pago_ativa"] === "true"} />
              {isAdmin && <SectionTriggerButton section="pago" />}
            </div>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Automação</Label>
              <AutomationToggle
                checked={settings["automacao_pago_ativa"] === "true"}
                onCheckedChange={(v) => updateSetting("automacao_pago_ativa", v ? "true" : "false")}
                disabled={!isAdmin}
              />
            </div>
            <div>
              <Label className="text-xs">Mensagem</Label>
              <Textarea value={settings["msg_pago_novo_emprestimo"] || ""} onChange={(e) => updateSetting("msg_pago_novo_emprestimo", e.target.value)} rows={3} className="mt-1 text-sm" />
              <FirstNameHint />
            </div>
            <div className="p-2.5 rounded-lg bg-muted/40 text-xs text-muted-foreground">
              Esta mensagem é enviada automaticamente quando uma proposta de <strong>Novo Empréstimo</strong> é marcada como <strong>Paga</strong>.
            </div>
          </CardContent>
        </Card>

        {/* ─── Remarketing Multi-Módulo ─── */}
        <Card className={`md:col-span-2 border-l-4 ${SECTION_COLORS.remarketing.border} overflow-hidden`}>
          <div className={`px-5 py-3.5 ${SECTION_COLORS.remarketing.bg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Zap className={`h-4 w-4 ${SECTION_COLORS.remarketing.icon}`} />
              <span className="text-sm font-semibold">Remarketing — Multi-Módulo</span>
              <Badge variant="secondary" className="text-[10px]">5 mensagens</Badge>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge active={settings["remarketing_ativa"] === "true"} />
              {isAdmin && <SectionTriggerButton section="remarketing" />}
            </div>
          </div>
          <CardContent className="p-5 space-y-5">
            <div className="p-2.5 rounded-lg bg-muted/40 text-xs text-muted-foreground">
              🔄 Envia ofertas automáticas para clientes com status <strong>aguardando retorno</strong> (Meus Clientes), <strong>em andamento</strong> (Leads Premium, Activate Leads).<br />
              💡 Use <code className="bg-background px-1 py-0.5 rounded text-[10px]">{"{{nome}}"}</code> — puxa apenas o <strong>primeiro nome</strong> do cliente.
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">Automação</Label>
              <AutomationToggle
                checked={settings["remarketing_ativa"] === "true"}
                onCheckedChange={(v) => updateSetting("remarketing_ativa", v ? "true" : "false")}
                disabled={!isAdmin}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Quantidade de dias</Label>
                <Input type="number" min={1} max={30} value={settings["remarketing_dias"] || "5"} onChange={(e) => updateSetting("remarketing_dias", e.target.value)} disabled={!isAdmin} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Intervalo (horas)</Label>
                <Input type="number" min={1} max={168} value={settings["remarketing_intervalo_horas"] || "24"} onChange={(e) => updateSetting("remarketing_intervalo_horas", e.target.value)} disabled={!isAdmin} className="mt-1" />
              </div>
            </div>

            {/* 5 Messages in Collapsible */}
            <Collapsible open={msgsOpen} onOpenChange={setMsgsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between h-9 px-3 text-xs font-medium border border-border/50 rounded-lg hover:bg-muted/50">
                  <span className="flex items-center gap-1.5">📝 Mensagens por dia da sequência (1-5)</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${msgsOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-3 mt-3">
                  {[1, 2, 3, 4, 5].map((day) => (
                    <div key={day}>
                      <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${SECTION_COLORS.remarketing.badge}`}>{day}</span>
                        Dia {day}
                      </Label>
                      <Textarea
                        value={settings[`msg_remarketing_dia_${day}`] || ""}
                        onChange={(e) => updateSetting(`msg_remarketing_dia_${day}`, e.target.value)}
                        rows={2}
                        className="mt-0.5 text-sm"
                        disabled={!isAdmin}
                        placeholder={`Mensagem para o dia ${day} da sequência...`}
                      />
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground">
                    Variável: <code className="bg-muted px-1 py-0.5 rounded">{"{{nome}}"}</code> = <span className="text-emerald-600 dark:text-emerald-400 font-semibold">primeiro nome</span>. Se ultrapassar 5 dias, as mensagens se repetem ciclicamente.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Scheduling */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Agenda de Envio
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Modo de dias</Label>
                  <Select value={settings["remarketing_modo_dias"] || "todos"} onValueChange={(v) => updateSetting("remarketing_modo_dias", v)} disabled={!isAdmin}>
                    <SelectTrigger className="mt-0.5 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">📅 Todos os dias</SelectItem>
                      <SelectItem value="intercalado">🔀 Intercalado</SelectItem>
                      <SelectItem value="aleatorio">🎲 Aleatório (50%)</SelectItem>
                      <SelectItem value="personalizado">✏️ Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Horário</Label>
                  <Input type="time" value={settings["remarketing_horario_envio"] || "09:00"} onChange={(e) => updateSetting("remarketing_horario_envio", e.target.value)} disabled={!isAdmin} className="mt-0.5 h-9" />
                </div>
              </div>

              {settings["remarketing_modo_dias"] === "personalizado" && (
                <div>
                  <Label className="text-[11px] text-muted-foreground mb-2 block">Dias da semana</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((wd) => {
                      const isSelected = selectedDays.includes(wd.value);
                      return (
                        <button
                          key={wd.value}
                          onClick={() => toggleWeekday(wd.value)}
                          disabled={!isAdmin}
                          className={`h-8 w-10 rounded-lg text-xs font-semibold transition-all border ${isSelected ? "bg-violet-500 text-white border-violet-500 shadow-sm" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}
                        >
                          {wd.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-muted/40 text-[10px] text-muted-foreground space-y-0.5">
                <p><strong>Todos:</strong> 1 SMS/dia no intervalo configurado.</p>
                <p><strong>Intercalado:</strong> dias alternados (1º, 3º, 5º...).</p>
                <p><strong>Aleatório:</strong> 50% de chance/dia — simula naturalidade.</p>
                <p><strong>Personalizado:</strong> apenas nos dias marcados acima.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Notificação de Proposta ─── */}
        <Card className={`border-l-4 ${SECTION_COLORS.proposta.border} overflow-hidden`}>
          <div className={`px-5 py-3.5 ${SECTION_COLORS.proposta.bg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <Send className={`h-4 w-4 ${SECTION_COLORS.proposta.icon}`} />
              <span className="text-sm font-semibold">Notificação de Proposta</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge active={settings["proposta_sms_ativa"] === "true"} />
              {isAdmin && <SectionTriggerButton section="proposta" />}
            </div>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="p-2.5 rounded-lg bg-muted/40 text-xs text-muted-foreground">
              📋 Quando o consultor criar uma proposta, poderá notificar o cliente via SMS. O envio ocorre <strong>2 horas</strong> após a criação.
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Automação</Label>
              <AutomationToggle
                checked={settings["proposta_sms_ativa"] === "true"}
                onCheckedChange={(v) => updateSetting("proposta_sms_ativa", v ? "true" : "false")}
                disabled={!isAdmin}
              />
            </div>
            <div>
              <Label className="text-xs">Mensagem</Label>
              <Textarea
                value={settings["msg_proposta_criada"] || ""}
                onChange={(e) => {
                  if (e.target.value.length <= 160) updateSetting("msg_proposta_criada", e.target.value);
                }}
                rows={3}
                className="mt-1 text-sm"
                disabled={!isAdmin}
              />
              <div className="flex items-center justify-between mt-1">
                <p className="text-[10px] text-muted-foreground">
                  Variáveis: <code className="bg-muted px-1 py-0.5 rounded">{"{{nome}}"}</code> <span className="text-emerald-600 dark:text-emerald-400 font-semibold">(primeiro nome)</span>, <code className="bg-muted px-1 py-0.5 rounded">{"{{consultor}}"}</code>, <code className="bg-muted px-1 py-0.5 rounded">{"{{empresa}}"}</code>
                </p>
                <span className={`text-[10px] font-mono ${(settings["msg_proposta_criada"] || "").length > 150 ? "text-destructive" : "text-muted-foreground"}`}>
                  {(settings["msg_proposta_criada"] || "").length}/160
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ─── Contato Futuro ─── */}
        <Card className={`md:col-span-2 border-l-4 ${SECTION_COLORS.contato_futuro.border} overflow-hidden`}>
          <div className={`px-5 py-3.5 ${SECTION_COLORS.contato_futuro.bg} flex items-center justify-between`}>
            <div className="flex items-center gap-2">
              <CalendarDays className={`h-4 w-4 ${SECTION_COLORS.contato_futuro.icon}`} />
              <span className="text-sm font-semibold">Contato Futuro — Agendado</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge active={settings["contato_futuro_ativa"] === "true"} />
              {isAdmin && <SectionTriggerButton section="contato_futuro" />}
            </div>
          </div>
          <CardContent className="p-5 space-y-4">
            <div className="p-2.5 rounded-lg bg-muted/40 text-xs text-muted-foreground">
              📅 Envia 1 SMS no dia agendado para clientes marcados como <strong>contato futuro</strong>.
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Automação</Label>
              <AutomationToggle
                checked={settings["contato_futuro_ativa"] === "true"}
                onCheckedChange={(v) => updateSetting("contato_futuro_ativa", v ? "true" : "false")}
                disabled={!isAdmin}
              />
            </div>
            <div>
              <Label className="text-xs">Mensagem</Label>
              <Textarea value={settings["msg_contato_futuro"] || ""} onChange={(e) => updateSetting("msg_contato_futuro", e.target.value)} rows={3} className="mt-1 text-sm" />
              <FirstNameHint />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Próximos Envios ─── */}
      <Card className="border overflow-hidden">
        <div className="px-5 py-3.5 bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Próximos Envios — Clientes a Notificar</span>
            <Badge variant="secondary" className="text-[10px]">{nextSends.length}</Badge>
            {!isAdmin && companyId && <Badge variant="outline" className="text-[10px]">Sua empresa</Badge>}
          </div>
        </div>
        <CardContent className="p-5">
          {loadingNext ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : nextSends.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Ban className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum cliente pendente de envio</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {nextSends.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/50 bg-card text-sm hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-xs font-bold text-blue-600">
                      {(item.cliente_nome || "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium truncate block text-sm">{item.cliente_nome}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">{item.cliente_telefone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-muted-foreground">{item.dias_enviados}/{item.dias_envio_total}</span>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {item.ultimo_envio_at
                        ? new Date(item.ultimo_envio_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                        : "Nunca"}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
