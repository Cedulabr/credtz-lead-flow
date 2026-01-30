import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox } from "lucide-react";
import { Televenda, STATUS_CONFIG } from "../types";
import { formatCPF, formatCurrency, formatDate, formatTimeAgo } from "../utils";
import { StatusBadge } from "../components/StatusBadge";
import { ActionMenu } from "../components/ActionMenu";

interface PropostasViewProps {
  televendas: Televenda[];
  onView: (tv: Televenda) => void;
  onEdit: (tv: Televenda) => void;
  onDelete: (tv: Televenda) => void;
  onStatusChange: (tv: Televenda, newStatus: string) => void;
  canEdit: (tv: Televenda) => boolean;
  canChangeStatus: (tv: Televenda) => boolean;
  isGestorOrAdmin: boolean;
}

export const PropostasView = ({
  televendas,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit,
  canChangeStatus,
  isGestorOrAdmin,
}: PropostasViewProps) => {
  if (televendas.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="p-4 rounded-full bg-muted mb-4">
          <Inbox className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Nenhuma proposta encontrada
        </h3>
        <p className="text-muted-foreground max-w-sm">
          Ajuste os filtros ou aguarde novas propostas
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {televendas.map((tv, index) => {
          const statusConfig = STATUS_CONFIG[tv.status];
          const isAwaiting = tv.status === "pago_aguardando" || tv.status === "cancelado_aguardando";

          return (
            <motion.div
              key={tv.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => onView(tv)}
              className={`
                relative p-4 md:p-5 rounded-2xl border-2 cursor-pointer
                bg-card hover:bg-muted/50 transition-all duration-200
                hover:shadow-md hover:-translate-y-0.5
                ${isAwaiting && isGestorOrAdmin ? 'border-amber-300 bg-amber-500/5' : 'border-border/50'}
              `}
            >
              {/* Main content - responsive grid */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                {/* Client info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base md:text-lg font-semibold truncate">
                      {tv.nome}
                    </h3>
                    <StatusBadge status={tv.status} size="sm" />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                    <span className="font-mono">{formatCPF(tv.cpf)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline">{tv.tipo_operacao}</span>
                    <span>•</span>
                    <span>{tv.banco}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span>📅 Venda: {formatDate(tv.data_venda)}</span>
                    <span>•</span>
                    <span>📝 Cadastro: {formatDate(tv.created_at)}</span>
                  </div>
                </div>

                {/* Values and metadata */}
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="text-right">
                    <p className="text-lg md:text-xl font-bold text-foreground">
                      {formatCurrency(tv.parcela)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(tv.created_at)}
                    </p>
                  </div>

                  {/* Vendedor name (gestor view) */}
                  {isGestorOrAdmin && tv.user?.name && (
                    <div className="hidden md:block text-right min-w-[100px]">
                      <p className="text-xs text-muted-foreground">Vendedor</p>
                      <p className="text-sm font-medium truncate">{tv.user.name}</p>
                    </div>
                  )}

                  {/* Action menu */}
                  <ActionMenu
                    televenda={tv}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    canEdit={canEdit(tv)}
                    canChangeStatus={canChangeStatus(tv)}
                    isGestorOrAdmin={isGestorOrAdmin}
                  />
                </div>
              </div>

              {/* Mobile vendedor badge */}
              {isGestorOrAdmin && tv.user?.name && (
                <div className="mt-2 md:hidden">
                  <span className="text-xs bg-muted px-2 py-1 rounded-full">
                    👤 {tv.user.name}
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
