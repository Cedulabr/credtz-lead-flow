import { useEffect, useRef, useState } from "react";
import { CheckSquare, Palette, Bell, Archive, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { NOTE_COLORS, type NoteColor, type Note } from "../types";

interface Props {
  onCreate: (partial: Partial<Note>) => Promise<Note | undefined>;
}

export function InlineNoteCreator({ onCreate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [color, setColor] = useState<NoteColor>("white");
  const [checklistMode, setChecklistMode] = useState(false);
  const [reminderAt, setReminderAt] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const palette = NOTE_COLORS.find((c) => c.id === color) ?? NOTE_COLORS[0];

  // shortcut "c" to open
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "c" && !expanded && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setExpanded(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [expanded]);

  const reset = () => {
    setTitle("");
    setBody("");
    setColor("white");
    setChecklistMode(false);
    setReminderAt("");
    setExpanded(false);
  };

  const close = async () => {
    const hasContent = title.trim() || body.trim();
    if (hasContent) {
      let content: any = [];
      if (checklistMode) {
        content = body
          .split("\n")
          .filter((l) => l.trim())
          .map((text, idx) => ({ id: `${Date.now()}-${idx}`, text, checked: false }));
      } else if (body.trim()) {
        content = {
          type: "doc",
          content: body.split("\n").map((line) => ({
            type: "paragraph",
            content: line ? [{ type: "text", text: line }] : [],
          })),
        };
      }
      await onCreate({
        title: title.trim() || null,
        content,
        color,
        checklist_mode: checklistMode,
        reminder_at: reminderAt ? new Date(reminderAt).toISOString() : null,
      });
    }
    reset();
  };

  // click outside
  useEffect(() => {
    if (!expanded) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, title, body, color, checklistMode, reminderAt]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        ref={ref}
        className={cn(
          "rounded-lg border shadow-sm transition-all",
          palette.bg,
          expanded ? "p-3" : "p-2 hover:shadow-md cursor-text"
        )}
        onClick={() => !expanded && setExpanded(true)}
      >
        {expanded && (
          <Input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título"
            className="border-0 bg-transparent shadow-none px-2 font-medium focus-visible:ring-0 mb-1"
          />
        )}

        <div className="flex items-center gap-2">
          {checklistMode && expanded && (
            <CheckSquare className="h-4 w-4 text-muted-foreground ml-2" />
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={expanded ? (checklistMode ? "Item da lista (uma por linha)" : "Criar uma nota...") : "Criar uma nota..."}
            rows={expanded ? 3 : 1}
            className="flex-1 resize-none bg-transparent outline-none text-sm px-2 py-1.5 placeholder:text-muted-foreground"
            onFocus={() => setExpanded(true)}
          />

          {!expanded && (
            <div className="flex items-center gap-1 pr-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setChecklistMode(true);
                  setExpanded(true);
                }}
                title="Nova lista"
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setExpanded(true); }} title="Lembrete">
                <Bell className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {expanded && (
          <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/40">
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className={cn("h-8 w-8", checklistMode && "text-primary")}
                onClick={() => setChecklistMode((p) => !p)}
                title="Modo checklist"
              >
                <CheckSquare className="h-4 w-4" />
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Cor">
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                    {NOTE_COLORS.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setColor(c.id)}
                        className={cn(
                          "h-7 w-7 rounded-full border-2 transition",
                          c.bg,
                          color === c.id ? "border-foreground scale-110" : "border-border"
                        )}
                        title={c.label}
                      />
                    ))}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" className={cn("h-8 w-8", reminderAt && "text-primary")} title="Lembrete">
                    <Bell className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-2">
                  <Input
                    type="datetime-local"
                    value={reminderAt}
                    onChange={(e) => setReminderAt(e.target.value)}
                    className="h-8 text-xs"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button size="sm" variant="ghost" onClick={close}>
              Fechar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
