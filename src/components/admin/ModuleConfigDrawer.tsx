import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MODULE_BY_KEY, ICON_LIBRARY, getIcon } from "@/config/modules";
import { MODULE_TO_PROFILE_FLAG } from "@/config/permissionFlags";
import type { MenuCategory, ModulePermission } from "@/hooks/useUserMenu";
import { cn } from "@/lib/utils";

interface Props {
  moduleKey: string;
  userId: string;
  current?: ModulePermission;
  categories: MenuCategory[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const ICON_NAMES = Object.keys(ICON_LIBRARY);

export function ModuleConfigDrawer({ moduleKey, userId, current, categories, open, onClose, onSaved }: Props) {
  const def = MODULE_BY_KEY[moduleKey];
  const [isActive, setIsActive] = useState(current?.is_active ?? false);
  const [categoryKey, setCategoryKey] = useState(current?.category_key ?? def?.defaultCategory ?? "");
  const [displayName, setDisplayName] = useState(current?.display_name ?? def?.defaultLabel ?? "");
  const [icon, setIcon] = useState(current?.icon ?? def?.defaultIcon ?? "Folder");
  const [position, setPosition] = useState<number>(current?.position ?? 0);
  const [expiresAt, setExpiresAt] = useState<string>(current?.expires_at ? current.expires_at.split('T')[0] : "");

  useEffect(() => {
    setIsActive(current?.is_active ?? false);
    setCategoryKey(current?.category_key ?? def?.defaultCategory ?? "");
    setDisplayName(current?.display_name ?? def?.defaultLabel ?? "");
    setIcon(current?.icon ?? def?.defaultIcon ?? "Folder");
    setPosition(current?.position ?? 0);
    setExpiresAt(current?.expires_at ? current.expires_at.split('T')[0] : "");
  }, [current, def]);

  const save = useMutation({
    mutationFn: async () => {
      const row = {
        user_id: userId,
        module_key: moduleKey,
        is_active: isActive,
        category_key: categoryKey,
        display_name: displayName || null,
        icon,
        position,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };
      const { error } = await supabase
        .from("module_permissions" as any)
        .upsert(row, { onConflict: "user_id,module_key" });
      if (error) throw error;
      const legacyFlag = MODULE_TO_PROFILE_FLAG[moduleKey];
      if (legacyFlag) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ [legacyFlag]: isActive } as any)
          .eq("id", userId);
        if (profileError) throw profileError;
      }
      await supabase.rpc("log_admin_action" as any, {
        _action: "module_configured",
        _module_key: moduleKey,
        _target_user_id: userId,
        _payload: row as any,
      });
    },
    onSuccess: () => {
      toast.success("Configuração salva");
      onSaved();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  if (!def) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configurar: {def.defaultLabel}</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 py-5">
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <Label className="text-sm">Módulo ativo</Label>
              <p className="text-xs text-muted-foreground">Visível no menu deste usuário</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div>
            <Label className="text-sm">Categoria do menu</Label>
            <Select value={categoryKey} onValueChange={setCategoryKey}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground mt-1">
              Para criar nova categoria, vá em "Categorias".
            </p>
          </div>

          <div>
            <Label className="text-sm">Nome de exibição</Label>
            <Input
              className="mt-1.5"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={def.defaultLabel}
            />
          </div>

          <div>
            <Label className="text-sm">Ícone</Label>
            <div className="mt-1.5 grid grid-cols-8 gap-1.5 p-2 border rounded-lg max-h-48 overflow-y-auto">
              {ICON_NAMES.map((name) => {
                const I = getIcon(name);
                const selected = icon === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
                    className={cn(
                      "h-9 w-9 inline-flex items-center justify-center rounded-md transition-colors",
                      selected ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                    )}
                    title={name}
                  >
                    <I className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-sm">Posição (ordem)</Label>
            <Input
              type="number"
              className="mt-1.5"
              value={position}
              onChange={(e) => setPosition(parseInt(e.target.value || "0", 10))}
            />
          </div>

          <div>
            <Label className="text-sm">Expira em</Label>
            <Input
              type="date"
              className="mt-1.5"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Deixe vazio para acesso permanente.
            </p>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
