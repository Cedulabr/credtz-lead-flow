import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Send, Rocket, Users, Zap, Loader2, RefreshCw, Trash2, AlertTriangle, MessageSquare, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCompany } from "../hooks/useUserCompany";
import { toast } from "sonner";
import {
  SmsCampaign,
  SmsTemplate,
  SmsContactList,
  CAMPAIGN_STATUS_CONFIG,
  LEAD_SOURCE_OPTIONS,
  LEAD_STATUS_FILTERS,
} from "../types";

interface CampaignsViewProps {
  campaigns: SmsCampaign[];
  templates: SmsTemplate[];
  contactLists: SmsContactList[];
  onRefresh: () => void;
  onRefreshLists: () => void;
}

export const CampaignsView = ({
  campaigns,
  templates,
  contactLists,
  onRefresh,
  onRefreshLists,
}: CampaignsViewProps) => {
  const { user, isAdmin } = useAuth();
  const { companyId } = useUserCompany();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [smsCredits, setSmsCredits] = useState<number | null>(null);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<SmsCampaign | null>(null);
  // Mark failed state
  const [markFailedTarget, setMarkFailedTarget] = useState<SmsCampaign | null>(null);

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("none");
  const [messageContent, setMessageContent] = useState("");
  const [selectedList, setSelectedList] = useState("none");
  const [contactSource, setContactSource] = useState("list");

  // Lead import state
  const [leadSource, setLeadSource] = useState("activate_leads");
  const [leadStatusFilter, setLeadStatusFilter] = useState("all");
  const [importingLeads, setImportingLeads] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Fetch SMS credits
  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) return;
      const { data, error } = await supabase.rpc('get_user_sms_credits', { target_user_id: user.id });
      if (!error) setSmsCredits(data ?? 0);
    };
    fetchCredits();
  }, [user, campaigns]);

  // Apply template content
  useEffect(() => {
    if (selectedTemplate !== "none") {
      const t = templates.find((t) => t.id === selectedTemplate);
      if (t) setMessageContent(t.content);
    }
  }, [selectedTemplate, templates]);

  const handleImportLeads = async () => {
    if (!isAdmin && !companyId) {
      toast.error("Empresa não identificada. Aguarde ou entre em contato com o suporte.");
      return;
    }
    setImportingLeads(true);
    try {
      let leads: { name: string; phone: string; source_id: string }[] = [];
      const statusMap: Record<string, Record<string, string[]>> = {
        activate_leads: {
          novo: ["novo", "new"], aguardando: ["aguardando", "aguardando_contato"],
          em_andamento: ["em_andamento", "contatado", "interessado"],
          fechado: ["fechado", "convertido", "sem_interesse", "recusado"],
        },
        leads_premium: {
          novo: ["new_lead"], aguardando: ["aguardando", "contato_futuro"],
          em_andamento: ["em_andamento", "interessado", "simulacao"],
          fechado: ["fechado", "convertido", "sem_interesse"],
        },
        televendas: {
          novo: ["solicitar_digitacao"], aguardando: ["proposta_pendente", "pago_aguardando", "cancelado_aguardando"],
          em_andamento: ["em_andamento", "devolvido"],
          fechado: ["proposta_paga", "proposta_cancelada"],
        },
      };

      if (leadSource === "activate_leads") {
        let query = supabase.from("activate_leads").select("id, nome, telefone, status");
        if (!isAdmin && companyId) query = query.eq("company_id", companyId);
        if (leadStatusFilter !== "all") {
          const statuses = statusMap.activate_leads[leadStatusFilter] || [];
          if (statuses.length) query = query.in("status", statuses);
        }
        const { data } = await query.limit(500);
        leads = (data || []).map((l) => ({ name: l.nome, phone: l.telefone.replace(/\D/g, ""), source_id: l.id }));
      } else if (leadSource === "leads_premium") {
        let query = supabase.from("leads").select("id, name, phone, status");
        if (!isAdmin && companyId) query = query.eq("company_id", companyId);
        if (leadStatusFilter !== "all") {
          const statuses = statusMap.leads_premium[leadStatusFilter] || [];
          if (statuses.length) query = query.in("status", statuses);
        }
        const { data } = await query.limit(500);
        leads = (data || []).map((l: any) => ({ name: l.name, phone: (l.phone || "").replace(/\D/g, ""), source_id: l.id }));
      } else if (leadSource === "televendas") {
        let query = supabase.from("televendas").select("id, nome, telefone, status");
        if (!isAdmin && companyId) query = query.eq("company_id", companyId);
        if (leadStatusFilter !== "all") {
          const statuses = statusMap.televendas[leadStatusFilter] || [];
          if (statuses.length) query = query.in("status", statuses);
        }
        const { data } = await query.limit(500);
        leads = (data || []).map((l: any) => ({ name: l.nome, phone: (l.telefone || "").replace(/\D/g, ""), source_id: l.id }));
      }

      leads = leads.filter((l) => l.phone.length >= 10);
      if (leads.length === 0) { toast.error("Nenhum lead encontrado"); return; }

      const listName = `${LEAD_SOURCE_OPTIONS.find((o) => o.value === leadSource)?.label} - ${new Date().toLocaleDateString("pt-BR")}`;
      const { data: listData, error: listError } = await supabase
        .from("sms_contact_lists").insert({ name: listName, created_by: user?.id } as any).select("id").single();
      if (listError) throw listError;

      const contacts = leads.map((l) => ({ list_id: listData.id, name: l.name, phone: l.phone, source: leadSource, source_id: l.source_id }));
      const { error: contactsError } = await supabase.from("sms_contacts").insert(contacts as any);
      if (contactsError) throw contactsError;

      setImportedCount(leads.length);
      setSelectedList(listData.id);
      setContactSource("list");
      onRefreshLists();
      toast.success(`${leads.length} leads importados`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao importar leads");
    } finally {
      setImportingLeads(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim() || !messageContent.trim()) { toast.error("Preencha nome e mensagem"); return; }
    if (selectedList === "none") { toast.error("Selecione uma lista"); return; }
    setSaving(true);
    try {
      const list = contactLists.find((l) => l.id === selectedList);
      const { error } = await supabase.from("sms_campaigns").insert({
        name: campaignName.trim(), template_id: selectedTemplate !== "none" ? selectedTemplate : null,
        message_content: messageContent.trim(), contact_list_id: selectedList,
        total_recipients: list?.contact_count || 0, created_by: user?.id, status: "draft",
      } as any);
      if (error) throw error;
      toast.success("Campanha criada");
      setDialogOpen(false);
      resetForm();
      onRefresh();
    } catch { toast.error("Erro ao criar campanha"); } finally { setSaving(false); }
  };

  const resetForm = () => {
    setCampaignName(""); setSelectedTemplate("none"); setMessageContent("");
    setSelectedList("none"); setContactSource("list"); setImportedCount(0);
  };

  const handleSendCampaign = async (campaignId: string) => {
    setSendingCampaignId(campaignId);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", { body: { campaign_id: campaignId } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }
      toast.success(`Disparo concluído: ${data.sent} enviados, ${data.failed} falhas`);
      onRefresh();
    } catch (e: any) {
      toast.error("Erro ao disparar: " + (e.message || "erro desconhecido"));
    } finally {
      setSendingCampaignId(null);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!deleteTarget) return;
    try {
      // Delete history records first
      await supabase.from("sms_history").delete().eq("campaign_id", deleteTarget.id);
      const { error } = await supabase.from("sms_campaigns").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Campanha excluída");
      setDeleteTarget(null);
      onRefresh();
    } catch { toast.error("Erro ao excluir campanha"); }
  };

  const handleMarkFailed = async () => {
    if (!markFailedTarget) return;
    try {
      const { error } = await supabase.from("sms_campaigns")
        .update({ status: "failed", completed_at: new Date().toISOString() } as any)
        .eq("id", markFailedTarget.id);
      if (error) throw error;
      toast.success("Campanha marcada como falhou");
      setMarkFailedTarget(null);
      onRefresh();
    } catch { toast.error("Erro ao atualizar"); }
  };

  const STATUS_PT: Record<string, string> = { delivered: "Entregue", sent: "Enviado", failed: "Falhou", pending: "Pendente" };
  const STATUS_ORDER: Record<string, number> = { delivered: 0, sent: 1, pending: 2, failed: 3 };

  const handleDownloadReport = async (campaignId: string, campaignName: string) => {
    setDownloadingReportId(campaignId);
    try {
      const { data, error } = await supabase
        .from("sms_history")
        .select("contact_name, phone, status, error_message, send_type, sent_at, created_at")
        .eq("campaign_id", campaignId)
        .order("status");
      if (error) throw error;
      if (!data || data.length === 0) { toast.info("Nenhum registro encontrado"); return; }

      const sorted = [...data].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
      const header = "Nome;Telefone;Status;Erro;Provedor;Data Envio";
      const rows = sorted.map((h) => {
        const dt = h.sent_at || h.created_at;
        return [
          h.contact_name || "",
          h.phone,
          STATUS_PT[h.status] || h.status,
          (h.error_message || "").replace(/;/g, ","),
          h.send_type || "",
          dt ? new Date(dt).toLocaleString("pt-BR") : "",
        ].join(";");
      });
      const csv = "\uFEFF" + header + "\n" + rows.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safeName = campaignName.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 40);
      a.href = url;
      a.download = `relatorio-${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Relatório com ${data.length} registros baixado`);
    } catch { toast.error("Erro ao gerar relatório"); } finally { setDownloadingReportId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Rocket className="h-5 w-5 text-emerald-500" />
          </div>
          <h2 className="text-lg font-semibold">Campanhas SMS</h2>
          {smsCredits !== null && (
            <Badge variant="outline" className="gap-1.5 text-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              {isAdmin ? '∞' : smsCredits} créditos
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onRefresh} className="gap-2 text-sm">
            <RefreshCw className="h-4 w-4" /> Atualizar
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Campanha
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Rocket className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Nenhuma campanha criada</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {campaigns.map((c, index) => {
              const statusConfig = CAMPAIGN_STATUS_CONFIG[c.status] || CAMPAIGN_STATUS_CONFIG.draft;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{statusConfig.emoji}</span>
                        <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                        <span className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{c.message_content}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                        <span>👥 {c.total_recipients} destinatários</span>
                        <span>✅ {c.sent_count} enviados</span>
                        {c.failed_count > 0 && <span className="text-red-500">❌ {c.failed_count} falhas</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(c.status === "draft" || c.status === "scheduled") && (
                          <Button size="sm" onClick={() => handleSendCampaign(c.id)} disabled={sendingCampaignId === c.id} className="gap-1.5 text-xs">
                            {sendingCampaignId === c.id ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Enviando...</>
                            ) : (
                              <><Send className="h-3 w-3" /> Disparar</>
                            )}
                          </Button>
                        )}
                        {(c.status === "completed" || c.status === "failed" || c.status === "sending") && (
                          <Button size="sm" variant="outline" onClick={() => handleDownloadReport(c.id, c.name)} disabled={downloadingReportId === c.id} className="gap-1.5 text-xs">
                            {downloadingReportId === c.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            Relatório
                          </Button>
                        )}
                        {c.status === "sending" && isAdmin && (
                          <Button size="sm" variant="outline" onClick={() => setMarkFailedTarget(c)} className="gap-1 text-xs text-amber-600 border-amber-300">
                            <AlertTriangle className="h-3 w-3" /> Marcar Falhou
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(c)} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a campanha "{deleteTarget?.name}"? O histórico de envios vinculado também será removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Failed Confirmation */}
      <AlertDialog open={!!markFailedTarget} onOpenChange={() => setMarkFailedTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar como Falhou</AlertDialogTitle>
            <AlertDialogDescription>
              A campanha "{markFailedTarget?.name}" será marcada como falhou. Use isso para campanhas travadas no status "Enviando".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkFailed}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Campaign Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Nova Campanha SMS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            <div>
              <Label>Nome da Campanha</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Ex: Promo Março 2026" />
            </div>
            <div>
              <Label>Template (opcional)</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger><SelectValue placeholder="Selecionar template" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {templates.map((t) => (<SelectItem key={t.id} value={t.id}>📝 {t.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mensagem</Label>
              <Textarea value={messageContent} onChange={(e) => setMessageContent(e.target.value)} placeholder="Digite a mensagem..." rows={3} />
              <p className="text-[11px] text-muted-foreground mt-1">
                {messageContent.length}/160 caracteres
                {messageContent.length > 160 && ` (${Math.ceil(messageContent.length / 153)} segmentos)`}
              </p>
            </div>
            <div>
              <Label className="mb-2 block">Origem dos Contatos</Label>
              <Tabs value={contactSource} onValueChange={setContactSource}>
                <TabsList className="w-full grid grid-cols-2">
                  <TabsTrigger value="list" className="gap-1.5"><Users className="h-3.5 w-3.5" /> Lista</TabsTrigger>
                  <TabsTrigger value="leads" className="gap-1.5"><Zap className="h-3.5 w-3.5" /> Leads</TabsTrigger>
                </TabsList>
                <TabsContent value="list" className="mt-3">
                  <Select value={selectedList} onValueChange={setSelectedList}>
                    <SelectTrigger><SelectValue placeholder="Selecionar lista" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione uma lista</SelectItem>
                      {contactLists.map((l) => (<SelectItem key={l.id} value={l.id}>👥 {l.name} ({l.contact_count})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </TabsContent>
                <TabsContent value="leads" className="mt-3 space-y-3">
                  <div>
                    <Label className="text-xs">Módulo de Origem</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {LEAD_SOURCE_OPTIONS.map((opt) => (
                        <Button key={opt.value} variant={leadSource === opt.value ? "default" : "outline"} size="sm"
                          onClick={() => setLeadSource(opt.value)} className="text-xs gap-1">
                          {opt.icon} {opt.label.split(" ")[0]}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Filtrar por Status</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <Button variant={leadStatusFilter === "all" ? "default" : "outline"} size="sm"
                        onClick={() => setLeadStatusFilter("all")} className="text-xs">Todos</Button>
                      {LEAD_STATUS_FILTERS.map((s) => (
                        <Button key={s.value} variant={leadStatusFilter === s.value ? "default" : "outline"} size="sm"
                          onClick={() => setLeadStatusFilter(s.value)} className="text-xs">{s.label}</Button>
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleImportLeads} disabled={importingLeads} className="w-full gap-2" variant="secondary">
                    <Zap className="h-4 w-4" /> {importingLeads ? "Importando..." : "Importar Leads"}
                  </Button>
                  {importedCount > 0 && <p className="text-xs text-green-600 font-medium">✅ {importedCount} leads importados</p>}
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateCampaign} disabled={saving} className="gap-2">
              <Send className="h-4 w-4" /> {saving ? "Criando..." : "Criar Campanha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
