import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAgibankBlacklist } from "../hooks/useAgibankBlacklist";

interface Props { open: boolean; onClose: () => void; canDelete: boolean; }

export function BlacklistManager({ open, onClose, canDelete }: Props) {
  const { entries, isLoading, fetch, remove } = useAgibankBlacklist();
  useEffect(() => { if (open) fetch(); }, [open, fetch]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Blacklist de telefones</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
          {!isLoading && entries.length === 0 && <p className="text-sm text-muted-foreground">Nenhum telefone na blacklist.</p>}
          {entries.map(e => (
            <div key={e.id} className="flex items-center justify-between border rounded p-2">
              <div>
                <p className="font-mono">{e.phone}</p>
                <p className="text-xs text-muted-foreground">
                  {e.reason || "—"} · {format(new Date(e.created_at), "dd/MM/yyyy HH:mm")}
                </p>
              </div>
              {canDelete && (
                <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
