import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw,
  AlertTriangle,
  Zap,
  User,
  Calendar,
  Banknote
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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

interface ApprovalsProps {
  televendas: Televenda[];
  onApprove: (id: string, tv: Televenda) => void;
  onReject: (id: string, tv: Televenda) => void;
  onReturn: (id: string, tv: Televenda) => void;
  onRowClick: (tv: Televenda) => void;
  formatCPF: (cpf: string) => string;
  formatCurrency: (value: number) => string;
}

export const TelevendasApprovals = ({
  televendas,
  onApprove,
  onReject,
  onReturn,
  onRowClick,
  formatCPF,
  formatCurrency
}: ApprovalsProps) => {
  // Filtrar propostas por categoria
  const pagoAguardando = televendas.filter(tv => tv.status === "pago_aguardando");
  const canceladoAguardando = televendas.filter(tv => tv.status === "cancelado_aguardando");
  const pendencias = televendas.filter(tv => tv.status === "pendente");
  const devolvidos = televendas.filter(tv => tv.status === "devolvido");

  const totalPendentes = pagoAguardando.length + canceladoAguardando.length + pendencias.length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short"
    });
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) return `${diffDays}d atrás`;
    if (diffHours > 0) return `${diffHours}h atrás`;
    return "Agora";
  };

  const ApprovalCard = ({ 
    tv, 
    showApprove = false, 
    showReject = false,
    showReturn = false,
    urgencyLevel = "normal"
  }: { 
    tv: Televenda; 
    showApprove?: boolean;
    showReject?: boolean;
    showReturn?: boolean;
    urgencyLevel?: "normal" | "warning" | "urgent";
  }) => {
    const urgencyColors = {
      normal: "border-border",
      warning: "border-amber-400 bg-amber-500/5",
      urgent: "border-red-400 bg-red-500/5 animate-pulse"
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        whileHover={{ scale: 1.01 }}
        onClick={() => onRowClick(tv)}
        className={`
          p-4 rounded-xl border-2 cursor-pointer transition-all
          ${urgencyColors[urgencyLevel]}
          hover:shadow-lg hover:border-primary/50
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-base md:text-lg truncate">{tv.nome}</h4>
            <p className="text-sm text-muted-foreground font-mono">{formatCPF(tv.cpf)}</p>
          </div>
          <Badge 
            variant="outline" 
            className={STATUS_CONFIG[tv.status as keyof typeof STATUS_CONFIG]?.color || ""}
          >
            {STATUS_CONFIG[tv.status as keyof typeof STATUS_CONFIG]?.shortLabel || tv.status}
          </Badge>
        </div>

        {/* Info Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Banknote className="h-4 w-4" />
            <span className="font-medium text-foreground">{formatCurrency(tv.parcela)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="font-medium">{tv.banco}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(tv.data_venda)}</span>
          </div>
          {tv.user?.name && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="truncate">{tv.user.name}</span>
            </div>
          )}
        </div>

        {/* Product Badge + Time */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="text-xs">
            {tv.tipo_operacao}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatTimeAgo(tv.created_at)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
          {showApprove && (
            <Button
              size="sm"
              onClick={() => onApprove(tv.id, tv)}
              className="gap-1.5 bg-green-600 hover:bg-green-700 text-white flex-1 md:flex-none"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="hidden md:inline">Aprovar</span>
              <span className="md:hidden">✓</span>
            </Button>
          )}
          {showReject && (
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReject(tv.id, tv)}
              className="gap-1.5 flex-1 md:flex-none"
            >
              <XCircle className="h-4 w-4" />
              <span className="hidden md:inline">Confirmar Cancel.</span>
              <span className="md:hidden">✗</span>
            </Button>
          )}
          {showReturn && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReturn(tv.id, tv)}
              className="gap-1.5 flex-1 md:flex-none border-amber-400 text-amber-600 hover:bg-amber-50"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden md:inline">Devolver</span>
              <span className="md:hidden">↩</span>
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  const SectionHeader = ({ 
    title, 
    count, 
    icon: Icon, 
    color,
    pulse = false 
  }: { 
    title: string; 
    count: number; 
    icon: React.ElementType;
    color: string;
    pulse?: boolean;
  }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg md:text-xl">{title}</h3>
        <p className="text-sm text-muted-foreground">{count} item(ns) aguardando</p>
      </div>
      {count > 0 && pulse && (
        <span className="relative flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
        </span>
      )}
    </div>
  );

  if (totalPendentes === 0 && devolvidos.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="p-6 rounded-full bg-green-500/10 mb-6">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-green-600 mb-2">Tudo em dia! 🎉</h3>
        <p className="text-muted-foreground max-w-md">
          Não há propostas aguardando sua aprovação no momento. Novos itens aparecerão aqui automaticamente.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Banner */}
      {totalPendentes > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 md:p-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-red-500/20 border-2 border-amber-400/50"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-xl md:text-2xl">
                {totalPendentes} aprovação(ões) pendente(s)
              </h2>
              <p className="text-sm text-muted-foreground">
                Revise as propostas abaixo para manter o fluxo de vendas
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pago Aguardando Gestão */}
      {pagoAguardando.length > 0 && (
        <Card className="p-4 md:p-6 border-green-200 bg-green-500/5">
          <SectionHeader 
            title="💰 Pagos Aguardando Gestão" 
            count={pagoAguardando.length}
            icon={CheckCircle2}
            color="bg-green-500"
            pulse={pagoAguardando.length > 0}
          />
          <div className="grid gap-3 md:gap-4">
            <AnimatePresence>
              {pagoAguardando.map((tv) => (
                <ApprovalCard 
                  key={tv.id} 
                  tv={tv}
                  showApprove
                  showReturn
                  urgencyLevel="warning"
                />
              ))}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {/* Cancelado Aguardando Gestão */}
      {canceladoAguardando.length > 0 && (
        <Card className="p-4 md:p-6 border-red-200 bg-red-500/5">
          <SectionHeader 
            title="❌ Cancelados Aguardando Confirmação" 
            count={canceladoAguardando.length}
            icon={XCircle}
            color="bg-red-500"
            pulse={canceladoAguardando.length > 0}
          />
          <div className="grid gap-3 md:gap-4">
            <AnimatePresence>
              {canceladoAguardando.map((tv) => (
                <ApprovalCard 
                  key={tv.id} 
                  tv={tv}
                  showReject
                  showReturn
                  urgencyLevel="urgent"
                />
              ))}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {/* Pendências */}
      {pendencias.length > 0 && (
        <Card className="p-4 md:p-6 border-amber-200 bg-amber-500/5">
          <SectionHeader 
            title="⚠️ Pendências de Análise" 
            count={pendencias.length}
            icon={AlertTriangle}
            color="bg-amber-500"
          />
          <div className="grid gap-3 md:gap-4">
            <AnimatePresence>
              {pendencias.map((tv) => (
                <ApprovalCard 
                  key={tv.id} 
                  tv={tv}
                  showApprove
                  showReject
                  showReturn
                  urgencyLevel="normal"
                />
              ))}
            </AnimatePresence>
          </div>
        </Card>
      )}

      {/* Devolvidos */}
      {devolvidos.length > 0 && (
        <Card className="p-4 md:p-6 border-blue-200 bg-blue-500/5">
          <SectionHeader 
            title="↩️ Devolvidos para Revisão" 
            count={devolvidos.length}
            icon={RotateCcw}
            color="bg-blue-500"
          />
          <div className="grid gap-3 md:gap-4">
            <AnimatePresence>
              {devolvidos.map((tv) => (
                <ApprovalCard 
                  key={tv.id} 
                  tv={tv}
                  showApprove
                  urgencyLevel="normal"
                />
              ))}
            </AnimatePresence>
          </div>
        </Card>
      )}
    </div>
  );
};
