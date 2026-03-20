import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Target, DollarSign, Settings, MessageSquare, BarChart3, RefreshCw } from "lucide-react";
import { UserData, PERMISSION_MODULES, PERMISSION_CATEGORIES } from "./types";
import { UserAvatar } from "./UserAvatar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  comercial: ShoppingCart,
  leads: Target,
  financeiro: DollarSign,
  sistema: Settings,
  comunicacao: MessageSquare,
  relatorios: BarChart3,
};

interface UserPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSave: (userId: string, permissions: Record<string, boolean>) => void;
}

export function UserPermissionsModal({ open, onOpenChange, user, onSave }: UserPermissionsModalProps) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [syncing, setSyncing] = useState(false);
  const { isAdmin } = useAuth();

  const handleSyncModules = async () => {
    setSyncing(true);
    try {
      const columnNames = PERMISSION_MODULES.map(m => m.key);
      const { data, error } = await supabase.rpc('sync_permission_columns', {
        column_names: columnNames,
      } as any);

      if (error) throw error;

      const result = data as any;
      const added = result?.added || [];
      if (added.length > 0) {
        toast.success(`${added.length} novo(s) módulo(s) sincronizado(s): ${added.join(', ')}`);
      } else {
        toast.info('Todos os módulos já estão sincronizados');
      }
    } catch (err: any) {
      toast.error('Erro ao sincronizar: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    if (user) {
      const current: Record<string, boolean> = {};
      PERMISSION_MODULES.forEach((mod) => {
        current[mod.key] = (user as any)[mod.key] !== false;
      });
      setPermissions(current);
    }
  }, [user]);

  if (!user) return null;

  const grouped = PERMISSION_CATEGORIES.map((cat) => ({
    ...cat,
    modules: PERMISSION_MODULES.filter((m) => m.category === cat.id),
  })).filter((g) => g.modules.length > 0);

  const enabledCount = Object.values(permissions).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <UserAvatar name={user.name || "?"} size="sm" />
            <div>
              <DialogTitle className="text-base">Gerenciar Permissões</DialogTitle>
              <p className="text-xs text-muted-foreground">{user.name || user.email}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <Badge variant="secondary" className="text-xs">
            {enabledCount}/{PERMISSION_MODULES.length} ativas
          </Badge>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncModules}
              disabled={syncing}
              className="h-7 text-xs gap-1"
            >
              <RefreshCw className={cn("h-3 w-3", syncing && "animate-spin")} />
              Sincronizar Módulos
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {grouped.map((group) => {
            const Icon = CATEGORY_ICONS[group.id] || Settings;
            return (
              <div key={group.id}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </span>
                </div>
                <div className="space-y-1">
                  {group.modules.map((mod) => (
                    <div
                      key={mod.key}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <Label htmlFor={mod.key} className="font-medium text-sm cursor-pointer">
                          {mod.label}
                        </Label>
                        <p className="text-[11px] text-muted-foreground">{mod.description}</p>
                      </div>
                      <Switch
                        id={mod.key}
                        checked={permissions[mod.key] ?? mod.defaultValue}
                        onCheckedChange={(checked) =>
                          setPermissions((prev) => ({ ...prev, [mod.key]: checked }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(user.id, permissions)}>
            Salvar Permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
