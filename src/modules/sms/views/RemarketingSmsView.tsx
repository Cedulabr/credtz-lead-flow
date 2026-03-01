import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Megaphone, Play, Pause, Send, RefreshCw, Loader2, Download, Calendar, CheckCircle, XCircle, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const MODULE_LABELS: Record<string, { label: string; emoji: string }> = {
  leads_premium: { label: "Leads Premium", emoji: "💎" },
  activate_leads: { label: "Activate Leads", emoji: "⚡" },
  meus_clientes: { label: "Meus Clientes", emoji: "👤" },
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
    let query = supabase
      .from("sms_remarketing_queue")
      .select("*")
      .order("created_at", { ascending: false });

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
    await supabase.from("sms_remarketing_queue")
      .update({ automacao_ativa: newAtiva, automacao_status: newStatus } as any)
      .eq("id", item.id);
    toast.success(newAtiva ? "Automação reativada" : "Automação pausada");
    fetchQueue();
    setTogglingId(null);
  };

  const handleManualSend = async (item: RemarketingItem) => {
    setSendingId(item.id);
    try {
      const templateKey = item.queue_type === "contato_futuro" ? "msg_contato_futuro" : "msg_remarketing";
      const { data: settings } = await supabase.from("sms_automation_settings")
        .select("setting_key, setting_value")
        .eq("setting_key", templateKey)
        .single();

      let message = settings?.setting_value || "Olá {{nome}}, temos uma oferta para você!";
      const firstName = (item.cliente_nome || "").trim().split(" ")[0];
      message = message.replace(/\{\{nome\}\}/gi, firstName);

      const { data, error } = await supabase.functions.invoke("send-sms", {
        body: {
          phone: item.cliente_telefone,
          message,
          send_type: "manual",
          contact_name: item.cliente_nome,
        },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success("SMS enviado com sucesso");
      } else {
        toast.error("Falha no envio: " + (data?.error || "erro"));
      }
      fetchQueue();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSendingId(null);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: settingsData } = await supabase
        .from("sms_automation_settings")
        .select("setting_key, setting_value")
        .eq("setting_key", "remarketing_dias")
        .single();
      const dias = parseInt(settingsData?.setting_value || "5");

      let inserted = 0;

      // Sync Leads Premium em_andamento + contato_futuro
      {
        let q = supabase.from("leads")
          .select("id, name, phone, status, future_contact_date, company_id, assigned_to, requested_by")
          .in("status", ["em_andamento", "contato_futuro"]);
        if (!isAdmin && companyId) q = q.eq("company_id", companyId);
        const { data: leads } = await q.limit(500);
        const toInsert = (leads || []).flatMap((l: any) => {
          const items: any[] = [];
          const userId = l.assigned_to || l.requested_by || profile?.id;
          if (l.status === "em_andamento") {
            items.push({
              source_module: "leads_premium", source_id: l.id, cliente_nome: l.name,
              cliente_telefone: l.phone, status_original: l.status, queue_type: "remarketing",
              company_id: l.company_id, user_id: userId, dias_envio_total: dias,
            });
          }
          if (l.status === "contato_futuro" && l.future_contact_date) {
            items.push({
              source_module: "leads_premium", source_id: l.id, cliente_nome: l.name,
              cliente_telefone: l.phone, status_original: l.status, queue_type: "contato_futuro",
              scheduled_date: l.future_contact_date, company_id: l.company_id, user_id: userId, dias_envio_total: 1,
            });
          }
          return items;
        });
        if (toInsert.length > 0) {
          const { error } = await supabase.from("sms_remarketing_queue").upsert(toInsert as any, { onConflict: "source_module,source_id,queue_type" });
          if (!error) inserted += toInsert.length;
        }
      }

      // Sync Activate Leads
      {
        let q = supabase.from("activate_leads")
          .select("id, nome, telefone, status, data_proxima_operacao, company_id, assigned_to, created_by")
          .in("status", ["em_andamento", "contato_futuro"]);
        if (!isAdmin && companyId) q = q.eq("company_id", companyId);
        const { data: aLeads } = await q.limit(500);
        const toInsert = (aLeads || []).flatMap((l: any) => {
          const items: any[] = [];
          const userId = l.assigned_to || l.created_by || profile?.id;
          if (l.status === "em_andamento") {
            items.push({
              source_module: "activate_leads", source_id: l.id, cliente_nome: l.nome,
              cliente_telefone: l.telefone, status_original: l.status, queue_type: "remarketing",
              company_id: l.company_id, user_id: userId, dias_envio_total: dias,
            });
          }
          if (l.status === "contato_futuro" && l.data_proxima_operacao) {
            items.push({
              source_module: "activate_leads", source_id: l.id, cliente_nome: l.nome,
              cliente_telefone: l.telefone, status_original: l.status, queue_type: "contato_futuro",
              scheduled_date: l.data_proxima_operacao, company_id: l.company_id, user_id: userId, dias_envio_total: 1,
            });
          }
          return items;
        });
        if (toInsert.length > 0) {
          const { error } = await supabase.from("sms_remarketing_queue").upsert(toInsert as any, { onConflict: "source_module,source_id,queue_type" });
          if (!error) inserted += toInsert.length;
        }
      }

      // Sync Propostas (Meus Clientes)
      {
        let q = supabase.from("propostas")
          .select("id, \"Nome do cliente\", telefone, whatsapp, status, pipeline_stage, future_contact_date, company_id, created_by_id")
          .or("status.eq.contato_futuro,pipeline_stage.in.(proposta_enviada,proposta_digitada)");
        if (!isAdmin && companyId) q = q.eq("company_id", companyId);
        const { data: props } = await q.limit(500);
        const toInsert = (props || []).flatMap((p: any) => {
          const items: any[] = [];
          const nome = p["Nome do cliente"];
          const tel = p.telefone || p.whatsapp;
          if (!nome || !tel) return [];
          const userId = p.created_by_id || profile?.id;
          if (p.status === "contato_futuro" && p.future_contact_date) {
            items.push({
              source_module: "meus_clientes", source_id: String(p.id), cliente_nome: nome,
              cliente_telefone: tel, status_original: p.status, queue_type: "contato_futuro",
              scheduled_date: p.future_contact_date, company_id: p.company_id, user_id: userId, dias_envio_total: 1,
            });
          }
          if (["proposta_enviada", "proposta_digitada"].includes(p.pipeline_stage)) {
            items.push({
              source_module: "meus_clientes", source_id: String(p.id), cliente_nome: nome,
              cliente_telefone: tel, status_original: p.pipeline_stage || p.status, queue_type: "remarketing",
              company_id: p.company_id, user_id: userId, dias_envio_total: dias,
            });
          }
          return items;
        });
        if (toInsert.length > 0) {
          const { error } = await supabase.from("sms_remarketing_queue").upsert(toInsert as any, { onConflict: "source_module,source_id,queue_type" });
          if (!error) inserted += toInsert.length;
        }
      }

      if (inserted > 0) {
        toast.success(`${inserted} registros sincronizados`);
      } else {
        toast.info("Nenhum registro novo para sincronizar");
      }
      fetchQueue();
    } catch (e: any) {
      toast.error("Erro na sincronização: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  // Phone grouping for active remarketing
  const phoneCounts = new Map<string, number>();
  queue.forEach((item) => {
    if (item.automacao_status === "ativo" && item.queue_type === "remarketing") {
      const phone = (item.cliente_telefone || "").replace(/\D/g, "");
      if (phone) phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1);
    }
  });

  const counters = {
    remarketing: queue.filter(i => i.queue_type === "remarketing" && i.automacao_status === "ativo").length,
    contato_futuro: queue.filter(i => i.queue_type === "contato_futuro" && i.automacao_status === "ativo").length,
    total: queue.length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Remarketing SMS
          {!isAdmin && companyId && (
            <Badge variant="outline" className="text-[10px]">Sua empresa</Badge>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleSync} disabled={syncing} className="gap-2 text-sm">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Sincronizar
          </Button>
          <Button variant="outline" size="icon" onClick={fetchQueue} className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-primary">{counters.remarketing}</p>
          <p className="text-[11px] text-muted-foreground">Remarketing Ativo</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{counters.contato_futuro}</p>
          <p className="text-[11px] text-muted-foreground">Contato Futuro</p>
        </div>
        <div className="rounded-xl border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{counters.total}</p>
          <p className="text-[11px] text-muted-foreground">Total na Fila</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Módulos</SelectItem>
            <SelectItem value="leads_premium">💎 Leads Premium</SelectItem>
            <SelectItem value="activate_leads">⚡ Activate Leads</SelectItem>
            <SelectItem value="meus_clientes">👤 Meus Clientes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Tipos</SelectItem>
            <SelectItem value="remarketing">Remarketing</SelectItem>
            <SelectItem value="contato_futuro">Contato Futuro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="pausado">Pausado</SelectItem>
            <SelectItem value="finalizado">Finalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>
      ) : queue.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum cliente na fila de remarketing</p>
          <p className="text-sm">Use "Sincronizar" para importar registros existentes</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Módulo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Automação</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Data Agendada</TableHead>
                <TableHead>Último Envio</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((item, i) => {
                const badge = STATUS_BADGE[item.automacao_status] || STATUS_BADGE.ativo;
                const mod = MODULE_LABELS[item.source_module] || { label: item.source_module, emoji: "📦" };
                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.015 }}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <TableCell className="font-medium text-sm">{item.cliente_nome}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {item.cliente_telefone}
                      {(() => {
                        const normalized = (item.cliente_telefone || "").replace(/\D/g, "");
                        const count = phoneCounts.get(normalized) || 0;
                        return count > 1 ? (
                          <Badge variant="outline" className="ml-1.5 text-[9px] px-1.5 py-0 border-amber-400 text-amber-700 bg-amber-50 font-medium">
                            {count} registros · 1 SMS
                          </Badge>
                        ) : null;
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] gap-1">
                        {mod.emoji} {mod.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.queue_type === "contato_futuro" ? "outline" : "default"} className="text-[10px]">
                        {item.queue_type === "contato_futuro" ? "📅 Contato Futuro" : "🔄 Remarketing"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {item.queue_type === "contato_futuro" ? "—" : `${item.dias_enviados}/${item.dias_envio_total} dias`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.scheduled_date ? (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.scheduled_date + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {item.ultimo_envio_at
                        ? new Date(item.ultimo_envio_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && item.automacao_status !== "finalizado" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => toggleAutomacao(item)} disabled={togglingId === item.id}
                            title={item.automacao_ativa ? "Pausar" : "Reativar"}>
                            {item.automacao_ativa ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => handleManualSend(item)} disabled={sendingId === item.id}
                          title="Enviar SMS manual">
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
