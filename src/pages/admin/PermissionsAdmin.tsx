import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Search, Eye, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { MODULE_CATALOG, getIcon } from "@/config/modules";
import { MODULE_TO_PROFILE_FLAG } from "@/config/permissionFlags";
import { useMenuCategories, useUserModulePermissions, type ModulePermission } from "@/hooks/useUserMenu";
import { ModuleConfigDrawer } from "@/components/admin/ModuleConfigDrawer";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { UserMenuPreview } from "@/components/admin/UserMenuPreview";

export default function PermissionsAdmin() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const qc = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>(searchParams.get("user") || "");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [drawerKey, setDrawerKey] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const u = searchParams.get("user");
    if (u && u !== selectedUserId) setSelectedUserId(u);
  }, [searchParams]);

  const { data: companies = [] } = useQuery({
    queryKey: ["permissions_active_companies"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: userCompanyMap = {} } = useQuery({
    queryKey: ["permissions_user_companies"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_companies")
        .select("user_id, company_id")
        .eq("is_active", true);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((uc: any) => { map[uc.user_id] = uc.company_id; });
      return map;
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin_users_list"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .order("name")
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: categories = [] } = useMenuCategories();
  const { data: perms = [] } = useUserModulePermissions(selectedUserId || undefined);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u: any) => {
      if (companyFilter !== "all" && userCompanyMap[u.id] !== companyFilter) return false;
      if (q && !((u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [users, search, companyFilter, userCompanyMap]);

  const handleSelectUser = (id: string) => {
    setSelectedUserId(id);
    setSearchParams(id ? { user: id } : {});
  };

  const permsByKey = useMemo(() => {
    const map: Record<string, ModulePermission> = {};
    for (const p of perms) map[p.module_key] = p;
    return map;
  }, [perms]);

  const upsertMutation = useMutation({
    mutationFn: async (payload: Partial<ModulePermission> & { module_key: string }) => {
      if (!selectedUserId) throw new Error("Selecione um usuário");
      const existing = permsByKey[payload.module_key];
      const def = MODULE_CATALOG.find((m) => m.key === payload.module_key)!;
      const row = {
        user_id: selectedUserId,
        module_key: payload.module_key,
        is_active: payload.is_active ?? existing?.is_active ?? false,
        category_key: payload.category_key ?? existing?.category_key ?? def.defaultCategory,
        display_name: payload.display_name ?? existing?.display_name ?? null,
        icon: payload.icon ?? existing?.icon ?? null,
        position: payload.position ?? existing?.position ?? 0,
      };
      const { error } = await supabase
        .from("module_permissions" as any)
        .upsert(row, { onConflict: "user_id,module_key" });
      if (error) throw error;

      // Sync legacy profile flag so older components (and Index fallback) stay in sync.
      const legacyFlag = MODULE_TO_PROFILE_FLAG[payload.module_key];
      if (legacyFlag) {
        await supabase
          .from("profiles")
          .update({ [legacyFlag]: row.is_active } as any)
          .eq("id", selectedUserId);
      }

      await supabase.rpc("log_admin_action" as any, {
        _action: payload.is_active === false ? "module_disabled" : "module_updated",
        _module_key: payload.module_key,
        _target_user_id: selectedUserId,
        _payload: row as any,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["module_permissions", selectedUserId] });
      toast.success("Permissão atualizada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const [bulkCategory, setBulkCategory] = useState<string>("all");

  const bulkMutation = useMutation({
    mutationFn: async ({ activate }: { activate: boolean }) => {
      if (!selectedUserId) throw new Error("Selecione um usuário");
      const targets = MODULE_CATALOG.filter(
        (m) => bulkCategory === "all" || m.defaultCategory === bulkCategory
      );
      const rows = targets.map((def) => {
        const existing = permsByKey[def.key];
        return {
          user_id: selectedUserId,
          module_key: def.key,
          is_active: activate,
          category_key: existing?.category_key ?? def.defaultCategory,
          display_name: existing?.display_name ?? null,
          icon: existing?.icon ?? null,
          position: existing?.position ?? 0,
        };
      });
      if (rows.length === 0) return 0;
      const { error } = await supabase
        .from("module_permissions" as any)
        .upsert(rows, { onConflict: "user_id,module_key" });
      if (error) throw error;

      // Sync legacy profile flags in a single update.
      const profileUpdate: Record<string, boolean> = {};
      for (const def of targets) {
        const legacyFlag = MODULE_TO_PROFILE_FLAG[def.key];
        if (legacyFlag) profileUpdate[legacyFlag] = activate;
      }
      if (Object.keys(profileUpdate).length > 0) {
        await supabase.from("profiles").update(profileUpdate as any).eq("id", selectedUserId);
      }

      await supabase.rpc("log_admin_action" as any, {
        _action: activate ? "modules_bulk_enabled" : "modules_bulk_disabled",
        _module_key: bulkCategory,
        _target_user_id: selectedUserId,
        _payload: { count: rows.length, category: bulkCategory } as any,
      });

      return rows.length;
    },
    onSuccess: (count, { activate }) => {
      qc.invalidateQueries({ queryKey: ["module_permissions", selectedUserId] });
      toast.success(
        activate
          ? `${count} permissões ativadas com sucesso`
          : `${count} permissões desativadas com sucesso`
      );
    },
    onError: (e: any) => toast.error(e.message || "Erro na ação em lote"),
  });

  if (!isAdmin) {
    return <div className="p-6">Acesso restrito.</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Gerenciar Permissões</h1>
            <p className="text-xs text-muted-foreground">Controle módulos, categorias e visibilidade do menu por usuário</p>
          </div>
          <Button
            variant="outline"
            disabled={!selectedUserId}
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="h-4 w-4 mr-2" /> Pré-visualizar menu
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        <Tabs defaultValue="modules">
          <TabsList>
            <TabsTrigger value="modules">Módulos por usuário</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="space-y-4">
            <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 md:items-end">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Empresa</label>
                <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    <SelectItem value="all">Todas as empresas</SelectItem>
                    {companies.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Buscar usuário</label>
                <div className="relative mt-1">
                  <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Nome ou email..."
                    className="pl-8"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Usuário selecionado</label>
                <Select value={selectedUserId} onValueChange={handleSelectUser}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {filteredUsers.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum usuário encontrado</div>
                    )}
                    {filteredUsers.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name || u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {selectedUserId ? (
              <>
                <Card className="p-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                  <div className="text-sm">
                    <div className="font-medium">Ações em lote</div>
                    <div className="text-xs text-muted-foreground">
                      Ativar ou desativar todos os módulos de uma categoria de uma só vez.
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <Select value={bulkCategory} onValueChange={setBulkCategory}>
                      <SelectTrigger className="min-w-[200px]">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {categories.map((c) => (
                          <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => bulkMutation.mutate({ activate: true })}
                      disabled={bulkMutation.isPending}
                    >
                      Ativar Todos
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => bulkMutation.mutate({ activate: false })}
                      disabled={bulkMutation.isPending}
                    >
                      Desativar Todos
                    </Button>
                  </div>
                </Card>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {MODULE_CATALOG.map((m) => {
                  const p = permsByKey[m.key];
                  const active = p?.is_active ?? false;
                  const category = p?.category_key ?? m.defaultCategory;
                  const catLabel = categories.find((c) => c.key === category)?.label ?? category;
                  const Icon = getIcon(p?.icon || m.defaultIcon);
                  return (
                    <Card key={m.key} className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{p?.display_name || m.defaultLabel}</div>
                          <div className="text-xs text-muted-foreground truncate">{catLabel}</div>
                        </div>
                        <Badge variant={active ? "default" : "secondary"} className="shrink-0">
                          {active ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={active}
                            onCheckedChange={(v) => upsertMutation.mutate({ module_key: m.key, is_active: v })}
                          />
                          <span className="text-xs text-muted-foreground">
                            {active ? "Ativo" : "Inativo"}
                          </span>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => setDrawerKey(m.key)}>
                          <Settings2 className="h-3.5 w-3.5 mr-1" /> Configurar
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 text-center text-muted-foreground">
                Selecione um usuário para configurar suas permissões.
              </Card>
            )}
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesManager />
          </TabsContent>
        </Tabs>
      </main>

      {drawerKey && selectedUserId && (
        <ModuleConfigDrawer
          moduleKey={drawerKey}
          userId={selectedUserId}
          current={permsByKey[drawerKey]}
          categories={categories}
          open={!!drawerKey}
          onClose={() => setDrawerKey(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["module_permissions", selectedUserId] });
            setDrawerKey(null);
          }}
        />
      )}

      {previewOpen && selectedUserId && (
        <UserMenuPreview userId={selectedUserId} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
