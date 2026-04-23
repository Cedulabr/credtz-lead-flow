import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LABEL_COLORS, type NoteLabel } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  labels: NoteLabel[];
  onCreate: (name: string, color?: string) => Promise<any>;
  onRename: (id: string, name: string, color?: string) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

export function LabelManagerDialog({ open, onClose, labels, onCreate, onRename, onDelete }: Props) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("gray");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("gray");

  const submitNew = async () => {
    if (!newName.trim()) return;
    await onCreate(newName.trim(), newColor);
    setNewName("");
    setNewColor("gray");
  };

  const startEdit = (l: NoteLabel) => {
    setEditingId(l.id);
    setEditName(l.name);
    setEditColor(l.color);
  };

  const saveEdit = async () => {
    if (editingId && editName.trim()) {
      await onRename(editingId, editName.trim(), editColor);
    }
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar marcadores</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center gap-2 border-b pb-3">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Criar marcador..."
              onKeyDown={(e) => e.key === "Enter" && submitNew()}
              className="h-9"
            />
            <ColorPicker value={newColor} onChange={setNewColor} />
            <Button size="icon" variant="ghost" onClick={submitNew}>
              <Check className="h-4 w-4" />
            </Button>
          </div>

          <div className="max-h-80 overflow-auto space-y-1">
            {labels.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum marcador ainda</p>
            )}
            {labels.map((l) => (
              <div key={l.id} className="flex items-center gap-2 group">
                {editingId === l.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit()}
                      autoFocus
                      className="h-9 flex-1"
                    />
                    <ColorPicker value={editColor} onChange={setEditColor} />
                    <Button size="icon" variant="ghost" onClick={saveEdit}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span
                      className={cn("h-3 w-3 rounded-full shrink-0", LABEL_COLORS.find((c) => c.id === l.color)?.className ?? "bg-gray-500")}
                    />
                    <span className="flex-1 text-sm truncate cursor-pointer" onClick={() => startEdit(l)}>{l.name}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => {
                        if (confirm(`Excluir marcador "${l.name}"?`)) onDelete(l.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      {LABEL_COLORS.map((c) => (
        <button
          key={c.id}
          onClick={() => onChange(c.id)}
          className={cn(
            "h-5 w-5 rounded-full border-2 transition",
            c.className,
            value === c.id ? "border-foreground" : "border-transparent"
          )}
          title={c.id}
        />
      ))}
    </div>
  );
}
