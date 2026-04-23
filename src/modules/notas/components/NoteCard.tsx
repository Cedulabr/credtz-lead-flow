import { Pin, Trash2, Copy, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NOTE_COLORS, type Note } from "../types";
import { extractPreview } from "./BlockEditor";

interface Props {
  note: Note;
  onClick: () => void;
  onPin: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function NoteCard({ note, onClick, onPin, onDelete, onDuplicate }: Props) {
  const palette = NOTE_COLORS.find((c) => c.id === note.color) ?? NOTE_COLORS[0];
  const preview = extractPreview(note.content, 200);
  const date = new Date(note.updated_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  return (
    <div
      className={cn(
        "group relative cursor-pointer rounded-lg border border-l-4 p-3 hover:shadow-md transition break-inside-avoid mb-3",
        palette.border,
        palette.bg
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-medium text-sm line-clamp-1 flex-1">{note.title || "Sem título"}</h3>
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
      </div>

      {preview && <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">{preview}</p>}

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {note.tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] py-0 px-1.5 h-4">
              <TagIcon className="h-2.5 w-2.5 mr-0.5" />
              {t}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
        <span className="text-[10px] text-muted-foreground">{date}</span>
        <div className="hidden group-hover:flex gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
          >
            <Copy className="h-3 w-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm("Excluir esta nota?")) onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
