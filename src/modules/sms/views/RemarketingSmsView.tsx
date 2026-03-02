import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Megaphone, Play, Pause, Send, RefreshCw, Loader2, Download, Calendar, CheckCircle, XCircle, CircleDashed, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCompany } from "../hooks/useUserCompany";
import { toast } from "sonner";

interface RemarketingItem {
  id: string;
  source_module: string;
  source_id: string;
  cliente_nome: string;
  cliente_telefone: string;
  status_original: string | null;
  queue_type: string;
  scheduled_date: string | null;
  automacao_status: string;
  automacao_ativa: boolean;
  dias_envio_total: number;
  dias_enviados: number;
  ultimo_envio_at: string | null;
  created_at: string;
}

const MODULE_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  leads_premium: { label: "Leads Premium", emoji: "💎", color: "border-l-violet-400" },
  activate_leads: { label: "Activate Leads", emoji: "⚡", color: "border-l-blue-400" },
  meus_clientes: { label: "Meus Clientes", emoji: "👤", color: "border-l-emerald-400" },
};

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: "Ativo", variant: "default" },
  pausado: { label: "Pausado", variant: "secondary" },
  finalizado: { label: "Finalizado", variant: "outline" },
};

export const RemarketingSmsView = () => {
  const { profile } = useAuth();
  const { companyId, isAdmin, loading: companyLoading } = useUserCompany();
  const [queue, setQueue] = useState<RemarketingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const fetchQueue = useCallback(async () => {
    if (companyLoading) return;
    setLoading(true);
    let query = supabase.from("sms_remarketing_queue").select("*").order("created_at", { ascending: false });
    if (filterModule !== "all") query = query.eq("source_module", filterModule);
    if (filterType !== "all") query = query.eq("queue_type", filterType);
    if (filterStatus !== "all") query = query.eq("automacao_status", filterStatus);
    if (!isAdmin && companyId) query = query.eq("company_id", companyId);
    const { data } = await query.limit(300);
    setQueue((data as any[]) || []);
    setLoading(false);
  }, [filterModule, filterType, filterStatus, isAdmin, companyId, companyLoading]);

  useEffect(() => { if (!companyLoading) fetchQueue(); }, [fetchQueue, companyLoading]);

  const toggleAutomacao = async (item: RemarketingItem) => {
    setTogglingId(item.id);
    const newAtiva = !item.automacao_ativa;
    const newStatus = newAtiva ? "ativo" : "pausado";
    await supabase.from("sms_remarketing_queue").update({ automacao_ativa: newAtiva, automacao_status: newStatus } as any).eq("id", item.id);
    toast.success(newAtiva ? "Automação reativada" : "Automação pausada");
    fetchQueue();
    setTogglingId(null);
  };

  const handleManualSend = async (item: RemarketingItem) => {
    setSendingId(item.id);
    try {
      const templateKey = item.queue_type === "contato_futuro" ? "msg_contato_futuro" : "msg_remarketing";
      const { data: settings } = await supabase.from("sms_automation_settings").select("setting_key, setting_value").eq("setting_key", templateKey).single();
      let message = settings?.setting_value || "Olá {{nome}}, temos uma oferta para você!";
      const firstName = (item.cliente_nome || "").trim().split(" ")[0];
      message = message.replace(/\{\{nome\}\}/gi, firstName);
      const { data, error } = await supabase.functions.invoke("send-sms", { body: { phone: item.cliente_telefone, message, send_type: "manual", contact_name: item.cliente_nome } });
      if (error) throw error;
      if (data?.success) toast.success("SMS enviado com sucesso");
      else toast.error("Falha no envio: " + (data?.error || "erro"));
      fetchQueue();
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setSendingId(null); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: settingsData } = await supabase.from("sms_automation_settings").select("setting_key, setting_value").eq("setting_key", "remarketing_dias").single();
      const dias = parseInt(settingsData?.setting_value || "5");
      let insertedByModule: Record<string, number> = { leads_premium: 0, activate_leads: 0, meus_clientes: 0 };

      // Fetch company user IDs for filtering tables where company_id is NULL
      let companyUserIds: string[] = [];
      if (!isAdmin && companyId) {
        const { data: companyUsers } = await supabase
          .from("user_companies")
          .select("user_id")
          .eq("company_id", companyId)
          .eq("is_active", true);
        companyUserIds = (companyUsers || []).map(u => u.user_id);
      }

      // Sync Leads Premium
      { let q = supabase.from("leads").select("id, name, phone, status, future_contact_date, company_id, assigned_to, requested_by").in("status", ["em_andamento", "contato_futuro"]); if (!isAdmin && companyUserIds.length > 0) q = q.or(`assigned_to.in.(${companyUserIds.join(',')}),requested_by.in.(${companyUserIds.join(',')})`); const { data: leads } = await q.limit(500); toast.info(`Leads Premium: ${(leads || []).length} encontrados`); const toInsert = (leads || []).flatMap((l: any) => { const items: any[] = []; const userId = l.assigned_to || l.requested_by || profile?.id; if (l.status === "em_andamento") items.push({ source_module: "leads_premium", source_id: l.id, cliente_nome: l.name, cliente_telefone: l.phone, status_original: l.status, queue_type: "remarketing", company_id: l.company_id || companyId, user_id: userId, dias_envio_total: dias }); if (l.status === "contato_futuro" && l.future_contact_date) items.push({ source_module: "leads_premium", source_id: l.id, cliente_nome: l.name, cliente_telefone: l.phone, status_original: l.status, queue_type: "contato_futuro", scheduled_date: l.future_contact_date, company_id: l.company_id || companyId, user_id: userId, dias_envio_total: 1 }); return items; }); if (toInsert.length > 0) { const { error } = await supabase.from("sms_remarketing_queue").upsert(toInsert as any, { onConflict: "source_module,source_id,queue_type" }); if (!error) insertedByModule.leads_premium = toInsert.length; } }

      // Sync Activate Leads
      { let q = supabase.from("activate_leads").select("id, nome, telefone, status, data_proxima_operacao, company_id, assigned_to, created_by").in("status", ["em_andamento", "contato_futuro"]); if (!isAdmin && companyUserIds.length > 0) q = q.or(`assigned_to.in.(${companyUserIds.join(',')}),created_by.in.(${companyUserIds.join(',')})`); const { data: aLeads } = await q.limit(500); toast.info(`Activate Leads: ${(aLeads || []).length} encontrados`); const toInsert = (aLeads || []).flatMap((l: any) => { const items: any[] = []; const userId = l.assigned_to || l.created_by || profile?.id; if (l.status === "em_andamento") items.push({ source_module: "activate_leads", source_id: l.id, cliente_nome: l.nome, cliente_telefone: l.telefone, status_original: l.status, queue_type: "remarketing", company_id: l.company_id || companyId, user_id: userId, dias_envio_total: dias }); if (l.status === "contato_futuro" && l.data_proxima_operacao) items.push({ source_module: "activate_leads", source_id: l.id, cliente_nome: l.nome, cliente_telefone: l.telefone, status_original: l.status, queue_type: "contato_futuro", scheduled_date: l.data_proxima_operacao, company_id: l.company_id || companyId, user_id: userId, dias_envio_total: 1 }); return items; }); if (toInsert.length > 0) { const { error } = await supabase.from("sms_remarketing_queue").upsert(toInsert as any, { onConflict: "source_module,source_id,queue_type" }); if (!error) insertedByModule.activate_leads = toInsert.length; } }

      // Sync Propostas (Meus Clientes)
      {
        let q = supabase.from("propostas").select("id, \"Nome do cliente\", telefone, whatsapp, client_status, future_contact_date, company_id, created_by_id");
        q = q.in("client_status", ["contato_futuro", "aguardando_retorno"]);
        if (!isAdmin && companyId) q = q.eq("company_id", companyId);
        const { data: props } = await q.limit(500);
        toast.info(`Meus Clientes: ${(props || []).length} encontrados`);
        let skippedNoPhone = 0;
        const toInsert = (props || []).flatMap((p: any) => {
          const items: any[] = [];
          const nome = p["Nome do cliente"];
          const tel = p.telefone || p.whatsapp;
          if (!nome || !tel) { skippedNoPhone++; return []; }
          const userId = p.created_by_id || profile?.id;
          if (p.client_status === "contato_futuro" && p.future_contact_date) items.push({ source_module: "meus_clientes", source_id: String(p.id), cliente_nome: nome, cliente_telefone: tel, status_original: p.client_status, queue_type: "contato_futuro", scheduled_date: p.future_contact_date, company_id: p.company_id, user_id: userId, dias_envio_total: 1 });
          if (p.client_status === "aguardando_retorno") items.push({ source_module: "meus_clientes", source_id: String(p.id), cliente_nome: nome, cliente_telefone: tel, status_original: p.client_status, queue_type: "remarketing", company_id: p.company_id, user_id: userId, dias_envio_total: dias });
          return items;
        });
        if (skippedNoPhone > 0) toast.info(`${skippedNoPhone} propostas sem telefone ignoradas`);
        if (toInsert.length > 0) {
          const { error } = await supabase.from("sms_remarketing_queue").upsert(toInsert as any, { onConflict: "source_module,source_id,queue_type" });
          if (!error) insertedByModule.meus_clientes = toInsert.length;
        }
      }

      const total = Object.values(insertedByModule).reduce((a, b) => a + b, 0);
      if (total > 0) {
        toast.success(`Sincronizados: ${insertedByModule.leads_premium} Leads Premium, ${insertedByModule.activate_leads} Activate, ${insertedByModule.meus_clientes} Meus Clientes`);
      } else {
        toast.info("Nenhum registro novo para sincronizar");
      }
      fetchQueue();
    } catch (e: any) { toast.error("Erro na sincronização: " + e.message); } finally { setSyncing(false); }
  };

  const phoneCounts = new Map<string, number>();
  queue.forEach((item) => { if (item.automacao_status === "ativo" && item.queue_type === "remarketing") { const phone = (item.cliente_telefone || "").replace(/\D/g, ""); if (phone) phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1); } });

  const counters = {
    remarketing: queue.filter(i => i.queue_type === "remarketing" && i.automacao_status === "ativo").length,
    contato_futuro: queue.filter(i => i.queue_type === "contato_futuro" && i.automacao_status === "ativo").length,
    total: queue.length,
  };

  const moduleFilters = [
    { value: "all", label: "Todos Módulos" },
    { value: "leads_premium", label: "💎 Leads Premium" },
    { value: "activate_leads", label: "⚡ Activate" },
    { value: "meus_clientes", label: "👤 Meus Clientes" },
  ];

  const typeFilters = [
    { value: "all", label: "Todos" },
    { value: "remarketing", label: "🔄 Remarketing" },
    { value: "contato_futuro", label: "📅 Contato Futuro" },
  ];

  const statusFilters = [
    { value: "all", label: "Todos" },
    { value: "ativo", label: "Ativo" },
    { value: "pausado", label: "Pausado" },
    { value: "finalizado", label: "Finalizado" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Megaphone className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Remarketing SMS</h2>
            {!isAdmin && companyId && <Badge variant="outline" className="text-[10px]">Sua empresa</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleSync} disabled={syncing} className="gap-2 text-sm">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Sincronizar
          </Button>
          <Button variant="outline" size="icon" onClick={fetchQueue} className="h-9 w-9 rounded-lg">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-gradient-to-br from-violet-500/5 to-transparent p-3 text-center">
          <p className="text-2xl font-bold text-violet-600">{counters.remarketing}</p>
          <p className="text-[11px] text-muted-foreground">Remarketing Ativo</p>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-amber-500/5 to-transparent p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{counters.contato_futuro}</p>
          <p className="text-[11px] text-muted-foreground">Contato Futuro</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{counters.total}</p>
          <p className="text-[11px] text-muted-foreground">Total na Fila</p>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {moduleFilters.map((f) => (
            <button key={f.value} onClick={() => setFilterModule(f.value)} className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition-all border ${filterModule === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}>{f.label}</button>
          ))}
          <span className="w-px h-7 bg-border mx-1" />
          {typeFilters.map((f) => (
            <button key={f.value} onClick={() => setFilterType(f.value)} className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition-all border ${filterType === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}>{f.label}</button>
          ))}
          <span className="w-px h-7 bg-border mx-1" />
          {statusFilters.map((f) => (
            <button key={f.value} onClick={() => setFilterStatus(f.value)} className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition-all border ${filterStatus === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>
      ) : queue.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Megaphone className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Nenhum cliente na fila de remarketing</p>
          <p className="text-sm mt-1">Use "Sincronizar" para importar registros existentes</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Agendado</TableHead>
                <TableHead>Último</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((item, i) => {
                const badge = STATUS_BADGE[item.automacao_status] || STATUS_BADGE.ativo;
                const mod = MODULE_LABELS[item.source_module] || { label: item.source_module, emoji: "📦", color: "border-l-gray-400" };
                return (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.012 }} className={`border-b border-l-4 ${mod.color} transition-colors hover:bg-muted/30`}>
                    <TableCell className="font-medium text-sm">{item.cliente_nome}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {item.cliente_telefone}
                      {(() => { const n = (item.cliente_telefone || "").replace(/\D/g, ""); const c = phoneCounts.get(n) || 0; return c > 1 ? <Badge variant="outline" className="ml-1.5 text-[9px] px-1.5 py-0 border-amber-400 text-amber-700 bg-amber-50 font-medium">{c}×1 SMS</Badge> : null; })()}
                    </TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px] gap-1">{mod.emoji} {mod.label}</Badge></TableCell>
                    <TableCell><Badge variant={item.queue_type === "contato_futuro" ? "outline" : "default"} className="text-[10px]">{item.queue_type === "contato_futuro" ? "📅 Futuro" : "🔄 Remarketing"}</Badge></TableCell>
                    <TableCell><Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge></TableCell>
                    <TableCell className="text-xs">{item.queue_type === "contato_futuro" ? "—" : `${item.dias_enviados}/${item.dias_envio_total}`}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.scheduled_date ? new Date(item.scheduled_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.ultimo_envio_at ? new Date(item.ultimo_envio_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && item.automacao_status !== "finalizado" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleAutomacao(item)} disabled={togglingId === item.id} title={item.automacao_ativa ? "Pausar" : "Reativar"}>
                            {item.automacao_ativa ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleManualSend(item)} disabled={sendingId === item.id} title="Enviar SMS manual">
                          {sendingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};
