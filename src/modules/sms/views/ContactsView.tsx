import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Upload, Users, Phone, ChevronRight, ChevronDown, Download, CheckCircle2, AlertTriangle, XCircle, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCompany } from "../hooks/useUserCompany";
import { toast } from "sonner";
import { SmsContactList, SmsContact } from "../types";
import * as XLSX from "xlsx";

interface ContactsViewProps {
  contactLists: SmsContactList[];
  onRefresh: () => void;
}

interface ImportReport {
  total: number;
  imported: number;
  invalid: number;
  duplicatesInternal: number;
  duplicatesExisting: number;
  invalidPhones: string[];
  duplicatePhones: string[];
}

export const ContactsView = ({ contactLists, onRefresh }: ContactsViewProps) => {
  const { user } = useAuth();
  const { companyId } = useUserCompany();
  const [createOpen, setCreateOpen] = useState(false);
  const [listName, setListName] = useState("");
  const [listDesc, setListDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [contacts, setContacts] = useState<SmsContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [addPhoneOpen, setAddPhoneOpen] = useState(false);
  const [addPhoneListId, setAddPhoneListId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importing, setImporting] = useState(false);

  const handleCreateList = async () => {
    if (!listName.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("sms_contact_lists").insert({ name: listName.trim(), description: listDesc.trim() || null, created_by: user?.id, company_id: companyId || null } as any);
      if (error) throw error;
      toast.success("Lista criada"); setCreateOpen(false); setListName(""); setListDesc(""); onRefresh();
    } catch { toast.error("Erro ao criar lista"); } finally { setSaving(false); }
  };

  const handleDeleteList = async (id: string) => {
    if (!confirm("Excluir esta lista e todos os contatos?")) return;
    const { error } = await supabase.from("sms_contact_lists").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir"); else { toast.success("Lista excluída"); onRefresh(); }
  };

  const toggleExpand = async (listId: string) => {
    if (expandedList === listId) { setExpandedList(null); return; }
    setExpandedList(listId); setLoadingContacts(true);
    const { data } = await supabase.from("sms_contacts").select("*").eq("list_id", listId).order("created_at", { ascending: false }).limit(100);
    setContacts((data as any[]) || []); setLoadingContacts(false);
  };

  const handleAddPhone = async () => {
    if (!manualPhone.trim()) { toast.error("Telefone é obrigatório"); return; }
    const phone = manualPhone.replace(/\D/g, "");
    if (phone.length < 10) { toast.error("Telefone inválido"); return; }
    try {
      const { error } = await supabase.from("sms_contacts").insert({ list_id: addPhoneListId, name: manualName.trim() || null, phone, source: "manual" } as any);
      if (error) throw error;
      toast.success("Contato adicionado"); setManualName(""); setManualPhone(""); setAddPhoneOpen(false); onRefresh();
      if (expandedList === addPhoneListId) toggleExpand(addPhoneListId);
    } catch { toast.error("Erro ao adicionar contato"); }
  };

  const downloadTemplate = () => {
    const csv = "nome;telefone\nJoão Silva;11999998888\nMaria Santos;21988887777\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_contatos_sms.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Modelo baixado!");
  };

  const handleSmartImport = async (listId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setImporting(true);

      try {
        let rows: { name: string | null; phone: string }[] = [];
        const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));

        if (ext === ".csv") {
          const text = await file.text();
          const lines = text.split(/\r?\n/).filter((l) => l.trim());
          for (const line of lines.slice(1)) {
            const cols = line.split(/[,;]/).map((c) => c.trim().replace(/"/g, ""));
            const rawPhone = cols.length > 1 ? cols[1] : cols[0];
            const name = cols.length > 1 ? cols[0] : null;
            rows.push({ name: name || null, phone: rawPhone || "" });
          }
        } else {
          const buffer = await file.arrayBuffer();
          const wb = XLSX.read(buffer, { type: "array", raw: false });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }) as string[][];
          for (const row of data.slice(1)) {
            const name = row[0] ? String(row[0]).trim() : null;
            const rawPhone = row[1] ? String(row[1]).trim() : row[0] ? String(row[0]).trim() : "";
            rows.push({ name: row.length > 1 ? name : null, phone: rawPhone });
          }
        }

        const total = rows.length;
        const invalidPhones: string[] = [];
        const duplicatePhones: string[] = [];
        const seen = new Set<string>();
        let duplicatesInternal = 0;

        // Normalize & validate
        const validRows: { name: string | null; phone: string }[] = [];
        for (const row of rows) {
          const normalized = row.phone.replace(/\D/g, "");
          if (normalized.length !== 10 && normalized.length !== 11) {
            invalidPhones.push(row.phone || "(vazio)");
            continue;
          }
          if (seen.has(normalized)) {
            duplicatesInternal++;
            duplicatePhones.push(normalized);
            continue;
          }
          seen.add(normalized);
          validRows.push({ name: row.name, phone: normalized });
        }

        // Check existing in DB
        const phonesToCheck = validRows.map((r) => r.phone);
        let existingPhones: string[] = [];
        if (phonesToCheck.length > 0) {
          // Query in batches of 500
          for (let i = 0; i < phonesToCheck.length; i += 500) {
            const batch = phonesToCheck.slice(i, i + 500);
            const { data: existing } = await supabase
              .from("sms_contacts")
              .select("phone")
              .eq("list_id", listId)
              .in("phone", batch);
            if (existing) {
              existingPhones.push(...(existing as any[]).map((e: any) => e.phone));
            }
          }
        }

        const existingSet = new Set(existingPhones);
        const toInsert: { list_id: string; name: string | null; phone: string; source: string }[] = [];
        let duplicatesExisting = 0;

        for (const row of validRows) {
          if (existingSet.has(row.phone)) {
            duplicatesExisting++;
            duplicatePhones.push(row.phone);
            continue;
          }
          toInsert.push({ list_id: listId, name: row.name, phone: row.phone, source: "import" });
        }

        // Insert in batches
        if (toInsert.length > 0) {
          for (let i = 0; i < toInsert.length; i += 500) {
            const batch = toInsert.slice(i, i + 500);
            const { error } = await supabase.from("sms_contacts").insert(batch as any);
            if (error) throw error;
          }
        }

        const report: ImportReport = {
          total,
          imported: toInsert.length,
          invalid: invalidPhones.length,
          duplicatesInternal,
          duplicatesExisting,
          invalidPhones: invalidPhones.slice(0, 20),
          duplicatePhones: [...new Set(duplicatePhones)].slice(0, 20),
        };

        setImportReport(report);
        onRefresh();
        if (expandedList === listId) toggleExpand(listId);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao importar arquivo");
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-orange-500" />
          </div>
          <h2 className="text-lg font-semibold">Listas de Contatos</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <Download className="h-4 w-4" /> Baixar Modelo
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Lista
          </Button>
        </div>
      </div>

      {contactLists.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Users className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-medium">Nenhuma lista criada</p>
          <p className="text-sm mt-1">Crie listas de contatos para seus disparos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contactLists.map((list) => (
            <div key={list.id} className="rounded-xl border border-border/50 bg-card overflow-hidden hover:border-border transition-colors">
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors" onClick={() => toggleExpand(list.id)}>
                <div className="flex items-center gap-3">
                  {expandedList === list.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <div>
                    <h3 className="font-semibold text-sm">{list.name}</h3>
                    {list.description && <p className="text-xs text-muted-foreground">{list.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-muted px-2.5 py-1 rounded-full font-medium">{list.contact_count} contatos</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setAddPhoneListId(list.id); setAddPhoneOpen(true); }} title="Adicionar contato"><Phone className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleSmartImport(list.id); }} title="Importar arquivo" disabled={importing}>
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <AnimatePresence>
                {expandedList === list.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-border/30">
                    <div className="p-3 max-h-60 overflow-y-auto space-y-1">
                      {loadingContacts ? <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p> : contacts.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">Nenhum contato</p> : contacts.map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-muted/30">
                          <div><span className="font-medium">{c.name || "Sem nome"}</span><span className="text-muted-foreground ml-2">{c.phone}</span></div>
                          <span className="text-[10px] text-muted-foreground">{c.source}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}

      {/* Create List Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Lista de Contatos</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="Ex: Clientes INSS" /></div>
            <div><Label>Descrição (opcional)</Label><Input value={listDesc} onChange={(e) => setListDesc(e.target.value)} placeholder="Descrição da lista" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button onClick={handleCreateList} disabled={saving}>{saving ? "Criando..." : "Criar"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Phone Dialog */}
      <Dialog open={addPhoneOpen} onOpenChange={setAddPhoneOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Contato</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome (opcional)</Label><Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Nome" /></div>
            <div><Label>Telefone</Label><Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="(11) 99999-9999" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddPhoneOpen(false)}>Cancelar</Button><Button onClick={handleAddPhone}>Adicionar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Report Dialog */}
      <Dialog open={!!importReport} onOpenChange={() => setImportReport(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Relatório de Importação
            </DialogTitle>
          </DialogHeader>
          {importReport && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-2xl font-bold">{importReport.total}</p>
                  <p className="text-xs text-muted-foreground">Total de linhas</p>
                </div>
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <p className="text-2xl font-bold text-green-600">{importReport.imported}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Importados</p>
                </div>
                <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <p className="text-2xl font-bold text-red-600">{importReport.invalid}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Inválidos</p>
                </div>
                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <p className="text-2xl font-bold text-yellow-600">{importReport.duplicatesInternal + importReport.duplicatesExisting}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Duplicados</p>
                </div>
              </div>

              {/* Invalid phones detail */}
              {importReport.invalidPhones.length > 0 && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                  <p className="text-xs font-semibold text-red-600 mb-1.5 flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" /> Telefones inválidos ignorados
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {importReport.invalidPhones.map((p, i) => (
                      <span key={i} className="text-[11px] bg-red-500/10 text-red-700 px-2 py-0.5 rounded-full">{p}</span>
                    ))}
                  </div>
                  {importReport.invalid > 20 && <p className="text-[10px] text-muted-foreground mt-1">...e mais {importReport.invalid - 20}</p>}
                </div>
              )}

              {/* Duplicate phones detail */}
              {importReport.duplicatePhones.length > 0 && (
                <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
                  <p className="text-xs font-semibold text-yellow-600 mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5" /> Telefones duplicados ignorados
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {importReport.duplicatePhones.map((p, i) => (
                      <span key={i} className="text-[11px] bg-yellow-500/10 text-yellow-700 px-2 py-0.5 rounded-full">{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {importReport.imported > 0 && importReport.invalid === 0 && importReport.duplicatesInternal === 0 && importReport.duplicatesExisting === 0 && (
                <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 text-center">
                  <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
                  <p className="text-sm font-medium text-green-700">Importação perfeita! Todos os contatos foram adicionados.</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setImportReport(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
