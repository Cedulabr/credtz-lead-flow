import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Eye, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Televenda, STATUS_CONFIG, STATUS_PROPOSTA_OPTIONS } from "../types";
import { formatCPF, formatCurrency, formatDate, formatTimeAgo } from "../utils";
import { StatusBadge } from "../components/StatusBadge";
import { ActionMenu } from "../components/ActionMenu";
import { BANKING_STATUS_CONFIG } from "../components/BankingPipeline";
import { SyncIndicator } from "../components/SyncIndicator";
import { Button } from "@/components/ui/button";

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
  onRefresh?: () => void;
}

const OPERATION_BADGE: Record<string, { emoji: string; color: string }> = {
  "Portabilidade": { emoji: "🔄", color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700" },
  "Novo empréstimo": { emoji: "💰", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700" },
  "Refinanciamento": { emoji: "🔁", color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700" },
  "Cartão": { emoji: "💳", color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700" },
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
  onRefresh,
}: PropostasViewProps) => {
  const { user } = useAuth();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleMarkAsSeen = async (e: React.MouseEvent, tv: Televenda) => {
    e.stopPropagation();
    setSyncingId(tv.id);
    try {
      const { error } = await supabase
        .from("televendas")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_by: user?.id,
        } as any)
        .eq("id", tv.id);
      if (error) throw error;
      toast.success(`Proposta de ${tv.nome} marcada como vista`);
      onRefresh?.();
    } catch {
      toast.error("Erro ao registrar verificação");
    } finally {
      setSyncingId(null);
    }
  };

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
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {televendas.map((tv, index) => {
          const isAwaiting = tv.status === "pago_aguardando" || tv.status === "cancelado_aguardando";
          const bankStatus = tv.status_bancario || "aguardando_digitacao";
          const bankConfig = BANKING_STATUS_CONFIG[bankStatus];
          const opBadge = OPERATION_BADGE[tv.tipo_operacao];

          return (
            <motion.div
              key={tv.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: index * 0.015 }}
              onClick={() => onView(tv)}
              className={`
                relative p-3 md:p-4 rounded-xl border cursor-pointer
                bg-card hover:bg-muted/40 transition-all duration-150
                hover:shadow-sm
                ${isAwaiting && isGestorOrAdmin ? 'border-amber-300 bg-amber-500/5' : 'border-border/50'}
              `}
            >
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                {/* Client info */}
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Row 1: Name + operation badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm md:text-base font-semibold truncate">
                      {tv.nome}
                    </h3>
                    {opBadge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${opBadge.color}`}>
                        {opBadge.emoji} {tv.tipo_operacao}
                      </span>
                    )}
                  </div>

                  {/* Row 2: Status badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <StatusBadge status={tv.status} size="sm" />
                    {bankConfig && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${bankConfig.bgColor} ${bankConfig.borderColor} ${bankConfig.color}`}>
                        {bankConfig.emoji} {bankConfig.shortLabel}
                      </span>
                    )}
                    {tv.status_proposta && (() => {
                      const spConfig = STATUS_PROPOSTA_OPTIONS.find(s => s.value === tv.status_proposta);
                      return spConfig ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${spConfig.bgColor} ${spConfig.color}`}>
                          {spConfig.emoji} {spConfig.label}
                        </span>
                      ) : null;
                    })()}
                  </div>

                  {/* Row 3: Details */}
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                    <span className="font-mono">{formatCPF(tv.cpf)}</span>
                    <span>•</span>
                    <span>{tv.banco}</span>
                    <span>•</span>
                    <span>📅 {formatDate(tv.data_venda)}</span>
                    {tv.tipo_operacao === "Portabilidade" && tv.previsao_saldo && (
                      <>
                        <span>•</span>
                        <span className="text-amber-600">📆 Saldo: {formatDate(tv.previsao_saldo)}</span>
                      </>
                    )}
                    {tv.data_pagamento && (
                      <>
                        <span>•</span>
                        <span className="text-green-600">💰 {formatDate(tv.data_pagamento)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right side: Values + Seen button + actions */}
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Sync indicator */}
                  <SyncIndicator lastSyncAt={tv.last_sync_at} size="sm" />

                  <div className="text-right">
                    <p className="text-base md:text-lg font-bold text-foreground">
                      {formatCurrency(tv.parcela)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatTimeAgo(tv.created_at)}
                    </p>
                  </div>

                  {isGestorOrAdmin && tv.user?.name && (
                    <div className="hidden md:block text-right min-w-[80px]">
                      <p className="text-[10px] text-muted-foreground">Vendedor</p>
                      <p className="text-xs font-medium truncate">{tv.user.name}</p>
                    </div>
                  )}

                  {/* Mark as Seen button */}
                  {isGestorOrAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10"
                      onClick={(e) => handleMarkAsSeen(e, tv)}
                      disabled={syncingId === tv.id}
                      title="Marcar como visto"
                    >
                      {syncingId === tv.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
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

              {/* Mobile vendedor */}
              {isGestorOrAdmin && tv.user?.name && (
                <div className="mt-1.5 md:hidden">
                  <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full">
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
