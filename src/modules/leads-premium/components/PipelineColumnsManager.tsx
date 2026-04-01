import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePipelineColumns, PipelineColumn } from "../hooks/usePipelineColumns";
import { ArrowUp, ArrowDown, Plus, Trash2, Pencil, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PipelineColumnsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLOR_PRESETS = [
  { label: "Azul", from: "from-blue-500", to: "to-blue-600", text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
  { label: "Verde", from: "from-emerald-500", to: "to-green-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500" },
  { label: "Roxo", from: "from-purple-500", to: "to-fuchsia-500", text: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-500" },
  { label: "Vermelho", from: "from-rose-500", to: "to-red-500", text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", dot: "bg-rose-500" },
  { label: "Amarelo", from: "from-amber-500", to: "to-orange-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
  { label: "Ciano", from: "from-cyan-500", to: "to-teal-500", text: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200", dot: "bg-cyan-500" },
  { label: "Teal", from: "from-teal-500", to: "to-cyan-500", text: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200", dot: "bg-teal-500" },
  { label: "Cinza", from: "from-stone-500", to: "to-stone-700", text: "text-stone-700", bg: "bg-stone-50", border: "border-stone-300", dot: "bg-stone-500" },
  { label: "Indigo", from: "from-indigo-500", to: "to-violet-500", text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", dot: "bg-indigo-500" },
];

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function PipelineColumnsManager({ open, onOpenChange }: PipelineColumnsManagerProps) {
  const { columns, addColumn, updateColumn, removeColumn, reorderColumns } = usePipelineColumns();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editColorIdx, setEditColorIdx] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColorIdx, setNewColorIdx] = useState(0);

  const startEdit = (col: PipelineColumn) => {
    setEditingId(col.id);
    setEditLabel(col.label);
    const idx = COLOR_PRESETS.findIndex(p => p.from === col.color_from);
    setEditColorIdx(idx >= 0 ? idx : 0);
  };

  const saveEdit = () => {
    if (!editingId || !editLabel.trim()) return;
    const preset = COLOR_PRESETS[editColorIdx];
    updateColumn.mutate({
      id: editingId,
      label: editLabel.trim(),
      color_from: preset.from,
      color_to: preset.to,
      text_color: preset.text,
      bg_color: preset.bg,
      border_color: preset.border,
      dot_color: preset.dot,
    });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newLabel.trim()) {
      toast.error("Digite um nome para a coluna");
      return;
    }
    const key = slugify(newLabel);
    if (columns.some(c => c.column_key === key)) {
      toast.error("Já existe uma coluna com esse nome");
      return;
    }
    const preset = COLOR_PRESETS[newColorIdx];
    const maxOrder = Math.max(...columns.map(c => c.sort_order), 0);
    addColumn.mutate({
      column_key: key,
      label: newLabel.trim(),
      icon: "Circle",
      color_from: preset.from,
      color_to: preset.to,
      text_color: preset.text,
      bg_color: preset.bg,
      border_color: preset.border,
      dot_color: preset.dot,
      sort_order: maxOrder + 1,
    });
    setNewLabel("");
    setShowAdd(false);
  };

  const handleRemove = (col: PipelineColumn) => {
    if (confirm(`Remover a coluna "${col.label}"? Leads nesse status não serão afetados.`)) {
      removeColumn.mutate(col.id);
    }
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= columns.length) return;
    const newCols = [...columns];
    [newCols[index], newCols[newIndex]] = [newCols[newIndex], newCols[index]];
    reorderColumns.mutate(
      newCols.map((c, i) => ({ id: c.id, sort_order: i + 1 }))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Colunas do Kanban</DialogTitle>
          <DialogDescription>
            Adicione, edite, reordene ou remova as seções do funil de vendas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {columns.map((col, index) => (
            <div
              key={col.id}
              className={cn(
                "flex items-center gap-2 p-3 rounded-lg border",
                col.border_color, col.bg_color
              )}
            >
              {editingId === col.id ? (
                <div className="flex-1 space-y-2">
                  <Input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    placeholder="Nome da coluna"
                    className="h-8"
                  />
                  <Select value={String(editColorIdx)} onValueChange={(v) => setEditColorIdx(Number(v))}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_PRESETS.map((p, i) => (
                        <SelectItem key={i} value={String(i)}>
                          <div className="flex items-center gap-2">
                            <div className={cn("w-3 h-3 rounded-full", p.dot)} />
                            {p.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={saveEdit} disabled={updateColumn.isPending}>
                      <Save className="h-3.5 w-3.5 mr-1" /> Salvar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className={cn("w-3 h-3 rounded-full flex-shrink-0", col.dot_color)} />
                  <span className={cn("flex-1 text-sm font-medium", col.text_color)}>
                    {col.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{col.column_key}</span>
                  <div className="flex items-center gap-0.5">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveColumn(index, -1)} disabled={index === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveColumn(index, 1)} disabled={index === columns.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(col)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleRemove(col)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {showAdd ? (
          <div className="p-3 rounded-lg border border-dashed space-y-2">
            <Label className="text-xs">Nova Coluna</Label>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex: Em Análise"
              className="h-8"
            />
            <Select value={String(newColorIdx)} onValueChange={(v) => setNewColorIdx(Number(v))}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_PRESETS.map((p, i) => (
                  <SelectItem key={i} value={String(i)}>
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-3 rounded-full", p.dot)} />
                      {p.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAdd} disabled={addColumn.isPending}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Coluna
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
