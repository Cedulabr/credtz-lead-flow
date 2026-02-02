import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Clock,
  AlertTriangle,
  Trash2,
  Building2
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
  onApproveExclusion: (tv: Televenda) => void;
  onRejectExclusion: (tv: Televenda) => void;
}

export const AprovacoesView = ({
  televendas,
  onApprove,
  onReject,
  onReturn,
  onView,
  onApproveExclusion,
  onRejectExclusion,
}: AprovacoesViewProps) => {
  const [bankFilter, setBankFilter] = useState("all");

  // Filter items that need manager action
  const approvalItems = useMemo(() => {
    return televendas.filter((tv) =>
      [
        "pago_aguardando",        // Aguardando aprovação de pagamento
        "solicitar_exclusao",     // Aguardando aprovação de exclusão
        "proposta_pendente",      // Propostas pendentes
        "devolvido",              // Devolvidos pelo gestor
      ].includes(tv.status)
    );
  }, [televendas]);

  // Get unique banks from approval items
  const availableBanks = useMemo(() => {
    const banksSet = new Set(approvalItems.map((tv) => tv.banco).filter(Boolean));
    return Array.from(banksSet).sort();
  }, [approvalItems]);

  // Filter by selected bank
  const filteredApprovalItems = useMemo(() => {
    if (bankFilter === "all") return approvalItems;
    return approvalItems.filter((tv) => tv.banco === bankFilter);
  }, [approvalItems, bankFilter]);

  // Group by status (using filtered items)
  const pagoAguardando = filteredApprovalItems.filter(tv => tv.status === "pago_aguardando");
  const solicitarExclusao = filteredApprovalItems.filter(tv => tv.status === "solicitar_exclusao");
  const pendentes = filteredApprovalItems.filter(tv => tv.status === "proposta_pendente");
  const devolvidos = filteredApprovalItems.filter(tv => tv.status === "devolvido");

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
    type = "payment"
  }: { 
    tv: Televenda; 
    type?: "payment" | "exclusion" | "pending" | "returned";
  }) => (
    <motion.div
      layout
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
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {tv.banco}
            </span>
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

        {/* Actions based on type */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {type === "payment" && (
            <>
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); onApprove(tv); }}
                className="gap-1.5 bg-green-600 hover:bg-green-700 text-white h-10 px-4"
              >
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Aprovar Pago</span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => { e.stopPropagation(); onReject(tv); }}
                className="gap-1.5 h-10 px-4"
              >
                <XCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Cancelar</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); onReturn(tv); }}
                className="gap-1.5 h-10 px-4"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Devolver</span>
              </Button>
            </>
          )}
          
          {type === "exclusion" && (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={(e) => { e.stopPropagation(); onApproveExclusion(tv); }}
                className="gap-1.5 h-10 px-4"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Confirmar Exclusão</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); onRejectExclusion(tv); }}
                className="gap-1.5 h-10 px-4"
              >
                <XCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Rejeitar</span>
              </Button>
            </>
          )}

          {type === "pending" && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onView(tv); }}
              className="gap-1.5 h-10 px-4"
            >
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Ver Detalhes</span>
            </Button>
          )}

          {type === "returned" && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onView(tv); }}
              className="gap-1.5 h-10 px-4"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Ver Detalhes</span>
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
      {/* Summary banner with bank filter */}
      <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-300 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-semibold text-amber-700">
              {filteredApprovalItems.length} item{filteredApprovalItems.length !== 1 ? 's' : ''} aguardando ação
            </span>
          </div>
          
          {/* Bank filter */}
          {availableBanks.length > 1 && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-amber-600" />
              <Select value={bankFilter} onValueChange={setBankFilter}>
                <SelectTrigger className="w-[180px] h-9 bg-white/80 border-amber-300">
                  <SelectValue placeholder="Filtrar por banco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os bancos</SelectItem>
                  {availableBanks.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {/* Pago Aguardando Gestor */}
        {pagoAguardando.length > 0 && (
          <div>
            <SectionHeader 
              emoji="💰" 
              title="Pago Aguardando Aprovação" 
              count={pagoAguardando.length}
              urgent
            />
            <div className="space-y-2">
              {pagoAguardando.map((tv) => (
                <ApprovalCard key={tv.id} tv={tv} type="payment" />
              ))}
            </div>
          </div>
        )}

        {/* Solicitar Exclusão */}
        {solicitarExclusao.length > 0 && (
          <div>
            <SectionHeader 
              emoji="🗑️" 
              title="Solicitações de Exclusão" 
              count={solicitarExclusao.length}
              urgent
            />
            <div className="space-y-2">
              {solicitarExclusao.map((tv) => (
                <ApprovalCard key={tv.id} tv={tv} type="exclusion" />
              ))}
            </div>
          </div>
        )}

        {/* Pendentes */}
        {pendentes.length > 0 && (
          <div>
            <SectionHeader 
              emoji="⏳" 
              title="Propostas Pendentes" 
              count={pendentes.length}
            />
            <div className="space-y-2">
              {pendentes.map((tv) => (
                <ApprovalCard key={tv.id} tv={tv} type="pending" />
              ))}
            </div>
          </div>
        )}

        {/* Devolvidos */}
        {devolvidos.length > 0 && (
          <div>
            <SectionHeader 
              emoji="🔄" 
              title="Devolvidos para Revisão" 
              count={devolvidos.length}
            />
            <div className="space-y-2">
              {devolvidos.map((tv) => (
                <ApprovalCard key={tv.id} tv={tv} type="returned" />
              ))}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
