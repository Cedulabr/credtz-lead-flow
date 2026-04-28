import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Pin, Tag as TagIcon, Bell, Archive, Trash2, CheckSquare, MoreHorizontal, User } from "lucide-react";
import { BlockEditor } from "./BlockEditor";
import { ChecklistNote, type ChecklistItem } from "./ChecklistNote";
import { NOTE_COLORS, LABEL_COLORS, type Note, type NoteColor, type NoteLabel } from "../types";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  note: Note | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Note>) => Promise<any>;
  labels?: NoteLabel[];
  noteLabelIds?: string[];
  onToggleLabel?: (labelId: string) => Promise<any> | void;
  onArchive?: () => void;
  onTrash?: () => void;
  authorLabel?: string | null;
}

const labelColor = (id: string) => LABEL_COLORS.find((c) => c.id === id)?.className ?? "bg-gray-500";

export function NoteEditor({
  note,
  open,
  onClose,
  onUpdate,
  labels = [],
  noteLabelIds = [],
  onToggleLabel,
  onArchive,
  onTrash,
  authorLabel,
}: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [color, setColor] = useState<NoteColor>("white");
  const [pinned, setPinned] = useState(false);
  const [reminderAt, setReminderAt] = useState<string>("");
  const [checklistMode, setChecklistMode] = useState(false);
  const [savingState, setSavingState] = useState<"saved" | "saving" | "idle">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (note) {
      setTitle(note.title ?? "");
      setContent(note.content ?? (note.checklist_mode ? [] : []));
      setTags(note.tags ?? []);
      setColor(note.color);
      setPinned(note.pinned);
      setReminderAt(note.reminder_at ? note.reminder_at.slice(0, 16) : "");
      setChecklistMode(!!note.checklist_mode);
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
        checklist_mode: checklistMode,
      });
      setSavingState("saved");
    }, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, tags, color, pinned, reminderAt, checklistMode]);

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) setTags((p) => [...p, v]);
    setTagInput("");
  };

  const toggleChecklistMode = () => {
    if (!checklistMode) {
      // converting to checklist: try to parse current content paragraphs to items
      let items: ChecklistItem[] = [];
      if (Array.isArray(content)) {
        items = content as ChecklistItem[];
      } else if (content?.content) {
        items = (content.content as any[])
          .map((p) => p?.content?.[0]?.text)
          .filter(Boolean)
          .map((text: string) => ({ id: crypto.randomUUID(), text, checked: false }));
      }
      setContent(items);
    } else {
      // converting back to text doc
      const items = (Array.isArray(content) ? content : []) as ChecklistItem[];
      setContent({
        type: "doc",
        content: items.map((i) => ({
          type: "paragraph",
          content: i.text ? [{ type: "text", text: i.text }] : [],
        })),
      });
    }
    setChecklistMode((p) => !p);
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
            <Button size="icon" variant="ghost" onClick={toggleChecklistMode} title="Caixas de seleção">
              <CheckSquare className={cn("h-4 w-4", checklistMode && "text-primary")} />
            </Button>
            {onArchive && (
              <Button size="icon" variant="ghost" onClick={onArchive} title={note.archived ? "Desarquivar" : "Arquivar"}>
                <Archive className="h-4 w-4" />
              </Button>
            )}
            {onTrash && (
              <Button size="icon" variant="ghost" onClick={onTrash} title="Mover para lixeira">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
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

          {/* Labels */}
          {labels.length > 0 && onToggleLabel && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                    <MoreHorizontal className="h-3 w-3" />
                    Marcadores
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-1">
                  <div className="max-h-60 overflow-auto">
                    {labels.map((l) => {
                      const active = noteLabelIds.includes(l.id);
                      return (
                        <button
                          key={l.id}
                          onClick={() => onToggleLabel(l.id)}
                          className={cn(
                            "w-full flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-muted",
                            active && "bg-muted"
                          )}
                        >
                          <span className={cn("h-2 w-2 rounded-full", labelColor(l.color))} />
                          <span className="flex-1 text-left truncate">{l.name}</span>
                          {active && <span className="text-xs text-primary">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
              {labels
                .filter((l) => noteLabelIds.includes(l.id))
                .map((l) => (
                  <Badge key={l.id} variant="secondary" className="gap-1 text-xs">
                    <span className={cn("h-1.5 w-1.5 rounded-full", labelColor(l.color))} />
                    {l.name}
                    <button onClick={() => onToggleLabel(l.id)} className="hover:text-destructive ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
            </div>
          )}

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

          {checklistMode ? (
            <ChecklistNote
              items={Array.isArray(content) ? content : []}
              onChange={(items) => setContent(items)}
            />
          ) : (
            <BlockEditor value={content} onChange={setContent} placeholder="Comece a escrever sua nota..." minHeight={300} />
          )}
        </div>

        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
          <span>{wordCount} palavras</span>
          <span>Editado em {new Date(note.updated_at).toLocaleString("pt-BR")}</span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
