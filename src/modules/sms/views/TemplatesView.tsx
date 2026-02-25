import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, Copy, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { SmsTemplate } from "../types";

interface TemplatesViewProps {
  templates: SmsTemplate[];
  onRefresh: () => void;
}

export const TemplatesView = ({ templates, onRefresh }: TemplatesViewProps) => {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SmsTemplate | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setContent("");
    setDialogOpen(true);
  };

  const openEdit = (t: SmsTemplate) => {
    setEditing(t);
    setName(t.name);
    setContent(t.content);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      toast.error("Preencha nome e conteúdo");
      return;
    }
    setSaving(true);
    try {
      // Extract variables like {{nome}}, {{telefone}}
      const vars = (content.match(/\{\{(\w+)\}\}/g) || []).map((v) => v.replace(/[{}]/g, ""));

      if (editing) {
        const { error } = await supabase
          .from("sms_templates")
          .update({ name: name.trim(), content: content.trim(), variables: vars } as any)
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Template atualizado");
      } else {
        const { error } = await supabase.from("sms_templates").insert({
          name: name.trim(),
          content: content.trim(),
          variables: vars,
          created_by: user?.id,
        } as any);
        if (error) throw error;
        toast.success("Template criado");
      }
      setDialogOpen(false);
      onRefresh();
    } catch {
      toast.error("Erro ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    const { error } = await supabase.from("sms_templates").update({ is_active: false } as any).eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else {
      toast.success("Template excluído");
      onRefresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Templates de SMS</h2>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum template criado</p>
          <p className="text-sm">Crie templates para agilizar seus disparos</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <AnimatePresence>
            {templates.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{t.content}</p>
                    {t.variables.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {t.variables.map((v) => (
                          <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                            {`{{${v}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Template" : "Novo Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Boas-vindas" />
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Olá {{nome}}, temos uma oferta para você!"
                rows={4}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Use {"{{variavel}}"} para campos dinâmicos. Ex: {"{{nome}}"}, {"{{telefone}}"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
