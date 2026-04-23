import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface Props {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  compact?: boolean;
}

export function ChecklistNote({ items, onChange, compact }: Props) {
  const [newText, setNewText] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);

  const open = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);

  const add = () => {
    if (!newText.trim()) return;
    onChange([...items, { id: crypto.randomUUID(), text: newText.trim(), checked: false }]);
    setNewText("");
  };

  const toggle = (id: string) => {
    onChange(items.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)));
  };

  const remove = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const update = (id: string, text: string) => {
    onChange(items.map((i) => (i.id === id ? { ...i, text } : i)));
  };

  return (
    <div className={cn("space-y-1", compact && "text-xs")}>
      {open.map((it) => (
        <div key={it.id} className="flex items-center gap-2 group">
          <Checkbox checked={false} onCheckedChange={() => toggle(it.id)} className="shrink-0" />
          {compact ? (
            <span className="flex-1 truncate">{it.text}</span>
          ) : (
            <Input
              value={it.text}
              onChange={(e) => update(it.id, e.target.value)}
              className="h-7 border-0 bg-transparent shadow-none px-1 focus-visible:ring-0"
            />
          )}
          {!compact && (
            <button onClick={() => remove(it.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}

      {!compact && (
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Item da lista"
            className="h-7 border-0 bg-transparent shadow-none px-1 focus-visible:ring-0"
          />
        </div>
      )}

      {done.length > 0 && (
        <div className="pt-2 mt-2 border-t border-border/40">
          {!compact && (
            <button
              onClick={() => setShowCompleted((p) => !p)}
              className="text-xs text-muted-foreground hover:text-foreground mb-1"
            >
              {showCompleted ? "▾" : "▸"} {done.length} concluídos
            </button>
          )}
          {compact && (
            <div className="text-xs text-muted-foreground mb-1">{done.length} concluídos</div>
          )}
          {showCompleted &&
            done.map((it) => (
              <div key={it.id} className="flex items-center gap-2 group opacity-60">
                <Checkbox checked={true} onCheckedChange={() => toggle(it.id)} className="shrink-0" />
                {compact ? (
                  <span className="flex-1 truncate line-through">{it.text}</span>
                ) : (
                  <Input
                    value={it.text}
                    onChange={(e) => update(it.id, e.target.value)}
                    className="h-7 border-0 bg-transparent shadow-none px-1 line-through focus-visible:ring-0"
                  />
                )}
                {!compact && (
                  <button onClick={() => remove(it.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export function checklistStats(items: any): { total: number; done: number } {
  if (!Array.isArray(items)) return { total: 0, done: 0 };
  return { total: items.length, done: items.filter((i: any) => i?.checked).length };
}
