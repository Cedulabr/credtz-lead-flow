import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Phone, Play, Pause, Send, RefreshCw, Loader2, Download, CheckCircle, XCircle, CircleDollarSign, CircleDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCompany } from "../hooks/useUserCompany";
import { toast } from "sonner";

interface QueueItem {
  id: string;
  televendas_id: string;
  cliente_nome: string;
  cliente_telefone: string;
  tipo_operacao: string;
  status_proposta: string;
  automacao_status: string;
  automacao_ativa: boolean;
  dias_envio_total: number;
  dias_enviados: number;
  ultimo_envio_at: string | null;
  created_at: string;
}

interface SmsStatus {
  status: string;
  error_message: string | null;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ativo: { label: "Ativo", variant: "default" },
  pausado: { label: "Pausado", variant: "secondary" },
  finalizado: { label: "Finalizado", variant: "outline" },
};

function SmsStatusBadge({ smsStatus }: { smsStatus?: SmsStatus }) {
  if (!smsStatus) return <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><CircleDashed className="h-3 w-3" /> Sem envio</span>;
  if (smsStatus.status === "sent" || smsStatus.status === "delivered") return <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600"><CheckCircle className="h-3 w-3" /> Enviado</span>;
  if (smsStatus.status === "failed") {
    const isCredit = smsStatus.error_message?.startsWith("CREDITO_INSUFICIENTE");
    if (isCredit) return <span className="inline-flex items-center gap-1 text-[10px] text-amber-600" title={smsStatus.error_message || ""}><CircleDollarSign className="h-3 w-3" /> Sem crédito</span>;
    return <span className="inline-flex items-center gap-1 text-[10px] text-destructive" title={smsStatus.error_message || ""}><XCircle className="h-3 w-3" /> Falhou</span>;
  }
  return <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"><CircleDashed className="h-3 w-3" /> {smsStatus.status}</span>;
}

export const TelevendasSmsView = () => {
  const { user, profile } = useAuth();
  const { companyId, isAdmin, loading: companyLoading } = useUserCompany();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [smsStatuses, setSmsStatuses] = useState<Record<string, SmsStatus>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const fetchQueue = useCallback(async () => {
    if (companyLoading) return;
    setLoading(true);
    let query = supabase.from("sms_televendas_queue").select("*").order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("automacao_status", filter);
    if (!isAdmin && companyId) query = query.eq("company_id", companyId);
    const { data } = await query.limit(200);
    const items = (data as any[]) || [];
    setQueue(items);

    const tvIds = items.map((i: QueueItem) => i.televendas_id).filter(Boolean);
    if (tvIds.length > 0) {
      const { data: historyData } = await supabase.from("sms_history").select("televendas_id, status, error_message").in("televendas_id", tvIds).order("created_at", { ascending: false });
      const statusMap: Record<string, SmsStatus> = {};
      ((historyData as any[]) || []).forEach((h: any) => { if (h.televendas_id && !statusMap[h.televendas_id]) statusMap[h.televendas_id] = { status: h.status, error_message: h.error_message }; });
      setSmsStatuses(statusMap);
    }
    setLoading(false);
  }, [filter, isAdmin, companyId, companyLoading]);

  useEffect(() => { if (!companyLoading) fetchQueue(); }, [fetchQueue, companyLoading]);

  const toggleAutomacao = async (item: QueueItem) => {
    setTogglingId(item.id);
    const newAtiva = !item.automacao_ativa;
    const newStatus = newAtiva ? "ativo" : "pausado";
    await supabase.from("sms_televendas_queue").update({ automacao_ativa: newAtiva, automacao_status: newStatus } as any).eq("id", item.id);
    toast.success(newAtiva ? "Automação reativada" : "Automação pausada");
    fetchQueue();
    setTogglingId(null);
  };

  const handleManualSend = async (item: QueueItem) => {
    setSendingId(item.id);
    try {
      const { data: settings } = await supabase.from("sms_automation_settings").select("setting_key, setting_value").eq("setting_key", "msg_em_andamento").single();
      let message = settings?.setting_value || "Olá {{nome}}, sua proposta está em andamento.";
      const firstName = (item.cliente_nome || "").trim().split(" ")[0];
      message = message.replace(/\{\{nome\}\}/gi, firstName);
      message = message.replace(/\{\{tipo_operacao\}\}/gi, item.tipo_operacao || "");
      const { data, error } = await supabase.functions.invoke("send-sms", { body: { phone: item.cliente_telefone, message, televendas_id: item.televendas_id, send_type: "manual", contact_name: item.cliente_nome } });
      if (error) throw error;
      if (data?.success) toast.success("SMS enviado com sucesso");
      else toast.error("Falha no envio: " + (data?.error || "erro"));
      fetchQueue();
    } catch (e: any) { toast.error("Erro: " + e.message); } finally { setSendingId(null); }
  };

  const handlePullProposals = async () => {
    setImporting(true);
    try {
      const { data: settingsData } = await supabase.from("sms_automation_settings").select("setting_key, setting_value").eq("setting_key", "automacao_em_andamento_dias").single();
      const dias = parseInt(settingsData?.setting_value || "5");
      const { data: existingQueue } = await supabase.from("sms_televendas_queue").select("televendas_id");
      const existingIds = new Set((existingQueue as any[] || []).map((q: any) => q.televendas_id));
      let proposalsQuery = supabase.from("televendas").select("id, nome, telefone, tipo_operacao, status, company_id, user_id").in("status", ["em_andamento", "aguardando", "digitado", "solicitar_digitacao"]).ilike("tipo_operacao", "%portabilidade%").limit(500);
      if (!isAdmin && companyId) proposalsQuery = proposalsQuery.eq("company_id", companyId);
      const { data: proposals, error } = await proposalsQuery;
      if (error) throw error;
      const toInsert = (proposals || []).filter((p: any) => !existingIds.has(p.id)).map((p: any) => ({ televendas_id: p.id, cliente_nome: p.nome, cliente_telefone: p.telefone, tipo_operacao: p.tipo_operacao, status_proposta: p.status, company_id: p.company_id, user_id: p.user_id, dias_envio_total: dias }));
      if (toInsert.length === 0) { toast.info("Nenhuma proposta nova para importar"); return; }
      const { error: insertError } = await supabase.from("sms_televendas_queue").insert(toInsert as any);
      if (insertError) throw insertError;
      toast.success(`${toInsert.length} propostas importadas`);
      fetchQueue();
    } catch (e: any) { toast.error("Erro ao importar: " + e.message); } finally { setImporting(false); }
  };

  const phoneCounts = new Map<string, number>();
  queue.forEach((item) => { if (item.automacao_status === "ativo") { const phone = (item.cliente_telefone || "").replace(/\D/g, ""); if (phone) phoneCounts.set(phone, (phoneCounts.get(phone) || 0) + 1); } });

  const statusFilters = [
    { value: "all", label: "Todos", count: queue.length },
    { value: "ativo", label: "Ativos", count: queue.filter(i => i.automacao_status === "ativo").length },
    { value: "pausado", label: "Pausados", count: queue.filter(i => i.automacao_status === "pausado").length },
    { value: "finalizado", label: "Finalizados", count: queue.filter(i => i.automacao_status === "finalizado").length },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Phone className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Notificação SMS Televendas</h2>
            {!isAdmin && companyId && <Badge variant="outline" className="text-[10px]">Sua empresa</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handlePullProposals} disabled={importing} className="gap-2 text-sm">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Puxar Propostas
          </Button>
          <Button variant="outline" size="icon" onClick={fetchQueue} className="h-9 w-9 rounded-lg">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all border ${filter === f.value ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}
          >
            {f.label}
            <span className={`text-[10px] font-bold ${filter === f.value ? "text-primary-foreground/80" : "text-muted-foreground/60"}`}>{f.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-primary" /></div>
      ) : queue.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Phone className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Nenhum cliente na fila de SMS</p>
          <p className="text-sm mt-1">Use "Puxar Propostas" para importar propostas em andamento</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Cliente</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Automação</TableHead>
                <TableHead>Envio</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Último</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queue.map((item, i) => {
                const badge = STATUS_BADGE[item.automacao_status] || STATUS_BADGE.ativo;
                return (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.015 }} className="border-b transition-colors hover:bg-muted/30">
                    <TableCell className="font-medium text-sm">{item.cliente_nome}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {item.cliente_telefone}
                      {(() => { const n = (item.cliente_telefone || "").replace(/\D/g, ""); const c = phoneCounts.get(n) || 0; return c > 1 ? <Badge variant="outline" className="ml-1.5 text-[9px] px-1.5 py-0 border-amber-400 text-amber-700 bg-amber-50 font-medium">{c}×1 SMS</Badge> : null; })()}
                    </TableCell>
                    <TableCell className="text-xs">{item.tipo_operacao}</TableCell>
                    <TableCell className="text-xs">{item.status_proposta}</TableCell>
                    <TableCell><Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge></TableCell>
                    <TableCell><SmsStatusBadge smsStatus={smsStatuses[item.televendas_id]} /></TableCell>
                    <TableCell className="text-xs">{item.dias_enviados}/{item.dias_envio_total}</TableCell>
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
