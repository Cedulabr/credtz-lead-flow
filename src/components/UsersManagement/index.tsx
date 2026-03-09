import { useState, useEffect, useMemo, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserData, Company, UserCompany, ViewMode, UserFilters, PERMISSION_MODULES } from "./types";
import { UserMetricsCards } from "./UserMetricsCards";
import { UserFiltersBar } from "./UserFiltersBar";
import { UserTable } from "./UserTable";
import { UserGridView } from "./UserGridView";
import { UserPermissionsModal } from "./UserPermissionsModal";
import { UserEditModal, UserEditForm } from "./UserEditModal";
import { UserPasswordModal } from "./UserPasswordModal";

export function UsersManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserData[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [userCompanies, setUserCompanies] = useState<Record<string, UserCompany>>({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filters, setFilters] = useState<UserFilters>({ search: "", companyId: "", role: "", status: "" });

  // Modal states
  const [editUser, setEditUser] = useState<UserData | null>(null);
  const [permUser, setPermUser] = useState<UserData | null>(null);
  const [passUser, setPassUser] = useState<UserData | null>(null);

  // ── Data loading (preserved from UsersList.tsx) ──
  const loadCompanies = useCallback(async () => {
    try {
      const { data } = await supabase.from("companies").select("id, name").eq("is_active", true).order("name");
      setCompanies(data || []);
    } catch (e) { console.error("Erro ao carregar empresas:", e); }
  }, []);

  const loadUserCompanies = useCallback(async (userIds: string[]) => {
    try {
      const { data } = await supabase
        .from("user_companies")
        .select("id, company_id, user_id, company_role, companies(id, name)")
        .in("user_id", userIds)
        .eq("is_active", true);
      const mapping: Record<string, UserCompany> = {};
      (data || []).forEach((uc: any) => { mapping[uc.user_id] = uc; });
      setUserCompanies(mapping);
    } catch (e) { console.error("Erro ao carregar empresas dos usuários:", e); }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
      if (data?.length) await loadUserCompanies(data.map((u) => u.id));
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast({ title: "Erro", description: "Erro ao carregar lista de usuários.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [loadUserCompanies, toast]);

  useEffect(() => { loadUsers(); loadCompanies(); }, [loadUsers, loadCompanies]);

  // ── Filtering ──
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search
      if (filters.search) {
        const term = filters.search.toLowerCase().trim();
        const matches =
          (user.name || "").toLowerCase().includes(term) ||
          (user.email || "").toLowerCase().includes(term) ||
          (user.cpf || "").includes(term);
        if (!matches) return false;
      }
      // Company
      if (filters.companyId) {
        const uc = userCompanies[user.id];
        if (uc?.company_id !== filters.companyId) return false;
      }
      // Role
      if (filters.role) {
        if (filters.role === "admin" && user.role !== "admin") return false;
        if (filters.role === "partner" && user.role !== "partner") return false;
        if (filters.role === "gestor" && userCompanies[user.id]?.company_role !== "gestor") return false;
        if (filters.role === "colaborador" && userCompanies[user.id]?.company_role !== "colaborador") return false;
      }
      // Status
      if (filters.status === "active" && user.is_active === false) return false;
      if (filters.status === "inactive" && user.is_active !== false) return false;
      return true;
    });
  }, [users, userCompanies, filters]);

  // ── Actions (all preserved from UsersList.tsx) ──
  const handleRolePromotion = async (userId: string) => {
    try {
      await supabase.from("profiles").update({ can_access_gestao_televendas: true, can_access_relatorio_desempenho: true }).eq("id", userId);
      toast({ title: "Promoção para Gestor", description: "Permissões de gestão ativadas automaticamente." });
    } catch (e) { console.error("Erro ao processar promoção:", e); }
  };

  const handleSaveUser = async (form: UserEditForm) => {
    if (!editUser) return;
    try {
      const { error } = await supabase.from("profiles").update({
        name: form.name, email: form.email, cpf: form.cpf, phone: form.phone,
        pix_key: form.pix_key, company: form.company, level: (form.level as any) || null,
      }).eq("id", editUser.id);
      if (error) throw error;

      // Company assignment
      if (form.company_id && form.company_role) {
        const existing = userCompanies[editUser.id];
        const prevRole = existing?.company_role;
        if (existing) {
          const { error: ucErr } = await supabase.from("user_companies").update({ company_id: form.company_id, company_role: form.company_role }).eq("id", existing.id);
          if (ucErr) throw ucErr;
          if (prevRole === "colaborador" && form.company_role === "gestor") await handleRolePromotion(editUser.id);
          if (prevRole === "gestor" && form.company_role === "colaborador") {
            toast({ title: "Cargo alterado", description: "O usuário agora é colaborador." });
          }
        } else {
          const { error: ucErr } = await supabase.from("user_companies").insert({ user_id: editUser.id, company_id: form.company_id, company_role: form.company_role });
          if (ucErr) throw ucErr;
        }
      } else if (userCompanies[editUser.id] && !form.company_id) {
        await supabase.from("user_companies").update({ is_active: false }).eq("id", userCompanies[editUser.id].id);
      }

      toast({ title: "Usuário atualizado!", description: "Os dados do usuário foram salvos." });
      setEditUser(null);
      loadUsers();
    } catch (e: any) {
      console.error("Erro ao salvar:", e);
      toast({ title: "Erro", description: "Erro ao salvar dados do usuário.", variant: "destructive" });
    }
  };

  const toggleUserStatus = async (user: UserData) => {
    try {
      const { error } = await supabase.from("profiles").update({ is_active: !user.is_active }).eq("id", user.id);
      if (error) throw error;
      toast({ title: "Status atualizado!", description: `Usuário ${!user.is_active ? "ativado" : "inativado"}.` });
      loadUsers();
    } catch (e) {
      toast({ title: "Erro", description: "Erro ao alterar status.", variant: "destructive" });
    }
  };

  const deleteUser = async (user: UserData) => {
    if (!confirm(`Excluir ${user.name}? Esta ação não pode ser desfeita.`)) return;
    try {
      const { error } = await supabase.functions.invoke("admin-delete-user", { body: { user_id: user.id } });
      if (error) throw error;
      toast({ title: "Usuário excluído!", description: "O usuário foi removido." });
      loadUsers();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Erro ao excluir.", variant: "destructive" });
    }
  };

  const handleSetPassword = async (userId: string, password: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Sessão expirada", variant: "destructive" }); return; }
      const { data, error } = await supabase.functions.invoke("admin-reset-password", { body: { user_id: userId, new_password: password } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Debug login test
      let loginOk: boolean | null = null;
      try {
        const { data: dbg } = await supabase.functions.invoke("admin-debug-login", { body: { user_id: userId, password } });
        loginOk = dbg?.login_test?.ok === true;
      } catch {}

      toast({
        title: loginOk === false ? "Senha atualizada, mas login falhou" : "Senha definida!",
        description: loginOk === true ? "Login testado: OK" : undefined,
        variant: loginOk === false ? "destructive" : undefined,
      });
      setPassUser(null);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Erro ao definir senha.", variant: "destructive" });
    }
  };

  const resetUserPassword = async (user: UserData) => {
    if (!confirm(`Resetar a senha de ${user.name}?`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast({ title: "Sessão expirada", variant: "destructive" }); return; }
      const { data, error } = await supabase.functions.invoke("admin-reset-password", { body: { user_id: user.id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const newPass = data?.new_password;

      let loginOk: boolean | null = null;
      if (newPass) {
        try {
          const { data: dbg } = await supabase.functions.invoke("admin-debug-login", { body: { user_id: user.id, password: newPass } });
          loginOk = dbg?.login_test?.ok === true;
        } catch {}
      }

      toast({
        title: loginOk === false ? "Senha resetada, mas login falhou" : "Senha resetada!",
        description: `Email: ${user.email} | Nova senha: ${newPass || "(não retornada)"}${loginOk === true ? " (OK)" : ""}`,
        variant: loginOk === false ? "destructive" : undefined,
      });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Erro ao resetar.", variant: "destructive" });
    }
  };

  const updatePermissions = async (userId: string, newPerms: Record<string, boolean>) => {
    try {
      const { error } = await supabase.from("profiles").update(newPerms).eq("id", userId);
      if (error) throw error;
      toast({ title: "Permissões atualizadas!", description: "Permissões salvas com sucesso." });
      setPermUser(null);
      loadUsers();
    } catch (e) {
      toast({ title: "Erro", description: "Erro ao atualizar permissões.", variant: "destructive" });
    }
  };

  // ── Action handlers for components ──
  const actions = {
    onEdit: (u: UserData) => setEditUser(u),
    onPermissions: (u: UserData) => setPermUser(u),
    onSetPassword: (u: UserData) => setPassUser(u),
    onResetPassword: resetUserPassword,
    onToggleStatus: toggleUserStatus,
    onDelete: deleteUser,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Gestão de Usuários</h1>
        <p className="text-sm text-muted-foreground">Gerencie usuários, permissões e acessos do sistema</p>
      </div>

      {/* Metrics */}
      <UserMetricsCards users={users} userCompanies={userCompanies} loading={loading} />

      {/* Filters */}
      <UserFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        companies={companies}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        resultCount={filteredUsers.length}
      />

      {/* List / Grid */}
      {viewMode === "list" ? (
        <UserTable users={filteredUsers} userCompanies={userCompanies} loading={loading} {...actions} />
      ) : (
        <UserGridView users={filteredUsers} userCompanies={userCompanies} loading={loading} {...actions} />
      )}

      {/* Modals */}
      <UserPermissionsModal
        open={!!permUser}
        onOpenChange={(o) => !o && setPermUser(null)}
        user={permUser}
        onSave={updatePermissions}
      />

      <UserEditModal
        open={!!editUser}
        onOpenChange={(o) => !o && setEditUser(null)}
        user={editUser}
        companies={companies}
        userCompany={editUser ? userCompanies[editUser.id] : undefined}
        onSave={handleSaveUser}
      />

      <UserPasswordModal
        open={!!passUser}
        onOpenChange={(o) => !o && setPassUser(null)}
        user={passUser}
        onSave={handleSetPassword}
      />
    </div>
  );
}
