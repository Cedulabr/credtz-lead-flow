import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  MessageSquare,
  Phone,
  RefreshCw
} from "lucide-react";
import { Televenda, STATUS_CONFIG, OPERATOR_STATUSES, ALL_STATUSES } from "../types";

interface ActionMenuProps {
  televenda: Televenda;
  onView: (tv: Televenda) => void;
  onEdit: (tv: Televenda) => void;
  onDelete: (tv: Televenda) => void;
  onStatusChange: (tv: Televenda, newStatus: string) => void;
  canEdit: boolean;
  canChangeStatus: boolean;
  isGestorOrAdmin: boolean;
}

export const ActionMenu = ({
  televenda,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit,
  canChangeStatus,
  isGestorOrAdmin,
}: ActionMenuProps) => {
  // Get available statuses based on role
  const getAvailableStatuses = () => {
    if (isGestorOrAdmin) {
      return ALL_STATUSES as unknown as string[];
    }
    return OPERATOR_STATUSES as unknown as string[];
  };

  const availableStatuses = getAvailableStatuses().filter(
    (status) => status !== televenda.status && STATUS_CONFIG[status]
  );

  const handleWhatsApp = () => {
    const phone = televenda.telefone.replace(/\D/g, "");
    const firstName = televenda.nome.split(" ")[0];
    const message = encodeURIComponent(`Olá ${firstName}, tudo bem?`);
    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-9 w-9 p-0 hover:bg-muted"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem 
          onClick={(e) => { e.stopPropagation(); onView(televenda); }}
          className="gap-2 py-2.5"
        >
          <Eye className="h-4 w-4" />
          Ver Detalhes
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={(e) => { e.stopPropagation(); handleWhatsApp(); }}
          className="gap-2 py-2.5 text-green-600"
        >
          <MessageSquare className="h-4 w-4" />
          WhatsApp
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={(e) => { 
            e.stopPropagation(); 
            window.open(`tel:${televenda.telefone.replace(/\D/g, "")}`, "_self");
          }}
          className="gap-2 py-2.5"
        >
          <Phone className="h-4 w-4" />
          Ligar
        </DropdownMenuItem>

        {canChangeStatus && availableStatuses.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 py-2">
                <RefreshCw className="h-4 w-4" />
                Alterar Status
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                {availableStatuses.map((status) => {
                  const config = STATUS_CONFIG[status];
                  if (!config) return null;
                  return (
                    <DropdownMenuItem
                      key={status}
                      onClick={(e) => { e.stopPropagation(); onStatusChange(televenda, status); }}
                      className="gap-2 py-2"
                    >
                      <span>{config.emoji}</span>
                      <span className="truncate">{config.label}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </>
        )}

        {canEdit && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onEdit(televenda); }}
              className="gap-2 py-2.5"
            >
              <Edit className="h-4 w-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => { e.stopPropagation(); onDelete(televenda); }}
              className="gap-2 py-2.5 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {isGestorOrAdmin ? "Excluir" : "Solicitar Exclusão"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
