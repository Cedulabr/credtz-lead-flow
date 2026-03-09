import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Edit,
  Settings,
  Key,
  RefreshCw,
  Building2,
  UserCheck,
  UserX,
  Trash2,
} from "lucide-react";
import { UserData } from "./types";

interface UserActionMenuProps {
  user: UserData;
  onEdit: (user: UserData) => void;
  onPermissions: (user: UserData) => void;
  onSetPassword: (user: UserData) => void;
  onResetPassword: (user: UserData) => void;
  onToggleStatus: (user: UserData) => void;
  onDelete: (user: UserData) => void;
}

export function UserActionMenu({
  user,
  onEdit,
  onPermissions,
  onSetPassword,
  onResetPassword,
  onToggleStatus,
  onDelete,
}: UserActionMenuProps) {
  const isActive = user.is_active !== false;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onEdit(user)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar usuário
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPermissions(user)}>
          <Settings className="h-4 w-4 mr-2" />
          Gerenciar permissões
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onSetPassword(user)}>
          <Key className="h-4 w-4 mr-2" />
          Definir senha
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onResetPassword(user)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Resetar senha
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onToggleStatus(user)}>
          {isActive ? (
            <>
              <UserX className="h-4 w-4 mr-2" />
              Desativar usuário
            </>
          ) : (
            <>
              <UserCheck className="h-4 w-4 mr-2" />
              Ativar usuário
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(user)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir usuário
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
