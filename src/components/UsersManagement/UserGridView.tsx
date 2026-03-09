import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, User, UserX } from "lucide-react";
import { UserData, UserCompany } from "./types";
import { UserAvatar } from "./UserAvatar";
import { UserActionMenu } from "./UserActionMenu";
import { cn } from "@/lib/utils";

interface UserGridViewProps {
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

export function UserGridView({
  users, userCompanies, loading,
  onEdit, onPermissions, onSetPassword, onResetPassword, onToggleStatus, onDelete,
}: UserGridViewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </CardContent>
          </Card>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {users.map((user) => {
        const uc = userCompanies[user.id];
        const isActive = user.is_active !== false;
        return (
          <Card
            key={user.id}
            className="border border-border/50 hover:shadow-md transition-all group"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar name={user.name || "?"} size="lg" />
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{user.name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email || "—"}</p>
                    {uc?.companies?.name && (
                      <p className="text-xs text-muted-foreground mt-0.5">{uc.companies.name}</p>
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

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className={cn("h-2 w-2 rounded-full", isActive ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                  <span className="text-[10px] text-muted-foreground">{isActive ? "Ativo" : "Inativo"}</span>
                </div>

                {user.role === "admin" && (
                  <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-0 text-[10px] px-1.5 py-0">Admin</Badge>
                )}
                {uc?.company_role === "gestor" && (
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-0 text-[10px] px-1.5 py-0">
                    <Crown className="h-3 w-3 mr-0.5" />Gestor
                  </Badge>
                )}
                {uc?.company_role === "colaborador" && (
                  <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-0 text-[10px] px-1.5 py-0">
                    <User className="h-3 w-3 mr-0.5" />Colab.
                  </Badge>
                )}
                {(user as any).can_access_premium_leads !== false && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Premium</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
