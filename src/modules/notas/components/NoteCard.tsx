import { Pin, Trash2, Copy, Tag as TagIcon, Archive, ArchiveRestore, Bell, RotateCcw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NOTE_COLORS, LABEL_COLORS, type Note, type NoteLabel } from "../types";
import { extractPreview } from "./BlockEditor";
import { checklistStats } from "./ChecklistNote";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  note: Note;
  onClick: () => void;
  onPin: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onPermanentDelete?: () => void;
  inTrash?: boolean;
  inArchive?: boolean;
  labels?: NoteLabel[];
  noteLabelIds?: string[];
  authorLabel?: string | null;
}

const labelColor = (id: string) => LABEL_COLORS.find((c) => c.id === id)?.className ?? "bg-gray-500";

function formatReminder(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const overdue = d < now;
  return {
    text: d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
    overdue,
  };
}

export function NoteCard({
  note,
  onClick,
  onPin,
  onDelete,
  onDuplicate,
  onArchive,
  onRestore,
  onPermanentDelete,
  inTrash,
  inArchive,
  labels = [],
  noteLabelIds = [],
  authorLabel,
}: Props) {
  const palette = NOTE_COLORS.find((c) => c.id === note.color) ?? NOTE_COLORS[0];
  const isChecklist = note.checklist_mode && Array.isArray(note.content);
  const preview = isChecklist ? "" : extractPreview(note.content, 200);
  const stats = isChecklist ? checklistStats(note.content) : { total: 0, done: 0 };
  const date = new Date(note.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  const reminder = note.reminder_at ? formatReminder(note.reminder_at) : null;
  const noteLabels = labels.filter((l) => noteLabelIds.includes(l.id));

  return (
    <div
      className={cn(
        "group relative cursor-pointer rounded-xl border border-l-4 p-3 hover:shadow-md transition shadow-sm break-inside-avoid mb-3",
        palette.border,
        palette.bg
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-medium text-sm line-clamp-1 flex-1">{note.title || "Sem título"}</h3>
        {!inTrash && (
          <Button
            size="icon"
            variant="ghost"
            className={cn("h-6 w-6 shrink-0", note.pinned && "text-primary")}
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
          >
            <Pin className={cn("h-3.5 w-3.5", note.pinned && "fill-current")} />
          </Button>
        )}
      </div>

      {isChecklist ? (
        <div className="space-y-0.5">
          {(note.content as any[]).slice(0, 5).map((item: any) => (
            <div key={item.id} className="flex items-center gap-1.5 text-xs">
              <Checkbox checked={!!item.checked} className="h-3 w-3 pointer-events-none" />
              <span className={cn("truncate", item.checked && "line-through text-muted-foreground")}>{item.text}</span>
            </div>
          ))}
          {stats.total > 5 && (
            <div className="text-[10px] text-muted-foreground">+ {stats.total - 5} itens</div>
          )}
          {stats.total > 0 && (
            <div className="text-[10px] text-muted-foreground mt-1">{stats.done}/{stats.total} concluídos</div>
          )}
        </div>
      ) : (
        preview && <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{preview}</p>
      )}

      {(note.tags.length > 0 || noteLabels.length > 0 || reminder) && (
        <div className="flex flex-wrap gap-1 mt-2">
          {reminder && (
            <Badge
              variant="secondary"
              className={cn(
                "text-[10px] py-0 px-1.5 h-4 gap-0.5",
                reminder.overdue && "bg-destructive/10 text-destructive"
              )}
            >
              <Bell className="h-2.5 w-2.5" />
              {reminder.text}
            </Badge>
          )}
          {noteLabels.map((l) => (
            <Badge key={l.id} variant="secondary" className="text-[10px] py-0 px-1.5 h-4 gap-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", labelColor(l.color))} />
              {l.name}
            </Badge>
          ))}
          {note.tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
              <TagIcon className="h-2.5 w-2.5 mr-0.5" />
              {t}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{date}</span>
          {authorLabel && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 gap-0.5 max-w-[140px]">
              <User className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{authorLabel}</span>
            </Badge>
          )}
        </div>
        <div className="hidden group-hover:flex gap-0.5">
          {inTrash ? (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); onRestore?.(); }}
                title="Restaurar"
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive"
                onClick={(e) => { e.stopPropagation(); if (confirm("Excluir permanentemente?")) onPermanentDelete?.(); }}
                title="Excluir definitivo"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              {onArchive && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={(e) => { e.stopPropagation(); onArchive(); }}
                  title={inArchive ? "Desarquivar" : "Arquivar"}
                >
                  {inArchive ? <ArchiveRestore className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
                title="Duplicar"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Mover para lixeira"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
