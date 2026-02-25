import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Upload, Users, Phone, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SmsContactList, SmsContact } from "../types";

interface ContactsViewProps {
  contactLists: SmsContactList[];
  onRefresh: () => void;
}

export const ContactsView = ({ contactLists, onRefresh }: ContactsViewProps) => {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [listName, setListName] = useState("");
  const [listDesc, setListDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [contacts, setContacts] = useState<SmsContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Add phone manually
  const [addPhoneOpen, setAddPhoneOpen] = useState(false);
  const [addPhoneListId, setAddPhoneListId] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");

  const handleCreateList = async () => {
    if (!listName.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("sms_contact_lists").insert({
        name: listName.trim(),
        description: listDesc.trim() || null,
        created_by: user?.id,
      } as any);
      if (error) throw error;
      toast.success("Lista criada");
      setCreateOpen(false);
      setListName("");
      setListDesc("");
      onRefresh();
    } catch {
      toast.error("Erro ao criar lista");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!confirm("Excluir esta lista e todos os contatos?")) return;
    const { error } = await supabase.from("sms_contact_lists").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Lista excluída"); onRefresh(); }
  };

  const toggleExpand = async (listId: string) => {
    if (expandedList === listId) {
      setExpandedList(null);
      return;
    }
    setExpandedList(listId);
    setLoadingContacts(true);
    const { data } = await supabase
      .from("sms_contacts")
      .select("*")
      .eq("list_id", listId)
      .order("created_at", { ascending: false })
      .limit(100);
    setContacts((data as any[]) || []);
    setLoadingContacts(false);
  };

  const handleAddPhone = async () => {
    if (!manualPhone.trim()) { toast.error("Telefone é obrigatório"); return; }
    const phone = manualPhone.replace(/\D/g, "");
    if (phone.length < 10) { toast.error("Telefone inválido"); return; }
    try {
      const { error } = await supabase.from("sms_contacts").insert({
        list_id: addPhoneListId,
        name: manualName.trim() || null,
        phone,
        source: "manual",
      } as any);
      if (error) throw error;
      toast.success("Contato adicionado");
      setManualName("");
      setManualPhone("");
      setAddPhoneOpen(false);
      onRefresh();
      if (expandedList === addPhoneListId) toggleExpand(addPhoneListId);
    } catch {
      toast.error("Erro ao adicionar contato");
    }
  };

  const handleCsvImport = async (listId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const contacts: { list_id: string; name: string | null; phone: string; source: string }[] = [];

      for (const line of lines.slice(1)) {
        const cols = line.split(/[,;]/).map((c) => c.trim().replace(/"/g, ""));
        const phone = (cols[1] || cols[0] || "").replace(/\D/g, "");
        if (phone.length >= 10) {
          contacts.push({
            list_id: listId,
            name: cols.length > 1 ? cols[0] : null,
            phone,
            source: "csv",
          });
        }
      }

      if (contacts.length === 0) {
        toast.error("Nenhum telefone válido encontrado no CSV");
        return;
      }

      const { error } = await supabase.from("sms_contacts").insert(contacts as any);
      if (error) toast.error("Erro ao importar");
      else {
        toast.success(`${contacts.length} contatos importados`);
        onRefresh();
        if (expandedList === listId) toggleExpand(listId);
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Listas de Contatos</h2>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Lista
        </Button>
      </div>

      {contactLists.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Nenhuma lista criada</p>
          <p className="text-sm">Crie listas de contatos para seus disparos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contactLists.map((list) => (
            <div key={list.id} className="rounded-xl border border-border/50 bg-card overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggleExpand(list.id)}
              >
                <div className="flex items-center gap-3">
                  {expandedList === list.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <div>
                    <h3 className="font-semibold text-sm">{list.name}</h3>
                    {list.description && <p className="text-xs text-muted-foreground">{list.description}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">{list.contact_count} contatos</span>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); setAddPhoneListId(list.id); setAddPhoneOpen(true); }}
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7"
                    onClick={(e) => { e.stopPropagation(); handleCsvImport(list.id); }}
                  >
                    <Upload className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                    onClick={(e) => { e.stopPropagation(); handleDeleteList(list.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <AnimatePresence>
                {expandedList === list.id && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                    className="overflow-hidden border-t border-border/30"
                  >
                    <div className="p-3 max-h-60 overflow-y-auto space-y-1">
                      {loadingContacts ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Carregando...</p>
                      ) : contacts.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Nenhum contato nesta lista</p>
                      ) : (
                        contacts.map((c) => (
                          <div key={c.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-muted/30">
                            <div>
                              <span className="font-medium">{c.name || "Sem nome"}</span>
                              <span className="text-muted-foreground ml-2">{c.phone}</span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{c.source}</span>
                          </div>
                        ))
                      )}
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
            <div>
              <Label>Nome da Lista</Label>
              <Input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="Ex: Clientes INSS" />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={listDesc} onChange={(e) => setListDesc(e.target.value)} placeholder="Descrição da lista" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateList} disabled={saving}>{saving ? "Criando..." : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Phone Dialog */}
      <Dialog open={addPhoneOpen} onOpenChange={setAddPhoneOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Contato</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome (opcional)</Label>
              <Input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Nome do contato" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPhoneOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddPhone}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
