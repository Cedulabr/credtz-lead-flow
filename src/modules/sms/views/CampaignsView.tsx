import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Send, Rocket, Users, Zap, Loader2, RefreshCw, Trash2, AlertTriangle, MessageSquare, Download, Sparkles, Info, Phone, UserCheck, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserCompany } from "../hooks/useUserCompany";
import { useGestorCompany } from "@/hooks/useGestorCompany";
import { useActivityLogger } from "@/hooks/useActivityLogger";
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

interface PendingImport {
  newLeads: { name: string; phone: string; source_id: string }[];
  duplicateCount: number;
  multiPhoneLeads: { name: string; phone: string; phone2: string; source_id: string }[];
}

export const CampaignsView = ({
  campaigns,
  templates,
  contactLists,
  onRefresh,
  onRefreshLists,
}: CampaignsViewProps) => {
  const { user, isAdmin, profile } = useAuth();
  const { companyId } = useUserCompany();
  const { isGestor } = useGestorCompany();
  const { logActivity } = useActivityLogger();
  const isMobile = useIsMobile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [smsCredits, setSmsCredits] = useState<number | null>(null);
  const [leadCredits, setLeadCredits] = useState<number | null>(null);
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<SmsCampaign | null>(null);
  // Mark failed state
  const [markFailedTarget, setMarkFailedTarget] = useState<SmsCampaign | null>(null);
  // Delete list state
  const [deleteListTarget, setDeleteListTarget] = useState<SmsContactList | null>(null);
  const [deletingList, setDeletingList] = useState(false);

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

  // Deduplication dialog state
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showMultiPhoneDialog, setShowMultiPhoneDialog] = useState(false);
  const [includeMultiPhones, setIncludeMultiPhones] = useState(false);

  // +Leads wizard state
  const [showLeadWizard, setShowLeadWizard] = useState(false);
  const [wizardConvenio, setWizardConvenio] = useState("all");
  const [wizardDdds, setWizardDdds] = useState<string[]>([]);
  const [wizardTag, setWizardTag] = useState("all");
  const [wizardQuantidade, setWizardQuantidade] = useState(10);
  const [requestingLeads, setRequestingLeads] = useState(false);
  const [availableConvenios, setAvailableConvenios] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Fetch SMS + Lead credits
  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) return;
      const [smsRes, leadRes] = await Promise.all([
        supabase.rpc('get_user_sms_credits', { target_user_id: user.id }),
        supabase.rpc('get_user_credits', { target_user_id: user.id }),
      ]);
      if (!smsRes.error) setSmsCredits(smsRes.data ?? 0);
      if (!leadRes.error) setLeadCredits(leadRes.data ?? 0);
    };
    fetchCredits();
  }, [user, campaigns]);

  // Fetch available convenios and tags for +Leads wizard
  useEffect(() => {
    const fetchOptions = async () => {
      const [convRes, tagRes] = await Promise.all([
        supabase.from("leads_database").select("convenio").not("convenio", "is", null).eq("is_available", true).limit(500),
        supabase.from("leads_database").select("tag").not("tag", "is", null).eq("is_available", true).limit(500),
      ]);
      if (convRes.data) {
        const unique = [...new Set(convRes.data.map(r => r.convenio).filter(Boolean))] as string[];
        setAvailableConvenios(unique.sort());
      }
      if (tagRes.data) {
        const unique = [...new Set(tagRes.data.map(r => r.tag).filter(Boolean))] as string[];
        setAvailableTags(unique.sort());
      }
    };
    if (showLeadWizard) fetchOptions();
  }, [showLeadWizard]);

  // Apply template content
  useEffect(() => {
    if (selectedTemplate !== "none") {
      const t = templates.find((t) => t.id === selectedTemplate);
      if (t) setMessageContent(t.content);
    }
  }, [selectedTemplate, templates]);

  // ─── Deduplication check ───
  const checkDuplicatesAndImport = async (rawLeads: { name: string; phone: string; source_id: string }[], multiPhoneLeads: { name: string; phone: string; phone2: string; source_id: string }[]) => {
    if (!user) return;

    // Fetch existing contacts from all user's lists
    const userListIds = contactLists.map(l => l.id);
    let existingPhones = new Set<string>();

    if (userListIds.length > 0) {
      // Fetch in batches to avoid limits
      const batchSize = 50;
      for (let i = 0; i < userListIds.length; i += batchSize) {
        const batch = userListIds.slice(i, i + batchSize);
        const { data } = await supabase
          .from("sms_contacts")
          .select("phone")
          .in("list_id", batch);
        if (data) data.forEach(c => existingPhones.add(c.phone));
      }
    }

    const newLeads = rawLeads.filter(l => !existingPhones.has(l.phone));
    const duplicateCount = rawLeads.length - newLeads.length;

    // Filter multi-phone leads not already imported
    const filteredMultiPhone = multiPhoneLeads.filter(l => !existingPhones.has(l.phone2));

    if (duplicateCount > 0 && newLeads.length > 0) {
      setPendingImport({ newLeads, duplicateCount, multiPhoneLeads: filteredMultiPhone });
      setShowDuplicateDialog(true);
      return;
    }

    if (newLeads.length === 0) {
      toast.info("Todos os contatos já foram importados anteriormente.");
      setImportingLeads(false);
      return;
    }

    // No duplicates — check multi-phone
    if (filteredMultiPhone.length > 0) {
      setPendingImport({ newLeads, duplicateCount: 0, multiPhoneLeads: filteredMultiPhone });
      setShowMultiPhoneDialog(true);
      return;
    }

    // All clear — import directly
    await finalizeImport(newLeads, false);
  };

  const handleDuplicateConfirm = async () => {
    setShowDuplicateDialog(false);
    if (!pendingImport) return;

    // Check multi-phone after duplicate confirmation
    if (pendingImport.multiPhoneLeads.length > 0) {
      setShowMultiPhoneDialog(true);
      return;
    }

    await finalizeImport(pendingImport.newLeads, false);
  };

  const handleMultiPhoneConfirm = async (includeExtra: boolean) => {
    setShowMultiPhoneDialog(false);
    setIncludeMultiPhones(includeExtra);
    if (!pendingImport) return;

    await finalizeImport(pendingImport.newLeads, includeExtra);
  };

  const finalizeImport = async (leads: { name: string; phone: string; source_id: string }[], addMultiPhones: boolean) => {
    if (!user) return;
    try {
      // Add phone2 entries if user confirmed
      let allLeads = [...leads];
      if (addMultiPhones && pendingImport?.multiPhoneLeads) {
        const extraEntries = pendingImport.multiPhoneLeads.map(l => ({
          name: l.name,
          phone: l.phone2,
          source_id: l.source_id,
        }));
        allLeads = [...allLeads, ...extraEntries];
      }

      if (allLeads.length === 0) {
        toast.info("Nenhum contato novo para importar.");
        return;
      }

      const listName = `${LEAD_SOURCE_OPTIONS.find((o) => o.value === leadSource)?.label} - ${new Date().toLocaleDateString("pt-BR")}`;
      const { data: listData, error: listError } = await supabase
        .from("sms_contact_lists").insert({ name: listName, created_by: user.id, company_id: companyId || null } as any).select("id").single();
      if (listError) throw listError;

      const contacts = allLeads.map((l) => ({ list_id: listData.id, name: l.name, phone: l.phone, source: leadSource, source_id: l.source_id }));
      const { error: contactsError } = await supabase.from("sms_contacts").insert(contacts as any);
      if (contactsError) throw contactsError;

      setImportedCount(allLeads.length);
      setSelectedList(listData.id);
      setContactSource("list");
      onRefreshLists();
      logActivity({
        action: 'import_leads',
        module: 'sms',
        description: `Importou ${allLeads.length} leads de ${leadSource} para campanha SMS`,
        metadata: { source: leadSource, count: allLeads.length, list_id: listData.id },
      });
      toast.success(`${allLeads.length} leads importados com sucesso!`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao importar leads");
    } finally {
      setImportingLeads(false);
      setPendingImport(null);
    }
  };

  const handleImportLeads = async () => {
    if (!isAdmin && !companyId) {
      toast.error("Empresa não identificada.");
      return;
    }
    setImportingLeads(true);
    try {
      let companyUserIds: string[] = [];
      if (!isAdmin && companyId) {
        const { data: companyUsers } = await supabase
          .from("user_companies")
          .select("user_id")
          .eq("company_id", companyId)
          .eq("is_active", true);
        companyUserIds = (companyUsers || []).map(u => u.user_id);
      }

      let leads: { name: string; phone: string; source_id: string }[] = [];
      let multiPhoneLeads: { name: string; phone: string; phone2: string; source_id: string }[] = [];

      const statusMap: Record<string, Record<string, string[]>> = {
        activate_leads: {
          novo: ["novo", "new"], autolead: ["autolead"],
          em_andamento: ["em_andamento", "contatado", "interessado", "aguardando", "aguardando_contato"],
          agendado: ["agendado", "contato_futuro"],
        },
        leads_premium: {
          novo: ["new_lead"], autolead: ["autolead", "auto_lead"],
          em_andamento: ["em_andamento", "interessado", "simulacao"],
          agendado: ["contato_futuro", "agendamento"],
        },
        televendas: {
          novo: ["solicitar_digitacao"], autolead: [],
          em_andamento: ["em_andamento", "devolvido", "proposta_pendente"],
          agendado: ["pago_aguardando", "cancelado_aguardando"],
        },
      };

      if (leadSource === "activate_leads") {
        let query = supabase.from("activate_leads").select("id, nome, telefone, status");
        if (!isAdmin && companyUserIds.length > 0) query = query.or(`assigned_to.in.(${companyUserIds.join(',')}),created_by.in.(${companyUserIds.join(',')})`);
        if (leadStatusFilter !== "all") {
          const statuses = statusMap.activate_leads[leadStatusFilter] || [];
          if (statuses.length) query = query.in("status", statuses);
        }
        const { data } = await query.limit(500);
        leads = (data || []).map((l) => ({ name: l.nome, phone: l.telefone.replace(/\D/g, ""), source_id: l.id }));
      } else if (leadSource === "leads_premium") {
        let query = supabase.from("leads").select("id, name, phone, phone2, status");
        if (!isAdmin && companyUserIds.length > 0) query = query.or(`assigned_to.in.(${companyUserIds.join(',')}),requested_by.in.(${companyUserIds.join(',')})`);
        if (leadStatusFilter !== "all") {
          const statuses = statusMap.leads_premium[leadStatusFilter] || [];
          if (statuses.length) query = query.in("status", statuses);
        }
        const { data } = await query.limit(500);
        leads = (data || []).map((l: any) => ({ name: l.name, phone: (l.phone || "").replace(/\D/g, ""), source_id: l.id }));
        // Detect multi-phone leads
        multiPhoneLeads = (data || [])
          .filter((l: any) => l.phone2 && l.phone2.replace(/\D/g, "").length >= 10)
          .map((l: any) => ({ name: l.name, phone: (l.phone || "").replace(/\D/g, ""), phone2: l.phone2.replace(/\D/g, ""), source_id: l.id }));
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
      if (leads.length === 0) { toast.error("Nenhum lead encontrado com esse filtro"); setImportingLeads(false); return; }

      // Deduplicate check
      await checkDuplicatesAndImport(leads, multiPhoneLeads);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao importar leads");
      setImportingLeads(false);
    }
  };

  const FEATURED_DDDS = ['11', '21', '31', '71', '41', '51', '61', '81', '85', '27'];

  const handleRequestNewLeads = async () => {
    if (!user) return;
    const maxByLeadCredits = isAdmin ? wizardQuantidade : (leadCredits ?? 0);
    const maxBySmsCredits = isAdmin ? wizardQuantidade : (smsCredits ?? 0);
    const effectiveMax = Math.min(maxByLeadCredits, maxBySmsCredits);

    if (!isAdmin && effectiveMax <= 0) {
      toast.error("Sem créditos suficientes. Solicite recarga ao gestor.");
      return;
    }
    const qty = Math.min(wizardQuantidade, isAdmin ? wizardQuantidade : effectiveMax);
    if (qty <= 0) { toast.error("Quantidade inválida"); return; }

    setRequestingLeads(true);
    try {
      const { data: leads, error } = await (supabase as any).rpc("request_leads_with_credits", {
        leads_requested: qty,
        ddd_filter: wizardDdds.length > 0 ? wizardDdds : null,
        convenio_filter: wizardConvenio === "all" ? null : wizardConvenio,
        banco_filter: null,
        produto_filter: null,
      });
      if (error) throw error;
      if (!leads || leads.length === 0) { toast.error("Nenhum lead disponível com esses filtros"); return; }

      const listName = `+Leads Premium - ${new Date().toLocaleDateString("pt-BR")}`;
      const { data: listData, error: listError } = await supabase
        .from("sms_contact_lists").insert({ name: listName, created_by: user.id, company_id: companyId || null } as any).select("id").single();
      if (listError) throw listError;

      // Check for multi-phone leads from request
      const multiPhones = leads.filter((l: any) => l.phone2 && l.phone2.replace(/\D/g, "").length >= 10);
      let allContacts = leads.map((l: any) => ({
        list_id: listData.id, name: l.name, phone: (l.phone || "").replace(/\D/g, ""),
        source: "leads_premium", source_id: l.id || l.lead_id,
      }));

      if (multiPhones.length > 0) {
        // Add phone2 entries automatically for requested leads
        const extraContacts = multiPhones.map((l: any) => ({
          list_id: listData.id, name: l.name, phone: l.phone2.replace(/\D/g, ""),
          source: "leads_premium", source_id: l.id || l.lead_id,
        }));
        allContacts = [...allContacts, ...extraContacts];
      }

      const { error: cErr } = await supabase.from("sms_contacts").insert(allContacts as any);
      if (cErr) throw cErr;

      setSelectedList(listData.id);
      setContactSource("list");
      setImportedCount(allContacts.length);
      setShowLeadWizard(false);
      onRefreshLists();

      const [smsRes, leadRes] = await Promise.all([
        supabase.rpc('get_user_sms_credits', { target_user_id: user.id }),
        supabase.rpc('get_user_credits', { target_user_id: user.id }),
      ]);
      if (!smsRes.error) setSmsCredits(smsRes.data ?? 0);
      if (!leadRes.error) setLeadCredits(leadRes.data ?? 0);

      logActivity({
        action: 'request_leads_for_sms',
        module: 'sms',
        description: `Solicitou ${allContacts.length} leads premium para campanha SMS`,
        metadata: { count: allContacts.length, convenio: wizardConvenio, ddds: wizardDdds, tag: wizardTag, multi_phones: multiPhones.length },
      });
      toast.success(`${allContacts.length} leads solicitados e importados!${multiPhones.length > 0 ? ` (${multiPhones.length} com 2 números)` : ''}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao solicitar leads");
    } finally {
      setRequestingLeads(false);
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
        company_id: companyId || null,
      } as any);
      if (error) throw error;
      logActivity({
        action: 'create_campaign',
        module: 'sms',
        description: `Criou campanha SMS: ${campaignName.trim()}`,
        metadata: { campaign_name: campaignName.trim(), recipients: list?.contact_count || 0 },
      });
      toast.success("Campanha criada");
      setDialogOpen(false);
      resetForm();
      onRefresh();
    } catch { toast.error("Erro ao criar campanha"); } finally { setSaving(false); }
  };

  const resetForm = () => {
    setCampaignName(""); setSelectedTemplate("none"); setMessageContent("");
    setSelectedList("none"); setContactSource("list"); setImportedCount(0);
    setShowLeadWizard(false); setPendingImport(null);
  };

  const handleSendCampaign = async (campaignId: string) => {
    setSendingCampaignId(campaignId);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms", { body: { campaign_id: campaignId } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); return; }

      // Log dispatch result
      logActivity({
        action: 'send_campaign',
        module: 'sms',
        description: `Disparou campanha SMS: ${data.sent} enviados, ${data.failed} falhas`,
        metadata: { campaign_id: campaignId, sent: data.sent, failed: data.failed },
      });

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

  const canManageLists = isAdmin || isGestor;

  const handleDeleteList = async () => {
    if (!deleteListTarget) return;
    setDeletingList(true);
    try {
      // Delete contacts first, then the list
      await supabase.from("sms_contacts").delete().eq("list_id", deleteListTarget.id);
      const { error } = await supabase.from("sms_contact_lists").delete().eq("id", deleteListTarget.id);
      if (error) throw error;
      if (selectedList === deleteListTarget.id) setSelectedList("none");
      toast.success(`Lista "${deleteListTarget.name}" excluída com ${deleteListTarget.contact_count} contatos`);
      setDeleteListTarget(null);
      onRefreshLists();
    } catch {
      toast.error("Erro ao excluir lista");
    } finally {
      setDeletingList(false);
    }
  };

  const handleDownloadReport = async (campaignId: string, campaignName: string) => {
    setDownloadingReportId(campaignId);
    try {
      // Step 1: Check real-time status from Yup Chat API
      toast.info("Verificando status das mensagens...");
      try {
        const { data: checkResult } = await supabase.functions.invoke("sms-check-status", {
          body: { campaign_id: campaignId },
        });
        if (checkResult?.updated > 0) {
          toast.success(`${checkResult.updated} mensagem(ns) atualizada(s): ${checkResult.delivered || 0} entregues, ${checkResult.failed || 0} falhas`);
        }
      } catch (e) {
        console.warn("Status check failed, generating report with cached data:", e);
      }

      // Step 2: Fetch updated history
      const { data, error } = await supabase
        .from("sms_history")
        .select("contact_name, phone, status, error_message, error_code, carrier, delivery_status, send_type, sent_at, delivered_at, created_at")
        .eq("campaign_id", campaignId)
        .order("status");
      if (error) throw error;
      if (!data || data.length === 0) { toast.info("Nenhum registro encontrado"); return; }

      const sorted = [...data].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
      const header = "Nome;Telefone;Status;Status Detalhado;Operadora;Código Erro;Erro;Provedor;Data Envio;Data Entrega";
      const rows = sorted.map((h: any) => {
        const dt = h.sent_at || h.created_at;
        const STATUS_LABELS: Record<string, string> = { delivered: "Entregue", sent: "Enviado", failed: "Falhou", pending: "Pendente", undelivered: "Não Entregue" };
        return [
          h.contact_name || "Sem nome",
          h.phone,
          STATUS_LABELS[h.status] || h.status,
          h.delivery_status || "",
          h.carrier || "",
          h.error_code || "",
          (h.error_message || "").replace(/;/g, ","),
          h.send_type || "",
          dt ? new Date(dt).toLocaleString("pt-BR") : "",
          h.delivered_at ? new Date(h.delivered_at).toLocaleString("pt-BR") : "",
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

      const deliveredCount = data.filter((d: any) => d.status === 'delivered').length;
      const sentCount = data.filter((d: any) => d.status === 'sent').length;
      const failedCount = data.filter((d: any) => d.status === 'failed').length;
      toast.success(`Relatório: ${deliveredCount} entregues, ${sentCount} enviados, ${failedCount} falhas, ${data.length} total`);
    } catch { toast.error("Erro ao gerar relatório"); } finally { setDownloadingReportId(null); }
  };

  // ─── Campaign Creation Form ───
  const campaignForm = (
    <div className="space-y-4 sm:space-y-5">
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
          <TabsContent value="list" className="mt-3 space-y-3">
            <Select value={selectedList} onValueChange={setSelectedList}>
              <SelectTrigger><SelectValue placeholder="Selecionar lista" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Selecione uma lista</SelectItem>
                {contactLists.map((l) => (<SelectItem key={l.id} value={l.id}>👥 {l.name} ({l.contact_count})</SelectItem>))}
              </SelectContent>
            </Select>
            {/* List management for admin/gestor */}
            {canManageLists && contactLists.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Gerenciar Listas</Label>
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border/50 p-2">
                  {contactLists.map((l) => (
                    <div key={l.id} className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors group">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{l.name}</p>
                        <p className="text-[10px] text-muted-foreground">{l.contact_count} contatos · {new Date(l.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteListTarget(l)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="leads" className="mt-3 space-y-3">
            {/* Credit comparison banner */}
            {!isAdmin && smsCredits !== null && leadCredits !== null && (
              <div className={`rounded-lg p-3 text-xs flex items-start gap-2 ${
                smsCredits > 0 && leadCredits <= 0
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400"
                  : leadCredits > 0 && smsCredits <= 0
                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400"
                  : smsCredits <= 0 && leadCredits <= 0
                  ? "bg-destructive/10 border border-destructive/20 text-destructive"
                  : "bg-primary/5 border border-primary/20 text-primary"
              }`}>
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  {smsCredits > 0 && leadCredits <= 0 && (
                    <p>Você tem <strong>{smsCredits}</strong> disparos SMS mas <strong>0</strong> créditos de leads. Solicite mais leads ao gestor!</p>
                  )}
                  {leadCredits > 0 && smsCredits <= 0 && (
                    <p>Você tem <strong>{leadCredits}</strong> leads disponíveis mas <strong>0</strong> créditos SMS. Adquira mais créditos SMS!</p>
                  )}
                  {smsCredits <= 0 && leadCredits <= 0 && (
                    <p>Sem créditos de SMS e Leads. Solicite recarga ao seu gestor.</p>
                  )}
                  {smsCredits > 0 && leadCredits > 0 && (
                    <p>📊 <strong>{smsCredits}</strong> SMS · <strong>{leadCredits}</strong> Leads Premium disponíveis</p>
                  )}
                </div>
              </div>
            )}
            {isAdmin && (
              <div className="rounded-lg p-3 text-xs flex items-center gap-2 bg-primary/5 border border-primary/20 text-primary">
                <Info className="h-4 w-4 shrink-0" />
                <p>Admin: créditos ilimitados para SMS e Leads Premium.</p>
              </div>
            )}

            {/* +Leads Card - Always visible and highlighted */}
            <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
              <button
                onClick={() => setShowLeadWizard(!showLeadWizard)}
                className="w-full flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p>Solicitar Novos Leads</p>
                    <p className="text-[10px] font-normal text-muted-foreground">Puxar leads do banco premium</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">
                  {!isAdmin && leadCredits !== null ? `${leadCredits} créditos` : '∞'}
                </Badge>
              </button>

              <AnimatePresence>
                {showLeadWizard && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 pt-2 border-t border-primary/20">
                      {/* Convênio */}
                      <div>
                        <Label className="text-xs">Convênio</Label>
                        <Select value={wizardConvenio} onValueChange={setWizardConvenio}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {availableConvenios.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* DDDs */}
                      <div>
                        <Label className="text-xs">DDDs (opcional)</Label>
                        <ScrollArea className={isMobile ? "w-full" : ""}>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {FEATURED_DDDS.map(ddd => (
                              <button
                                key={ddd}
                                onClick={() => setWizardDdds(prev => prev.includes(ddd) ? prev.filter(d => d !== ddd) : [...prev, ddd])}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                                  wizardDdds.includes(ddd)
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                              >
                                {ddd}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>

                      {/* Tags */}
                      {availableTags.length > 0 && (
                        <div>
                          <Label className="text-xs">Tag</Label>
                          <Select value={wizardTag} onValueChange={setWizardTag}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas</SelectItem>
                              {availableTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Quantidade */}
                      <div>
                        <Label className="text-xs">Quantidade</Label>
                        <Input
                          type="number" min={1} max={isAdmin ? 999 : Math.min(smsCredits ?? 0, leadCredits ?? 0)}
                          value={wizardQuantidade}
                          onChange={e => setWizardQuantidade(Math.max(1, Number(e.target.value)))}
                          className="h-8 text-xs"
                        />
                        {!isAdmin && smsCredits !== null && leadCredits !== null && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Máx: {Math.min(smsCredits, leadCredits)} (limitado pelo menor saldo)
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={handleRequestNewLeads}
                        disabled={requestingLeads || (!isAdmin && (leadCredits ?? 0) <= 0)}
                        className="w-full gap-2"
                      >
                        {requestingLeads ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Solicitando...</>
                        ) : (
                          <><Sparkles className="h-4 w-4" /> Gerar {wizardQuantidade} Leads</>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Separator */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] text-muted-foreground uppercase font-medium">ou importar existentes</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <div>
              <Label className="text-xs">Módulo de Origem</Label>
              <div className={`grid gap-2 mt-1 ${isMobile ? 'grid-cols-1' : 'grid-cols-3'}`}>
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
              <div className={`grid gap-2 mt-1 ${isMobile ? 'grid-cols-2' : 'grid-cols-3'}`}>
                <Button variant={leadStatusFilter === "all" ? "default" : "outline"} size="sm"
                  onClick={() => setLeadStatusFilter("all")} className="text-xs">Todos</Button>
                {LEAD_STATUS_FILTERS.map((s) => (
                  <Button key={s.value} variant={leadStatusFilter === s.value ? "default" : "outline"} size="sm"
                    onClick={() => setLeadStatusFilter(s.value)} className="text-xs">{s.label}</Button>
                ))}
              </div>
            </div>
            <Button onClick={handleImportLeads} disabled={importingLeads} className="w-full gap-2" variant="secondary">
              {importingLeads ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Verificando duplicatas...</>
              ) : (
                <><Zap className="h-4 w-4" /> Importar Leads Existentes</>
              )}
            </Button>
            {importedCount > 0 && (
              <div className="rounded-lg p-3 bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                  ✅ {importedCount} leads importados e prontos para disparo
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  const campaignFooter = (
    <div className={`flex gap-2 ${isMobile ? 'flex-col' : ''}`}>
      <Button variant="outline" onClick={() => setDialogOpen(false)} className={isMobile ? 'w-full' : ''}>Cancelar</Button>
      <Button onClick={handleCreateCampaign} disabled={saving} className={`gap-2 ${isMobile ? 'w-full' : ''}`}>
        <Send className="h-4 w-4" /> {saving ? "Criando..." : "Criar Campanha"}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Rocket className="h-5 w-5 text-emerald-500" />
          </div>
          <h2 className="text-base sm:text-lg font-semibold">Campanhas SMS</h2>
          {smsCredits !== null && (
            <Badge variant="outline" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {isAdmin ? '∞' : smsCredits} créditos
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onRefresh} size={isMobile ? "sm" : "default"} className="gap-1.5 text-xs sm:text-sm">
            <RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {isMobile ? '' : 'Atualizar'}
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} size={isMobile ? "sm" : "default"} className="gap-1.5">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Nova Campanha
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-12 sm:py-16 text-muted-foreground">
          <div className="h-14 w-14 sm:h-16 sm:w-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Rocket className="h-7 w-7 sm:h-8 sm:w-8 opacity-40" />
          </div>
          <p className="font-medium text-sm sm:text-base">Nenhuma campanha criada</p>
          <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Campanha" para começar</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {campaigns.map((c, index) => {
              const statusConfig = CAMPAIGN_STATUS_CONFIG[c.status] || CAMPAIGN_STATUS_CONFIG.draft;
              const hasResults = c.sent_count > 0 || c.failed_count > 0;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="p-3 sm:p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all"
                >
                  <div className={`flex ${isMobile ? 'flex-col gap-3' : 'items-center justify-between gap-3'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{statusConfig.emoji}</span>
                        <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                        <span className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{c.message_content}</p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground flex-wrap">
                        <span>👥 {c.total_recipients} destinatários</span>
                        {hasResults && <span className="text-green-600">✅ {c.sent_count} enviados</span>}
                        {c.failed_count > 0 && <span className="text-red-500">❌ {c.failed_count} falhas</span>}
                      </div>
                      {/* Dispatch summary */}
                      {hasResults && (
                        <div className="mt-2 p-2 rounded-lg bg-muted/50 text-[11px] flex items-center gap-2 flex-wrap">
                          <FileText className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Último disparo: {c.sent_count + c.failed_count} processados
                          </span>
                          {c.completed_at && (
                            <span className="text-muted-foreground">
                              — {new Date(c.completed_at).toLocaleDateString("pt-BR")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className={`flex ${isMobile ? 'items-center justify-between' : 'flex-col items-end gap-2'}`}>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
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
                            <AlertTriangle className="h-3 w-3" /> {isMobile ? '' : 'Marcar Falhou'}
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
              A campanha "{markFailedTarget?.name}" será marcada como falhou. Use para campanhas travadas no status "Enviando".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkFailed}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Contacts Alert */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent className={isMobile ? "max-w-[95vw]" : ""}>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <AlertDialogTitle>Contatos Duplicados Detectados</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Encontramos contatos que já foram importados anteriormente.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total encontrados:</span>
                    <span className="font-semibold">{(pendingImport?.newLeads.length ?? 0) + (pendingImport?.duplicateCount ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-amber-600">⚠️ Já importados:</span>
                    <span className="font-semibold text-amber-600">{pendingImport?.duplicateCount ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-green-600">✅ Novos contatos:</span>
                    <span className="font-semibold text-green-600">{pendingImport?.newLeads.length ?? 0}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Importar apenas os contatos novos evita disparos duplicados e economiza créditos.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowDuplicateDialog(false); setImportingLeads(false); setPendingImport(null); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDuplicateConfirm} className="bg-primary hover:bg-primary/90">
              Importar {pendingImport?.newLeads.length ?? 0} Novos
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Multiple Phones Alert */}
      <AlertDialog open={showMultiPhoneDialog} onOpenChange={setShowMultiPhoneDialog}>
        <AlertDialogContent className={isMobile ? "max-w-[95vw]" : ""}>
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Phone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <AlertDialogTitle>Leads com Múltiplos Números</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  <strong>{pendingImport?.multiPhoneLeads.length ?? 0}</strong> leads possuem mais de um número de telefone registrado.
                </p>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <p className="text-muted-foreground">Deseja enviar SMS para <strong>todos</strong> os números desses leads?</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    📱 Ao confirmar, cada lead com 2 números receberá o disparo em ambos os telefones.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isMobile ? "flex-col gap-2" : ""}>
            <AlertDialogCancel onClick={() => handleMultiPhoneConfirm(false)}>
              Apenas 1 número por lead
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleMultiPhoneConfirm(true)} className="bg-blue-600 hover:bg-blue-700">
              Enviar para todos os números
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete List Confirmation */}
      <AlertDialog open={!!deleteListTarget} onOpenChange={() => setDeleteListTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lista de Contatos</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a lista "{deleteListTarget?.name}" com <strong>{deleteListTarget?.contact_count}</strong> contatos? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteList} disabled={deletingList} className="bg-destructive hover:bg-destructive/90">
              {deletingList ? <><Loader2 className="h-4 w-4 animate-spin" /> Excluindo...</> : "Excluir Lista"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isMobile ? (
        <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
          <SheetContent side="bottom" className="h-[92vh] flex flex-col p-4">
            <SheetHeader className="flex-shrink-0 pb-2">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <Send className="h-5 w-5 text-primary" /> Nova Campanha SMS
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1">
              {campaignForm}
            </ScrollArea>
            <div className="flex-shrink-0 pt-4 border-t sticky bottom-0 bg-background">
              {campaignFooter}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" /> Nova Campanha SMS
              </DialogTitle>
            </DialogHeader>
            {campaignForm}
            <DialogFooter className="mt-4">
              {campaignFooter}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
