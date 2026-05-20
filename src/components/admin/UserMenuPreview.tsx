import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUserMenu } from "@/hooks/useUserMenu";
import { getIcon } from "@/config/modules";
import { ChevronDown } from "lucide-react";

interface Props {
  userId: string;
  onClose: () => void;
}

export function UserMenuPreview({ userId, onClose }: Props) {
  const { sections, isLoading } = useUserMenu(userId);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Pré-visualização do menu</DialogTitle>
        </DialogHeader>
        <div className="rounded-lg border bg-card overflow-hidden">
          <div className="p-3 text-xs text-muted-foreground border-b">Como este usuário verá:</div>
          <div className="p-2 space-y-0.5 max-h-[60vh] overflow-y-auto">
            {isLoading && <div className="p-4 text-sm text-muted-foreground">Carregando...</div>}
            {!isLoading && sections.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">
                Nenhum módulo ativo. O usuário só verá os itens fixos (Início, Meus Dados, Marketplace, Faturamento, Indicar).
              </div>
            )}
            {sections.map((s) => {
              const SI = getIcon(s.icon);
              return (
                <div key={s.categoryKey}>
                  <div className="flex items-center gap-2 px-2.5 py-1.5 text-sm font-medium">
                    <SI className="h-4 w-4" />
                    <span className="flex-1">{s.label}</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </div>
                  <div className="pl-8 space-y-0.5 pb-1">
                    {s.items.map((it) => {
                      const II = getIcon(it.icon);
                      return (
                        <div key={it.moduleKey} className="flex items-center gap-2 px-2 py-1 text-[12.5px] text-foreground/80">
                          <II className="h-3.5 w-3.5" />
                          {it.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
