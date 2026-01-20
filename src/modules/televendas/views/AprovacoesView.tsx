import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Clock,
  AlertTriangle,
  Inbox
} from "lucide-react";
import { Televenda, STATUS_CONFIG } from "../types";
import { formatCPF, formatCurrency, formatTimeAgo } from "../utils";
import { StatusBadge } from "../components/StatusBadge";

interface AprovacoesViewProps {
  televendas: Televenda[];
  onApprove: (tv: Televenda) => void;
  onReject: (tv: Televenda) => void;
  onReturn: (tv: Televenda) => void;
  onView: (tv: Televenda) => void;
}

export const AprovacoesView = ({
  televendas,
  onApprove,
  onReject,
  onReturn,
  onView,
}: AprovacoesViewProps) => {
  // Filter only items needing approval
  const approvalItems = useMemo(() => {
    return televendas.filter((tv) =>
      ["pago_aguardando", "cancelado_aguardando", "devolvido", "pendente"].includes(tv.status)
    );
  }, [televendas]);

  const pagoAguardando = approvalItems.filter(tv => tv.status === "pago_aguardando");
  const canceladoAguardando = approvalItems.filter(tv => tv.status === "cancelado_aguardando");
  const devolvidos = approvalItems.filter(tv => tv.status === "devolvido");
  const pendentes = approvalItems.filter(tv => tv.status === "pendente");

  if (approvalItems.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="p-4 rounded-full bg-green-500/10 mb-4">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">
          Tudo em dia! 🎉
        </h3>
        <p className="text-muted-foreground max-w-sm">
          Não há aprovações pendentes no momento
        </p>
      </motion.div>
    );
  }

  const ApprovalCard = ({ 
    tv, 
    showApprove = true, 
    showReject = false,
    showReturn = true 
  }: { 
    tv: Televenda; 
    showApprove?: boolean;
    showReject?: boolean;
    showReturn?: boolean;
  }) => (
    <motion.div
      key={tv.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="p-4 rounded-xl border-2 border-border/50 bg-card hover:bg-muted/30 transition-colors"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Info */}
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onView(tv)}
        >
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="font-semibold truncate">{tv.nome}</h4>
            <StatusBadge status={tv.status} size="sm" />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
            <span className="font-mono">{formatCPF(tv.cpf)}</span>
            <span>•</span>
            <span>{tv.banco}</span>
            <span>•</span>
            <span className="font-semibold">{formatCurrency(tv.parcela)}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTimeAgo(tv.created_at)}</span>
            {tv.user?.name && (
              <>
                <span>•</span>
                <span>👤 {tv.user.name}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showApprove && (
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); onApprove(tv); }}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white h-10 px-4"
            >
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Aprovar</span>
            </Button>
          )}
          {showReject && (
            <Button
              size="sm"
              variant="destructive"
              onClick={(e) => { e.stopPropagation(); onReject(tv); }}
              className="gap-1.5 h-10 px-4"
            >
              <XCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Confirmar</span>
            </Button>
          )}
          {showReturn && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onReturn(tv); }}
              className="gap-1.5 h-10 px-4"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Devolver</span>
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );

  const SectionHeader = ({ 
    emoji, 
    title, 
    count, 
    urgent = false 
  }: { 
    emoji: string; 
    title: string; 
    count: number;
    urgent?: boolean;
  }) => (
    <div className="flex items-center gap-2 mb-3 mt-6 first:mt-0">
      <span className="text-xl">{emoji}</span>
      <h3 className="text-base font-semibold">{title}</h3>
      <Badge 
        variant={urgent ? "destructive" : "secondary"}
        className={urgent ? "animate-pulse" : ""}
      >
        {count}
      </Badge>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Summary banner */}
      <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-300 mb-6">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <span className="font-semibold text-amber-700">
            {approvalItems.length} item{approvalItems.length !== 1 ? 's' : ''} aguardando ação
          </span>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {/* Pago Aguardando */}
        {pagoAguardando.length > 0 && (
          <div>
            <SectionHeader 
              emoji="💰" 
              title="Pago Aguardando Gestão" 
              count={pagoAguardando.length}
              urgent
            />
            <div className="space-y-2">
              {pagoAguardando.map((tv) => (
                <ApprovalCard key={tv.id} tv={tv} showApprove showReturn />
              ))}
            </div>
          </div>
        )}

        {/* Cancelado Aguardando */}
        {canceladoAguardando.length > 0 && (
          <div>
            <SectionHeader 
              emoji="❌" 
              title="Cancelado Aguardando Confirmação" 
              count={canceladoAguardando.length}
            />
            <div className="space-y-2">
              {canceladoAguardando.map((tv) => (
                <ApprovalCard key={tv.id} tv={tv} showApprove={false} showReject showReturn />
              ))}
            </div>
          </div>
        )}

        {/* Pendentes */}
        {pendentes.length > 0 && (
          <div>
            <SectionHeader 
              emoji="⚠️" 
              title="Pendências" 
              count={pendentes.length}
            />
            <div className="space-y-2">
              {pendentes.map((tv) => (
                <ApprovalCard key={tv.id} tv={tv} showApprove={false} showReturn={false} />
              ))}
            </div>
          </div>
        )}

        {/* Devolvidos */}
        {devolvidos.length > 0 && (
          <div>
            <SectionHeader 
              emoji="🔄" 
              title="Devolvidos" 
              count={devolvidos.length}
            />
            <div className="space-y-2">
              {devolvidos.map((tv) => (
                <ApprovalCard key={tv.id} tv={tv} showApprove={false} showReturn={false} />
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
