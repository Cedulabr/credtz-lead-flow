import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MODULE_CATALOG, MODULE_BY_KEY } from "@/config/modules";

export interface MenuCategory {
  id: string;
  key: string;
  label: string;
  icon: string | null;
  position: number;
  is_system: boolean;
}

export interface ModulePermission {
  id: string;
  user_id: string;
  module_key: string;
  is_active: boolean;
  category_key: string;
  display_name: string | null;
  icon: string | null;
  position: number;
}

export interface MenuItem {
  moduleKey: string;
  label: string;
  icon: string;
  position: number;
}

export interface MenuSection {
  categoryKey: string;
  label: string;
  icon: string;
  position: number;
  items: MenuItem[];
}

/** Fetch categories (everyone can read). */
export function useMenuCategories() {
  return useQuery({
    queryKey: ["menu_categories"],
    queryFn: async (): Promise<MenuCategory[]> => {
      const { data, error } = await supabase
        .from("menu_categories" as any)
        .select("*")
        .order("position");
      if (error) throw error;
      return (data as any) || [];
    },
    staleTime: 60_000,
  });
}

/** Fetch module_permissions for a specific user (admin) or current user. */
export function useUserModulePermissions(userId?: string) {
  const { user } = useAuth();
  const targetId = userId ?? user?.id;
  return useQuery({
    queryKey: ["module_permissions", targetId],
    enabled: !!targetId,
    queryFn: async (): Promise<ModulePermission[]> => {
      const { data, error } = await supabase
        .from("module_permissions" as any)
        .select("*")
        .eq("user_id", targetId);
      if (error) throw error;
      return (data as any) || [];
    },
    staleTime: 30_000,
  });
}

/**
 * Build the user's grouped menu from categories + active permissions.
 * Categories with zero active items are dropped.
 */
export function useUserMenu(userId?: string) {
  const cats = useMenuCategories();
  const perms = useUserModulePermissions(userId);

  const isLoading = cats.isLoading || perms.isLoading;

  const sections: MenuSection[] = [];
  if (!isLoading && cats.data && perms.data) {
    const activePerms = perms.data.filter((p) => p.is_active);
    const byCat = new Map<string, MenuItem[]>();
    for (const p of activePerms) {
      const def = MODULE_BY_KEY[p.module_key];
      if (!def) continue;
      const item: MenuItem = {
        moduleKey: p.module_key,
        label: p.display_name || def.defaultLabel,
        icon: p.icon || def.defaultIcon,
        position: p.position ?? 0,
      };
      const arr = byCat.get(p.category_key) || [];
      arr.push(item);
      byCat.set(p.category_key, arr);
    }
    for (const c of cats.data) {
      const items = (byCat.get(c.key) || []).sort((a, b) => a.position - b.position);
      if (items.length === 0) continue;
      sections.push({
        categoryKey: c.key,
        label: c.label,
        icon: c.icon || "Folder",
        position: c.position,
        items,
      });
    }
    sections.sort((a, b) => a.position - b.position);
  }

  return { sections, isLoading, categories: cats.data || [], permissions: perms.data || [] };
}

/** Returns a map of moduleKey -> boolean (active). Used by Index.tsx gating. */
export function useActiveModuleMap() {
  const { permissions } = useUserMenu();
  const map: Record<string, boolean> = {};
  for (const p of permissions) map[p.module_key] = p.is_active;
  return map;
}

export { MODULE_CATALOG };
