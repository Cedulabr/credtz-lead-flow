import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, User, UserX } from "lucide-react";
import { UserData, UserCompany } from "./types";
import { UserAvatar } from "./UserAvatar";
import { UserActionMenu } from "./UserActionMenu";
import { cn } from "@/lib/utils";

interface UserTableProps {
  users: UserData[];
  userCompanies: Record<string, UserCompany>;
  loading: boolean;
  onEdit: (user: UserData) => void;
  onPermissions: (user: UserData) => void;
  onSetPassword: (user: UserData) => void;
  onResetPassword: (user: UserData) => void;
  onToggleStatus: (user: UserData) => void;
  onDelete: (user: UserData) => void;
}

function RoleBadge({ role, companyRole }: { role: string; companyRole?: string }) {
  if (role === "admin") return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 text-xs">Admin</Badge>;
  if (companyRole === "gestor") return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 text-xs"><Crown className="h-3 w-3 mr-1" />Gestor</Badge>;
  if (companyRole === "colaborador") return <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-0 text-xs"><User className="h-3 w-3 mr-1" />Colaborador</Badge>;
  if (role === "partner") return <Badge variant="outline" className="text-xs">Parceiro</Badge>;
  return <Badge variant="outline" className="text-xs">Usuário</Badge>;
}

function StatusDot({ isActive }: { isActive: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-2 w-2 rounded-full", isActive ? "bg-emerald-500" : "bg-muted-foreground/40")} />
      <span className="text-xs text-muted-foreground">{isActive ? "Ativo" : "Inativo"}</span>
    </div>
  );
}

export function UserTable({
  users, userCompanies, loading,
  onEdit, onPermissions, onSetPassword, onResetPassword, onToggleStatus, onDelete,
}: UserTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border border-border/50 rounded-xl">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16">
        <UserX className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
        <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="font-medium text-xs uppercase tracking-wider">Usuário</TableHead>
              <TableHead className="font-medium text-xs uppercase tracking-wider">Empresa</TableHead>
              <TableHead className="font-medium text-xs uppercase tracking-wider">Função</TableHead>
              <TableHead className="font-medium text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="font-medium text-xs uppercase tracking-wider">Permissões</TableHead>
              <TableHead className="font-medium text-xs uppercase tracking-wider w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const uc = userCompanies[user.id];
              const isActive = user.is_active !== false;
              return (
                <TableRow key={user.id} className="group hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <UserAvatar name={user.name || "?"} />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{user.name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email || "—"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{uc?.companies?.name || user.company || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} companyRole={uc?.company_role} />
                  </TableCell>
                  <TableCell>
                    <StatusDot isActive={isActive} />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(user as any).can_access_premium_leads !== false && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Premium</Badge>
                      )}
                      {(user as any).can_access_gestao_televendas !== false && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Gestão</Badge>
                      )}
                      {(user as any).can_access_televendas !== false && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Comercial</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <UserActionMenu
                      user={user}
                      onEdit={onEdit}
                      onPermissions={onPermissions}
                      onSetPassword={onSetPassword}
                      onResetPassword={onResetPassword}
                      onToggleStatus={onToggleStatus}
                      onDelete={onDelete}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {users.map((user) => {
          const uc = userCompanies[user.id];
          const isActive = user.is_active !== false;
          return (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:shadow-sm transition-all"
            >
              <UserAvatar name={user.name || "?"} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{user.name || "Sem nome"}</p>
                  <StatusDot isActive={isActive} />
                </div>
                <p className="text-xs text-muted-foreground truncate">{user.email || "—"}</p>
                <div className="flex items-center gap-1 mt-1">
                  <RoleBadge role={user.role} companyRole={uc?.company_role} />
                  {uc?.companies?.name && (
                    <span className="text-[10px] text-muted-foreground">• {uc.companies.name}</span>
                  )}
                </div>
              </div>
              <UserActionMenu
                user={user}
                onEdit={onEdit}
                onPermissions={onPermissions}
                onSetPassword={onSetPassword}
                onResetPassword={onResetPassword}
                onToggleStatus={onToggleStatus}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}
