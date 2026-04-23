import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function QuickCaptureFab() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() && !content.trim()) {
      toast.error("Adicione um título ou conteúdo");
      return;
    }
    setSaving(true);
    const tagsArr = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const contentJson = content
      ? { type: "doc", content: content.split("\n").map((line) => ({ type: "paragraph", content: line ? [{ type: "text", text: line }] : [] })) }
      : [];
    const { error } = await (supabase.from("notes") as any).insert({
      title: title || "Sem título",
      content: contentJson as any,
      tags: tagsArr,
      color: "yellow",
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Nota capturada!");
    setTitle("");
    setContent("");
    setTags("");
    setOpen(false);
    // trigger refetch via custom event
    window.dispatchEvent(new CustomEvent("notas:refresh"));
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova nota rápida</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            <Textarea placeholder="Conteúdo..." value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
            <Input placeholder="Tags (separadas por vírgula)" value={tags} onChange={(e) => setTags(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
