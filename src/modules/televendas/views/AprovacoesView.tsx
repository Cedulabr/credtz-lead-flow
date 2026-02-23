import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  onApproveCancellation: (tv: Televenda) => void;
  onRejectCancellation: (tv: Televenda) => void;
  onBulkApproveCancellation?: (items: Televenda[]) => void;
}

export const AprovacoesView = ({
  televendas,
  onApprove,
  onReject,
  onReturn,
  onView,
  onApproveExclusion,
  onRejectExclusion,
  onApproveCancellation,
  onRejectCancellation,
  onBulkApproveCancellation,
}: AprovacoesViewProps) => {
  const [bankFilter, setBankFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedCancellations, setSelectedCancellations] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Type filter options
  const TYPE_FILTER_OPTIONS = [
    { value: "all", label: "Todos", emoji: "📋" },
    { value: "pago_aguardando", label: "Aguard Gestor", emoji: "💰" },
    { value: "cancelado_aguardando", label: "Aguard Cancel.", emoji: "❌" },
    { value: "solicitar_exclusao", label: "Aguard Exclusão", emoji: "🗑️" },
  ];

  // Filter items that need manager action
  const approvalItems = useMemo(() => {
    return televendas.filter((tv) =>
      [
        "pago_aguardando",
        "cancelado_aguardando",
        "solicitar_exclusao",
        "proposta_pendente",
        "devolvido",
      ].includes(tv.status)
    );
  }, [televendas]);

  // Get unique banks from approval items
  const availableBanks = useMemo(() => {
    const banksSet = new Set(approvalItems.map((tv) => tv.banco).filter(Boolean));
    return Array.from(banksSet).sort();
  }, [approvalItems]);

  // Filter options with dynamic counts
  const filterOptionsWithCount = useMemo(() => {
    return TYPE_FILTER_OPTIONS.map(option => ({
      ...option,
      count: option.value === "all" 
        ? approvalItems.length 
        : approvalItems.filter(tv => tv.status === option.value).length
    })).filter(option => option.value === "all" || option.count > 0);
  }, [approvalItems]);

  // Filter by type and bank
  const filteredApprovalItems = useMemo(() => {
    let items = approvalItems;
    if (typeFilter !== "all") {
      items = items.filter((tv) => tv.status === typeFilter);
    }
    if (bankFilter !== "all") {
      items = items.filter((tv) => tv.banco === bankFilter);
    }
    return items;
  }, [approvalItems, bankFilter, typeFilter]);

  // Group by status
  const pagoAguardando = filteredApprovalItems.filter(tv => tv.status === "pago_aguardando");
  const canceladoAguardando = filteredApprovalItems.filter(tv => tv.status === "cancelado_aguardando");
  const solicitarExclusao = filteredApprovalItems.filter(tv => tv.status === "solicitar_exclusao");
  const pendentes = filteredApprovalItems.filter(tv => tv.status === "proposta_pendente");
  const devolvidos = filteredApprovalItems.filter(tv => tv.status === "devolvido");

  // Bulk selection handlers
  const toggleCancellation = (id: string) => {
    setSelectedCancellations(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllCancellations = () => {
    if (selectedCancellations.size === canceladoAguardando.length) {
      setSelectedCancellations(new Set());
    } else {
      setSelectedCancellations(new Set(canceladoAguardando.map(tv => tv.id)));
    }
  };

  const handleBulkApprove = async () => {
    if (!onBulkApproveCancellation || selectedCancellations.size === 0) return;
    setBulkLoading(true);
    const items = canceladoAguardando.filter(tv => selectedCancellations.has(tv.id));
    await onBulkApproveCancellation(items);
    setSelectedCancellations(new Set());
    setBulkLoading(false);
  };

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
    type = "payment",
    showCheckbox = false,
    isChecked = false,
    onCheck,
  }: { 
    tv: Televenda; 
    type?: "payment" | "cancellation" | "exclusion" | "pending" | "returned";
    showCheckbox?: boolean;
    isChecked?: boolean;
    onCheck?: () => void;
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
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showCheckbox && (
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => onCheck?.()}
              onClick={(e) => e.stopPropagation()}
              className="flex-shrink-0"
            />
          )}
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
        </div>

        {/* Actions based on type */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {type === "payment" && (
            <>
              <Button size="sm" onClick={(e) => { e.stopPropagation(); onApprove(tv); }} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white h-10 px-4">
                <CheckCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Aprovar Pago</span>
              </Button>
              <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onReject(tv); }} className="gap-1.5 h-10 px-4">
                <XCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Cancelar</span>
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onReturn(tv); }} className="gap-1.5 h-10 px-4">
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Devolver</span>
              </Button>
            </>
          )}
          {type === "cancellation" && (
            <>
              <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onApproveCancellation(tv); }} className="gap-1.5 h-10 px-4">
                <XCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Aprovar Cancelamento</span>
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onRejectCancellation(tv); }} className="gap-1.5 h-10 px-4">
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">Rejeitar</span>
              </Button>
            </>
          )}
          {type === "exclusion" && (
            <>
              <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); onApproveExclusion(tv); }} className="gap-1.5 h-10 px-4">
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">Confirmar Exclusão</span>
              </Button>
              <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onRejectExclusion(tv); }} className="gap-1.5 h-10 px-4">
                <XCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Rejeitar</span>
              </Button>
            </>
          )}
          {type === "pending" && (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onView(tv); }} className="gap-1.5 h-10 px-4">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Ver Detalhes</span>
            </Button>
          )}
          {type === "returned" && (
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onView(tv); }} className="gap-1.5 h-10 px-4">
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
      {/* Summary banner with filters */}
      <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-300 mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-semibold text-amber-700">
                {filteredApprovalItems.length} item{filteredApprovalItems.length !== 1 ? 's' : ''} aguardando ação
              </span>
            </div>
            
            {availableBanks.length > 1 && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-600" />
                <Select value={bankFilter} onValueChange={setBankFilter}>
                  <SelectTrigger className="w-[180px] h-9 bg-background border-amber-300">
                    <SelectValue placeholder="Filtrar por banco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os bancos</SelectItem>
                    {availableBanks.map((bank) => (
                      <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Type filter buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {filterOptionsWithCount.map((option) => (
              <Button
                key={option.value}
                variant={typeFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(option.value)}
                className="gap-1.5 h-8"
              >
                <span>{option.emoji}</span>
                <span className="hidden sm:inline">{option.label}</span>
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                  {option.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {/* Pago Aguardando Gestor */}
        {pagoAguardando.length > 0 && (
          <div>
            <SectionHeader emoji="💰" title="Pago Aguardando Aprovação" count={pagoAguardando.length} urgent />
            <div className="space-y-2">
              {pagoAguardando.map((tv) => (
                <ApprovalCard key={tv.id} tv={tv} type="payment" />
              ))}
            </div>
          </div>
        )}

        {/* Cancelado Aguardando Gestor - with bulk selection */}
        {canceladoAguardando.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 mt-6 first:mt-0">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedCancellations.size === canceladoAguardando.length && canceladoAguardando.length > 0}
                  onCheckedChange={toggleAllCancellations}
                />
                <span className="text-xl">❌</span>
                <h3 className="text-base font-semibold">Solicitações de Cancelamento</h3>
                <Badge variant="destructive" className="animate-pulse">
                  {canceladoAguardando.length}
                </Badge>
              </div>
              {selectedCancellations.size > 0 && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBulkApprove}
                  disabled={bulkLoading}
                  className="gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  Aprovar {selectedCancellations.size} selecionado{selectedCancellations.size > 1 ? 's' : ''}
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {canceladoAguardando.map((tv) => (
                <ApprovalCard
                  key={tv.id}
                  tv={tv}
                  type="cancellation"
                  showCheckbox
                  isChecked={selectedCancellations.has(tv.id)}
                  onCheck={() => toggleCancellation(tv.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Solicitar Exclusão */}
        {solicitarExclusao.length > 0 && (
          <div>
            <SectionHeader emoji="🗑️" title="Solicitações de Exclusão" count={solicitarExclusao.length} urgent />
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
            <SectionHeader emoji="⏳" title="Propostas Pendentes" count={pendentes.length} />
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
            <SectionHeader emoji="🔄" title="Devolvidos para Revisão" count={devolvidos.length} />
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
