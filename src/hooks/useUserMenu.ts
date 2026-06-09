import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MODULE_CATALOG, MODULE_BY_KEY } from "@/config/modules";
import { MODULE_TO_PROFILE_FLAG } from "@/config/permissionFlags";

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
  expires_at?: string | null;
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
    refetchOnMount: "always",
  });
}

/** Fetch module_permissions for a specific user (admin) or current user. */
export function useUserModulePermissions(userId?: string) {
  const { user } = useAuth();
  const targetId = userId ?? user?.id;
  const qc = useQueryClient();

  // Realtime: invalidate this user's permissions when any row changes.
  useEffect(() => {
    if (!targetId) return;
    const channel = supabase
      .channel(`module_permissions_${targetId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "module_permissions", filter: `user_id=eq.${targetId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["module_permissions", targetId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [targetId, qc]);

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
    staleTime: 5_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Build the user's grouped menu from categories + active permissions.
 * Categories with zero active items are dropped.
 */
export function useUserMenu(userId?: string) {
  const cats = useMenuCategories();
  const perms = useUserModulePermissions(userId);
  const { profile, isAdmin } = useAuth();

  const isLoading = cats.isLoading || perms.isLoading;

  const sections: MenuSection[] = [];
  if (!isLoading && cats.data && perms.data) {
    const now = new Date();
    const activePerms = [...perms.data.filter((p) => {
      if (!p.is_active) return false;
      if (p.expires_at && new Date(p.expires_at) < now) return false;
      return true;
    })];

    // Admin viewing own menu → sees every module in the catalog.
    if (!userId && isAdmin && profile) {
      const activeKeys = new Set(activePerms.map((p) => p.module_key));
      for (const def of MODULE_CATALOG) {
        if (activeKeys.has(def.key)) continue;
        activePerms.push({
          id: `admin-${def.key}`,
          user_id: profile.id,
          module_key: def.key,
          is_active: true,
          category_key: def.defaultCategory,
          display_name: null,
          icon: null,
          position: 0,
        });
      }
    } else if (!userId && profile) {
      const activeKeys = new Set(activePerms.map((p) => p.module_key));
      for (const def of MODULE_CATALOG) {
        const legacyFlag = MODULE_TO_PROFILE_FLAG[def.key];
        if (!legacyFlag || activeKeys.has(def.key)) continue;
        if ((profile as any)?.[legacyFlag] === true) {
          activePerms.push({
            id: `legacy-${def.key}`,
            user_id: profile.id,
            module_key: def.key,
            is_active: true,
            category_key: def.defaultCategory,
            display_name: null,
            icon: null,
            position: 0,
          });
        }
      }
    }

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

    const knownKeys = new Set(cats.data.map((c) => c.key));
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

    // Orphan items (category_key not present in menu_categories) → "Outros".
    const orphanItems: MenuItem[] = [];
    const orphanCats: string[] = [];
    for (const [catKey, items] of byCat.entries()) {
      if (knownKeys.has(catKey)) continue;
      orphanCats.push(catKey);
      orphanItems.push(...items);
    }
    if (orphanItems.length > 0) {
      console.warn("[useUserMenu] Módulos ativos com category_key órfãs:", orphanCats);
      sections.push({
        categoryKey: "outros",
        label: "Outros",
        icon: "Folder",
        position: 9999,
        items: orphanItems.sort((a, b) => a.position - b.position),
      });
    }

    sections.sort((a, b) => a.position - b.position);
  }

  return { sections, isLoading, categories: cats.data || [], permissions: perms.data || [] };
}

/** Returns a map of moduleKey -> boolean (active) plus loading state. Used by Index.tsx gating. */
export function useActiveModuleMap() {
  const { permissions, isLoading } = useUserMenu();
  const map: Record<string, boolean> = {};
  for (const p of permissions) map[p.module_key] = p.is_active;
  return { map, isLoading };
}

export { MODULE_CATALOG };
