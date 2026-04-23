import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Pin, Tag as TagIcon, Bell } from "lucide-react";
import { BlockEditor } from "./BlockEditor";
import { NOTE_COLORS, type Note, type NoteColor } from "../types";
import { cn } from "@/lib/utils";

interface Props {
  note: Note | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Note>) => Promise<any>;
}

export function NoteEditor({ note, open, onClose, onUpdate }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [color, setColor] = useState<NoteColor>("white");
  const [pinned, setPinned] = useState(false);
  const [reminderAt, setReminderAt] = useState<string>("");
  const [savingState, setSavingState] = useState<"saved" | "saving" | "idle">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title ?? "");
      setContent(note.content ?? []);
      setTags(note.tags ?? []);
      setColor(note.color);
      setPinned(note.pinned);
      setReminderAt(note.reminder_at ? note.reminder_at.slice(0, 16) : "");
      setSavingState("saved");
    }
  }, [note]);

  useEffect(() => {
    if (!note || !open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSavingState("saving");
    debounceRef.current = setTimeout(async () => {
      await onUpdate(note.id, {
        title,
        content,
        tags,
        color,
        pinned,
        reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
      });
      setSavingState("saved");
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, tags, color, pinned, reminderAt]);

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) setTags((p) => [...p, v]);
    setTagInput("");
  };

  if (!note) return null;
  const palette = NOTE_COLORS.find((c) => c.id === color) ?? NOTE_COLORS[0];
  const wordCount = JSON.stringify(content).split(/\s+/).filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className={cn("w-full sm:max-w-2xl p-0 flex flex-col", palette.bg)}>
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {savingState === "saving" ? "Salvando..." : "Salvo"}
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className={cn(pinned && "text-primary")} onClick={() => setPinned(!pinned)}>
              <Pin className={cn("h-4 w-4", pinned && "fill-current")} />
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="text-xl font-semibold border-0 bg-transparent shadow-none px-0 focus-visible:ring-0"
          />

          <div className="flex flex-wrap items-center gap-2">
            <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1">
                {t}
                <button onClick={() => setTags((p) => p.filter((x) => x !== t))} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Adicionar tag..."
              className="h-7 w-32 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition",
                    c.bg,
                    color === c.id ? "border-foreground scale-110" : "border-border"
                  )}
                  title={c.label}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="datetime-local"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
                className="h-7 text-xs w-48"
              />
            </div>
          </div>

          <BlockEditor value={content} onChange={setContent} placeholder="Comece a escrever sua nota..." minHeight={300} />
        </div>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>{wordCount} palavras</span>
          <span>Editado em {new Date(note.updated_at).toLocaleString("pt-BR")}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
