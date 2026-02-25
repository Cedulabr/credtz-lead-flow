import { motion } from "framer-motion";
import { History, CheckCircle, XCircle, Clock, Send } from "lucide-react";
import { SmsHistoryRecord } from "../types";

interface HistoryViewProps {
  history: SmsHistoryRecord[];
}

const STATUS_ICON: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pendente" },
  sent: { icon: Send, color: "text-blue-600", label: "Enviado" },
  delivered: { icon: CheckCircle, color: "text-green-600", label: "Entregue" },
  failed: { icon: XCircle, color: "text-red-600", label: "Falhou" },
};

export const HistoryView = ({ history }: HistoryViewProps) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p>Nenhum envio registrado</p>
        <p className="text-sm">O histórico aparecerá aqui após o primeiro disparo</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Histórico de Envios</h2>
      <div className="space-y-2">
        {history.map((record, index) => {
          const statusConfig = STATUS_ICON[record.status] || STATUS_ICON.pending;
          const Icon = statusConfig.icon;
          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card"
            >
              <Icon className={`h-4 w-4 flex-shrink-0 ${statusConfig.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{record.contact_name || record.phone}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{record.phone}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{record.message}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(record.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
