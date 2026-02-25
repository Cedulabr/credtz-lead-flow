import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Send, Rocket, FileText, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("none");
  const [messageContent, setMessageContent] = useState("");
  const [selectedList, setSelectedList] = useState("none");
  const [contactSource, setContactSource] = useState("list"); // list | leads

  // Lead import state
  const [leadSource, setLeadSource] = useState("activate_leads");
  const [leadStatusFilter, setLeadStatusFilter] = useState("all");
  const [importingLeads, setImportingLeads] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Apply template content
  useEffect(() => {
    if (selectedTemplate !== "none") {
      const t = templates.find((t) => t.id === selectedTemplate);
      if (t) setMessageContent(t.content);
    }
  }, [selectedTemplate, templates]);

  const handleImportLeads = async () => {
    setImportingLeads(true);
    try {
      let leads: { name: string; phone: string; source_id: string }[] = [];

      // Status mapping per source
      const statusMap: Record<string, Record<string, string[]>> = {
        activate_leads: {
          novo: ["novo", "new"],
          aguardando: ["aguardando", "aguardando_contato"],
          em_andamento: ["em_andamento", "contatado", "interessado"],
          fechado: ["fechado", "convertido", "sem_interesse", "recusado"],
        },
        leads_premium: {
          novo: ["new_lead"],
          aguardando: ["aguardando", "contato_futuro"],
          em_andamento: ["em_andamento", "interessado", "simulacao"],
          fechado: ["fechado", "convertido", "sem_interesse"],
        },
        televendas: {
          novo: ["solicitar_digitacao"],
          aguardando: ["proposta_pendente", "pago_aguardando", "cancelado_aguardando"],
          em_andamento: ["em_andamento", "devolvido"],
          fechado: ["proposta_paga", "proposta_cancelada"],
        },
      };

      if (leadSource === "activate_leads") {
        let query = supabase.from("activate_leads").select("id, nome, telefone, status");
        if (leadStatusFilter !== "all") {
          const statuses = statusMap.activate_leads[leadStatusFilter] || [];
          if (statuses.length) query = query.in("status", statuses);
        }
        const { data } = await query.limit(500);
        leads = (data || []).map((l) => ({
          name: l.nome,
          phone: l.telefone.replace(/\D/g, ""),
          source_id: l.id,
        }));
      } else if (leadSource === "leads_premium") {
        let query = supabase.from("leads").select("id, name, phone, status");
        if (leadStatusFilter !== "all") {
          const statuses = statusMap.leads_premium[leadStatusFilter] || [];
          if (statuses.length) query = query.in("status", statuses);
        }
        const { data } = await query.limit(500);
        leads = (data || []).map((l: any) => ({
          name: l.name,
          phone: (l.phone || "").replace(/\D/g, ""),
          source_id: l.id,
        }));
      } else if (leadSource === "televendas") {
        let query = supabase.from("televendas").select("id, nome, telefone, status");
        if (leadStatusFilter !== "all") {
          const statuses = statusMap.televendas[leadStatusFilter] || [];
          if (statuses.length) query = query.in("status", statuses);
        }
        const { data } = await query.limit(500);
        leads = (data || []).map((l: any) => ({
          name: l.nome,
          phone: (l.telefone || "").replace(/\D/g, ""),
          source_id: l.id,
        }));
      }

      // Filter valid phones
      leads = leads.filter((l) => l.phone.length >= 10);

      if (leads.length === 0) {
        toast.error("Nenhum lead encontrado com os filtros selecionados");
        return;
      }

      // Create a contact list
      const listName = `${LEAD_SOURCE_OPTIONS.find((o) => o.value === leadSource)?.label} - ${new Date().toLocaleDateString("pt-BR")}`;
      const { data: listData, error: listError } = await supabase
        .from("sms_contact_lists")
        .insert({ name: listName, created_by: user?.id } as any)
        .select("id")
        .single();
      if (listError) throw listError;

      // Insert contacts
      const contacts = leads.map((l) => ({
        list_id: listData.id,
        name: l.name,
        phone: l.phone,
        source: leadSource,
        source_id: l.source_id,
      }));

      const { error: contactsError } = await supabase.from("sms_contacts").insert(contacts as any);
      if (contactsError) throw contactsError;

      setImportedCount(leads.length);
      setSelectedList(listData.id);
      setContactSource("list");
      onRefreshLists();
      toast.success(`${leads.length} leads importados para a lista "${listName}"`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao importar leads");
    } finally {
      setImportingLeads(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignName.trim() || !messageContent.trim()) {
      toast.error("Preencha nome e mensagem");
      return;
    }
    if (selectedList === "none") {
      toast.error("Selecione uma lista de contatos");
      return;
    }
    setSaving(true);
    try {
      const list = contactLists.find((l) => l.id === selectedList);
      const { error } = await supabase.from("sms_campaigns").insert({
        name: campaignName.trim(),
        template_id: selectedTemplate !== "none" ? selectedTemplate : null,
        message_content: messageContent.trim(),
        contact_list_id: selectedList,
        total_recipients: list?.contact_count || 0,
        created_by: user?.id,
        status: "draft",
      } as any);
      if (error) throw error;
      toast.success("Campanha criada como rascunho");
      setDialogOpen(false);
      resetForm();
      onRefresh();
    } catch {
      toast.error("Erro ao criar campanha");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setCampaignName("");
    setSelectedTemplate("none");
    setMessageContent("");
    setSelectedList("none");
    setContactSource("list");
    setImportedCount(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Campanhas SMS</h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Campanha
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Rocket className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Nenhuma campanha criada</p>
          <p className="text-sm">Crie uma campanha para disparar SMS em massa</p>
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
                    <div className="text-right text-[11px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" />
              Nova Campanha SMS
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
                  <SelectItem value="none">Nenhum (escrever manualmente)</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>📝 {t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mensagem</Label>
              <Textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Digite a mensagem do SMS..."
                rows={3}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                {messageContent.length}/160 caracteres
                {messageContent.length > 160 && ` (${Math.ceil(messageContent.length / 153)} segmentos)`}
              </p>
            </div>

            {/* Contact Source */}
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
                      {contactLists.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          👥 {l.name} ({l.contact_count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TabsContent>

                <TabsContent value="leads" className="mt-3 space-y-3">
                  <div>
                    <Label className="text-xs">Módulo de Origem</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {LEAD_SOURCE_OPTIONS.map((opt) => (
                        <Button
                          key={opt.value}
                          variant={leadSource === opt.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setLeadSource(opt.value)}
                          className="text-xs gap-1"
                        >
                          {opt.icon} {opt.label.split(" ")[0]}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Filtrar por Status</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <Button
                        variant={leadStatusFilter === "all" ? "default" : "outline"}
                        size="sm" onClick={() => setLeadStatusFilter("all")}
                        className="text-xs"
                      >
                        Todos
                      </Button>
                      {LEAD_STATUS_FILTERS.map((s) => (
                        <Button
                          key={s.value}
                          variant={leadStatusFilter === s.value ? "default" : "outline"}
                          size="sm" onClick={() => setLeadStatusFilter(s.value)}
                          className="text-xs"
                        >
                          {s.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={handleImportLeads}
                    disabled={importingLeads}
                    className="w-full gap-2"
                    variant="secondary"
                  >
                    <Zap className="h-4 w-4" />
                    {importingLeads ? "Importando..." : "Importar Leads"}
                  </Button>
                  {importedCount > 0 && (
                    <p className="text-xs text-green-600 font-medium">✅ {importedCount} leads importados para lista</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateCampaign} disabled={saving} className="gap-2">
              <Send className="h-4 w-4" />
              {saving ? "Criando..." : "Criar Campanha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
