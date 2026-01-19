import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Pencil, 
  Trash2, 
  Phone, 
  Building2,
  Calendar,
  Clock
} from "lucide-react";
import { STATUS_CONFIG } from "./TelevendasFilters";

interface Televenda {
  id: string;
  nome: string;
  cpf: string;
  data_venda: string;
  telefone: string;
  banco: string;
  parcela: number;
  troco: number | null;
  saldo_devedor: number | null;
  tipo_operacao: string;
  observacao: string | null;
  status: string;
  created_at: string;
  company_id: string | null;
  user_id: string;
  user?: { name: string } | null;
}

interface ProposalListProps {
  televendas: Televenda[];
  onRowClick: (tv: Televenda) => void;
  onStatusChange: (id: string, newStatus: string, tv: Televenda) => void;
  onEdit: (tv: Televenda, e: React.MouseEvent) => void;
  onDelete: (id: string, tv: Televenda, e: React.MouseEvent) => void;
  canChangeStatus: (tv: Televenda) => boolean;
  canEdit: (tv: Televenda) => boolean;
  getAvailableStatuses: (tv: Televenda) => string[];
  isGestorOrAdmin: boolean;
  formatCPF: (cpf: string) => string;
  formatCurrency: (value: number) => string;
  formatPhone: (phone: string) => string;
}

export const TelevendasProposalList = ({
  televendas,
  onRowClick,
  onStatusChange,
  onEdit,
  onDelete,
  canChangeStatus,
  canEdit,
  getAvailableStatuses,
  isGestorOrAdmin,
  formatCPF,
  formatCurrency,
  formatPhone
}: ProposalListProps) => {
  const getStatusConfig = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || {
      label: status,
      shortLabel: status,
      color: "bg-gray-500/10 text-gray-600 border-gray-300"
    };
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return dateStr.split('-').reverse().join('/');
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  if (televendas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhuma proposta encontrada</p>
        <p className="text-sm">Ajuste os filtros ou adicione uma nova proposta</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {televendas.map((tv, index) => {
        const statusConfig = getStatusConfig(tv.status);
        const isAguardando = tv.status === 'pago_aguardando' || tv.status === 'cancelado_aguardando';
        
        return (
          <motion.div
            key={tv.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            onClick={() => onRowClick(tv)}
            className={`
              group relative overflow-hidden
              p-4 rounded-xl border bg-card
              cursor-pointer transition-all duration-300
              hover:shadow-lg hover:border-primary/30 hover:scale-[1.005]
              ${isAguardando && isGestorOrAdmin ? 'ring-2 ring-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20' : ''}
            `}
          >
            {/* Mobile Layout */}
            <div className="flex flex-col gap-3">
              {/* Header: Name + Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-base truncate">{tv.nome}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {formatCPF(tv.cpf)}
                  </p>
                </div>
                <Badge variant="outline" className={`flex-shrink-0 ${statusConfig.color}`}>
                  {statusConfig.shortLabel}
                </Badge>
              </div>

              {/* Info Row */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {tv.banco}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(tv.data_venda)}
                </span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(tv.parcela)}
                </span>
              </div>

              {/* Meta Row: Type + User + Time */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Badge variant="secondary" className="text-xs px-2 py-0">
                    {tv.tipo_operacao}
                  </Badge>
                  {tv.user?.name && (
                    <span className="truncate max-w-[100px]">{tv.user.name}</span>
                  )}
                </div>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTimeAgo(tv.created_at)}
                </span>
              </div>

              {/* Actions Row */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
                {/* Status changer */}
                {canChangeStatus(tv) && (
                  <Select
                    value={tv.status}
                    onValueChange={(value) => onStatusChange(tv.id, value, tv)}
                  >
                    <SelectTrigger 
                      className="w-auto min-w-[140px] h-8 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableStatuses(tv).map((status) => {
                        const config = getStatusConfig(status);
                        return (
                          <SelectItem key={status} value={status}>
                            {config.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}

                {/* Edit/Delete buttons */}
                {canEdit(tv) && (
                  <div className="flex gap-1.5 ml-auto">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={(e) => onEdit(tv, e)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => onDelete(tv.id, tv, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Aguardando indicator for gestors */}
            {isAguardando && isGestorOrAdmin && (
              <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                <div className="absolute transform rotate-45 bg-amber-500 text-white text-[8px] font-bold py-0.5 right-[-20px] top-[12px] w-[70px] text-center">
                  REVISAR
                </div>
              </div>
            )}

            {/* Hover effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          </motion.div>
        );
      })}
    </div>
  );
};
