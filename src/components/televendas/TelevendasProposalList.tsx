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
    <div className="space-y-4">
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
              p-5 sm:p-4 rounded-2xl border-2 bg-card
              cursor-pointer transition-all duration-300
              hover:shadow-xl hover:border-primary/40 hover:scale-[1.01]
              active:scale-[0.99]
              ${isAguardando && isGestorOrAdmin ? 'ring-2 ring-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20 border-amber-300' : ''}
            `}
          >
            {/* Mobile Layout */}
            <div className="flex flex-col gap-4">
              {/* Header: Name + Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-lg sm:text-base truncate">{tv.nome}</h3>
                  <p className="text-sm sm:text-xs text-muted-foreground font-mono mt-1">
                    {formatCPF(tv.cpf)}
                  </p>
                </div>
                <Badge 
                  variant="outline" 
                  className={`flex-shrink-0 py-2 px-3 text-sm sm:text-xs font-semibold ${statusConfig.color}`}
                >
                  {statusConfig.shortLabel}
                </Badge>
              </div>

              {/* Info Row - Larger text on mobile */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-base sm:text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium text-foreground">{tv.banco}</span>
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium text-foreground">{formatDate(tv.data_venda)}</span>
                </span>
                <span className="font-bold text-lg sm:text-base text-primary">
                  {formatCurrency(tv.parcela)}
                </span>
              </div>

              {/* Meta Row: Type + User + Time */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-sm sm:text-xs px-3 py-1.5 font-medium">
                    {tv.tipo_operacao}
                  </Badge>
                  {tv.user?.name && (
                    <span className="text-sm sm:text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-[100px]">
                      {tv.user.name}
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1.5 text-sm sm:text-xs text-muted-foreground">
                  <Clock className="h-4 w-4 sm:h-3 sm:w-3" />
                  {formatTimeAgo(tv.created_at)}
                </span>
              </div>

              {/* Actions Row - Larger buttons for mobile */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t-2 border-border/50">
                {/* Status changer */}
                {canChangeStatus(tv) && (
                  <Select
                    value={tv.status}
                    onValueChange={(value) => onStatusChange(tv.id, value, tv)}
                  >
                    <SelectTrigger 
                      className="w-auto min-w-[160px] sm:min-w-[140px] h-12 sm:h-10 text-base sm:text-sm rounded-xl border-2 font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableStatuses(tv).map((status) => {
                        const config = getStatusConfig(status);
                        return (
                          <SelectItem key={status} value={status} className="text-base sm:text-sm py-3 sm:py-2">
                            {config.label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}

                {/* Edit/Delete buttons - Larger touch targets */}
                {canEdit(tv) && (
                  <div className="flex gap-2 ml-auto">
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 w-12 sm:h-10 sm:w-10 p-0 rounded-xl border-2 hover:bg-primary/10 hover:border-primary"
                      onClick={(e) => onEdit(tv, e)}
                    >
                      <Pencil className="h-5 w-5 sm:h-4 sm:w-4" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 w-12 sm:h-10 sm:w-10 p-0 rounded-xl border-2 text-destructive hover:bg-destructive/10 hover:border-destructive"
                      onClick={(e) => onDelete(tv.id, tv, e)}
                    >
                      <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Aguardando indicator for gestors */}
            {isAguardando && isGestorOrAdmin && (
              <div className="absolute top-0 right-0 w-20 h-20 sm:w-16 sm:h-16 overflow-hidden">
                <div className="absolute transform rotate-45 bg-amber-500 text-white text-[10px] sm:text-[8px] font-bold py-1 right-[-22px] sm:right-[-20px] top-[16px] sm:top-[12px] w-[80px] sm:w-[70px] text-center shadow-md">
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
