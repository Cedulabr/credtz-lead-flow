import { Bell, X, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Note } from "../types";
import { extractPreview } from "./BlockEditor";

interface Props {
  alerts: Note[];
  onDismiss: (noteId: string) => void;
  onDismissAll: () => void;
  onOpenNote?: (note: Note) => void;
}

export function ReminderAlertDialog({
  alerts,
  onDismiss,
  onDismissAll,
  onOpenNote,
}: Props) {
  const open = alerts.length > 0;
  const current = alerts[0];

  if (!current) return null;

  const preview =
    !current.checklist_mode && current.content
      ? extractPreview(current.content, 240)
      : "";
  const checklistItems = current.checklist_mode && Array.isArray(current.content)
    ? (current.content as any[]).slice(0, 8)
    : [];

  const reminderDate = current.reminder_at
    ? new Date(current.reminder_at).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDismiss(current.id)}>
      <DialogContent
        className={cn(
          "max-w-2xl p-0 overflow-hidden border-2 border-primary/40",
          "shadow-[0_0_60px_-10px_hsl(var(--primary)/0.6)]",
          "animate-in fade-in zoom-in-95 duration-300"
        )}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground px-6 py-5 flex items-start gap-3">
          <div className="rounded-full bg-primary-foreground/20 p-3 animate-pulse">
            <BellRing className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest opacity-90">
              Lembrete agora
            </p>
            <h2 className="text-2xl font-bold leading-tight mt-0.5 truncate">
              {current.title || "Sem título"}
            </h2>
            <p className="text-sm opacity-90 mt-1">{reminderDate}</p>
          </div>
          {alerts.length > 1 && (
            <span className="rounded-full bg-primary-foreground/20 text-xs font-semibold px-3 py-1 whitespace-nowrap">
              +{alerts.length - 1} outros
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[50vh] overflow-auto bg-background">
          {checklistItems.length > 0 ? (
            <ul className="space-y-2">
              {checklistItems.map((item: any) => (
                <li
                  key={item.id}
                  className={cn(
                    "flex items-start gap-2 text-base",
                    item.checked && "line-through text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "mt-1 h-4 w-4 rounded border-2 flex-shrink-0",
                      item.checked
                        ? "bg-primary border-primary"
                        : "border-muted-foreground"
                    )}
                  />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          ) : preview ? (
            <p className="text-base whitespace-pre-wrap leading-relaxed">
              {preview}
            </p>
          ) : (
            <p className="text-muted-foreground italic">
              Esta nota não tem conteúdo adicional.
            </p>
          )}

          {current.tags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {current.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs bg-muted rounded px-2 py-0.5 text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-muted/30 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2">
          {alerts.length > 1 ? (
            <Button variant="ghost" size="sm" onClick={onDismissAll}>
              <X className="h-4 w-4 mr-1" />
              Dispensar todos
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2 justify-end">
            <Button variant="outline" onClick={() => onDismiss(current.id)}>
              Dispensar
            </Button>
            {onOpenNote && (
              <Button
                onClick={() => {
                  onOpenNote(current);
                  onDismiss(current.id);
                }}
              >
                <Bell className="h-4 w-4 mr-2" />
                Abrir nota
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
