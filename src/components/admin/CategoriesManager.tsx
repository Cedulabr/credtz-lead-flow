import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useMenuCategories, type MenuCategory } from "@/hooks/useUserMenu";
import { ICON_LIBRARY, getIcon } from "@/config/modules";
import { cn } from "@/lib/utils";

export function CategoriesManager() {
  const qc = useQueryClient();
  const { data: categories = [] } = useMenuCategories();
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("Folder");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["menu_categories"] });

  const createMut = useMutation({
    mutationFn: async () => {
      if (!newKey || !newLabel) throw new Error("Preencha chave e rótulo");
      const slug = newKey.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      const { error } = await supabase.from("menu_categories" as any).insert({
        key: slug, label: newLabel, icon: newIcon,
        position: (categories[categories.length - 1]?.position ?? 0) + 10,
        is_system: false,
      });
      if (error) throw error;
      await supabase.rpc("log_admin_action" as any, {
        _action: "category_created", _module_key: null, _target_user_id: null,
        _payload: { key: slug, label: newLabel } as any,
      });
    },
    onSuccess: () => {
      toast.success("Categoria criada");
      setNewKey(""); setNewLabel(""); setNewIcon("Folder");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  const updateMut = useMutation({
    mutationFn: async (cat: MenuCategory & { newLabel?: string; newPosition?: number; newIcon?: string }) => {
      const { error } = await supabase.from("menu_categories" as any).update({
        label: cat.newLabel ?? cat.label,
        position: cat.newPosition ?? cat.position,
        icon: cat.newIcon ?? cat.icon,
      }).eq("id", cat.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Atualizado"); invalidate(); },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  const deleteMut = useMutation({
    mutationFn: async (cat: MenuCategory) => {
      const { error } = await supabase.from("menu_categories" as any).delete().eq("id", cat.id);
      if (error) throw error;
      await supabase.rpc("log_admin_action" as any, {
        _action: "category_deleted", _module_key: null, _target_user_id: null,
        _payload: { key: cat.key } as any,
      });
    },
    onSuccess: () => { toast.success("Categoria removida"); invalidate(); },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Nova categoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Chave (slug)</Label>
            <Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="minha_categoria" />
          </div>
          <div>
            <Label className="text-xs">Rótulo</Label>
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Minha Categoria" />
          </div>
          <div>
            <Label className="text-xs">Ícone</Label>
            <div className="mt-1 flex items-center gap-2">
              {(() => { const I = getIcon(newIcon); return <I className="h-5 w-5" />; })()}
              <select
                className="flex-1 h-9 rounded-md border bg-background px-2 text-sm"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
              >
                {Object.keys(ICON_LIBRARY).map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
        </div>
        <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
          <Plus className="h-4 w-4 mr-1" /> Criar categoria
        </Button>
      </Card>

      <Card className="p-4 space-y-2">
        <h3 className="font-semibold mb-2">Categorias existentes</h3>
        {categories.map((c) => {
          const Icon = getIcon(c.icon);
          return (
            <div key={c.id} className={cn(
              "flex items-center gap-3 p-2.5 rounded-lg border",
              c.is_system && "bg-muted/30"
            )}>
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <Icon className="h-5 w-5 text-muted-foreground" />
              <Input
                className="max-w-xs"
                defaultValue={c.label}
                onBlur={(e) => {
                  if (e.target.value !== c.label) updateMut.mutate({ ...c, newLabel: e.target.value });
                }}
              />
              <Input
                type="number"
                className="w-20"
                defaultValue={c.position}
                onBlur={(e) => {
                  const v = parseInt(e.target.value || "0", 10);
                  if (v !== c.position) updateMut.mutate({ ...c, newPosition: v });
                }}
              />
              <code className="text-xs text-muted-foreground flex-1">{c.key}</code>
              {c.is_system && <Badge variant="secondary">Sistema</Badge>}
              <Button
                size="icon"
                variant="ghost"
                disabled={c.is_system}
                onClick={() => {
                  if (confirm(`Excluir categoria "${c.label}"?`)) deleteMut.mutate(c);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
