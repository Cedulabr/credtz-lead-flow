import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox } from "lucide-react";
import { Televenda, STATUS_CONFIG, STATUS_PROPOSTA_OPTIONS } from "../types";
import { formatCPF, formatCurrency, formatDate, formatTimeAgo } from "../utils";
import { StatusBadge } from "../components/StatusBadge";
import { ActionMenu } from "../components/ActionMenu";
import { BANKING_STATUS_CONFIG } from "../components/BankingPipeline";
import { SyncIndicator } from "../components/SyncIndicator";

interface PropostasViewProps {
  televendas: Televenda[];
  onView: (tv: Televenda) => void;
  onEdit: (tv: Televenda) => void;
  onLimitedEdit?: (tv: Televenda) => void;
  onDelete: (tv: Televenda) => void;
  onStatusChange: (tv: Televenda, newStatus: string) => void;
  canEdit: (tv: Televenda) => boolean;
  canEditLimited?: (tv: Televenda) => boolean;
  canChangeStatus: (tv: Televenda) => boolean;
  isGestorOrAdmin: boolean;
}

const OPERATION_BADGE: Record<string, { emoji: string; color: string }> = {
  "Portabilidade": { emoji: "🔄", color: "bg-blue-100 text-blue-700 border-blue-200" },
  "Novo empréstimo": { emoji: "💰", color: "bg-green-100 text-green-700 border-green-200" },
  "Refinanciamento": { emoji: "🔁", color: "bg-purple-100 text-purple-700 border-purple-200" },
  "Cartão": { emoji: "💳", color: "bg-orange-100 text-orange-700 border-orange-200" },
};

export const PropostasView = ({
  televendas,
  onView,
  onEdit,
  onLimitedEdit,
  onDelete,
  onStatusChange,
  canEdit,
  canEditLimited,
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
          const bankStatus = tv.status_bancario || "aguardando_digitacao";
          const bankConfig = BANKING_STATUS_CONFIG[bankStatus];
          const opBadge = OPERATION_BADGE[tv.tipo_operacao];

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
              {/* Main content */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                {/* Client info */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  {/* Row 1: Name + badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base md:text-lg font-semibold truncate">
                      {tv.nome}
                    </h3>
                    {opBadge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${opBadge.color}`}>
                        {opBadge.emoji} {tv.tipo_operacao}
                      </span>
                    )}
                    {tv.edit_count && tv.edit_count > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 font-medium">
                        ✏️ {tv.edit_count}x
                      </span>
                    )}
                  </div>

                  {/* Row 2: Status badges (commercial + banking) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <StatusBadge status={tv.status} size="sm" />
                    {bankConfig && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${bankConfig.bgColor} ${bankConfig.borderColor} ${bankConfig.color}`}>
                        {bankConfig.emoji} {bankConfig.shortLabel}
                      </span>
                    )}
                    {tv.status_proposta && (() => {
                      const spConfig = STATUS_PROPOSTA_OPTIONS.find(s => s.value === tv.status_proposta);
                      return spConfig ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${spConfig.bgColor} ${spConfig.color}`}>
                          {spConfig.emoji} {spConfig.label}
                        </span>
                      ) : null;
                    })()}
                  </div>

                  {/* Row 3: Details */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="font-mono">{formatCPF(tv.cpf)}</span>
                    <span>•</span>
                    <span>{tv.banco}</span>
                    <span>•</span>
                    <span>📅 {formatDate(tv.data_venda)}</span>
                    {tv.data_pagamento && (
                      <>
                        <span>•</span>
                        <span className="text-green-600">💰 Pgto: {formatDate(tv.data_pagamento)}</span>
                      </>
                    )}
                    {tv.tipo_operacao === "Portabilidade" && tv.previsao_saldo && (
                      <>
                        <span>•</span>
                        <span className="text-blue-600">
                          📆 Prev: {new Date(tv.previsao_saldo + "T12:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Row 4: Sync indicator */}
                  <SyncIndicator lastSyncAt={tv.last_sync_at} size="sm" />
                </div>

                {/* Right side: Values + actions */}
                <div className="flex items-center gap-4 md:gap-6">
                  <div className="text-right">
                    <p className="text-lg md:text-xl font-bold text-foreground">
                      {formatCurrency(tv.parcela)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatTimeAgo(tv.created_at)}
                    </p>
                  </div>

                  {isGestorOrAdmin && tv.user?.name && (
                    <div className="hidden md:block text-right min-w-[100px]">
                      <p className="text-[10px] text-muted-foreground">Vendedor</p>
                      <p className="text-sm font-medium truncate">{tv.user.name}</p>
                    </div>
                  )}

                  <ActionMenu
                    televenda={tv}
                    onView={onView}
                    onEdit={onEdit}
                    onLimitedEdit={onLimitedEdit}
                    onDelete={onDelete}
                    onStatusChange={onStatusChange}
                    canEdit={canEdit(tv)}
                    canEditLimited={canEditLimited ? canEditLimited(tv) : false}
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
