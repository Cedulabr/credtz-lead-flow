import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { History, CheckCircle, XCircle, Clock, Send, RefreshCw, CircleDollarSign, PhoneOff, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SmsHistoryRecord } from "../types";

interface HistoryViewProps {
  history: SmsHistoryRecord[];
  onRefresh?: () => void;
}

const STATUS_ICON: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Pendente" },
  sent: { icon: Send, color: "text-blue-600", label: "Enviado" },
  delivered: { icon: CheckCircle, color: "text-emerald-600", label: "Entregue" },
  failed: { icon: XCircle, color: "text-red-600", label: "Falhou" },
};

export const HistoryView = ({ history, onRefresh }: HistoryViewProps) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    return history.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && (r.send_type || "manual") !== typeFilter) return false;
      if (dateFilter === "today" && new Date(r.created_at) < todayStart) return false;
      if (dateFilter === "7days" && new Date(r.created_at) < weekAgo) return false;
      return true;
    });
  }, [history, statusFilter, typeFilter, dateFilter]);

  const statusFilters = [
    { value: "all", label: "Todos" },
    { value: "sent", label: "Enviado" },
    { value: "failed", label: "Falhou" },
    { value: "pending", label: "Pendente" },
  ];

  const typeFilters = [
    { value: "all", label: "Todos" },
    { value: "manual", label: "Manual" },
    { value: "automatico", label: "Auto" },
  ];

  const dateFilters = [
    { value: "all", label: "Todas datas" },
    { value: "today", label: "Hoje" },
    { value: "7days", label: "7 dias" },
  ];

  if (history.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
          <History className="h-8 w-8 opacity-40" />
        </div>
        <p className="font-medium">Nenhum envio registrado</p>
        <p className="text-sm mt-1">O histórico aparecerá aqui após o primeiro disparo</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <History className="h-5 w-5 text-cyan-500" />
          </div>
          <h2 className="text-lg font-semibold">Histórico de Envios</h2>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh} className="gap-1.5 h-8 text-xs rounded-lg">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {dateFilters.map((f) => (
          <button key={f.value} onClick={() => setDateFilter(f.value)} className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition-all border ${dateFilter === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}>{f.label}</button>
        ))}
        <span className="w-px h-7 bg-border mx-1" />
        {statusFilters.map((f) => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)} className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition-all border ${statusFilter === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}>{f.label}</button>
        ))}
        <span className="w-px h-7 bg-border mx-1" />
        {typeFilters.map((f) => (
          <button key={f.value} onClick={() => setTypeFilter(f.value)} className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition-all border ${typeFilter === f.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:bg-muted"}`}>{f.label}</button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} registro(s)</p>

      <div className="space-y-2">
        {filtered.map((record, index) => {
          const isCreditError = record.status === "failed" && record.error_message?.startsWith("CREDITO_INSUFICIENTE");
          const statusConfig = isCreditError ? { icon: CircleDollarSign, color: "text-amber-600", label: "Sem Crédito" } : (STATUS_ICON[record.status] || STATUS_ICON.pending);
          const Icon = statusConfig.icon;
          const sendType = record.send_type || "manual";
          return (
            <motion.div key={record.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.015 }} className={`flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/20 transition-colors ${isCreditError ? "border-amber-300/50" : "border-border/50"}`}>
              <Icon className={`h-4 w-4 flex-shrink-0 ${statusConfig.color}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{record.contact_name || record.phone}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{record.phone}</span>
                  <Badge variant={sendType === "automatico" ? "default" : "outline"} className="text-[9px] h-4">{sendType === "automatico" ? "Auto" : "Manual"}</Badge>
                  {(record as any).provider && <Badge variant="outline" className="text-[9px] h-4 gap-0.5">{(record as any).provider === "yup_chat" ? "💬 Yup" : "📱 Twilio"}</Badge>}
                  {isCreditError && <Badge variant="outline" className="text-[9px] h-4 border-amber-400 text-amber-600">💰 Crédito</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{record.message}</p>
                {record.error_message && <p className="text-[10px] text-red-500 truncate mt-0.5">Erro: {isCreditError ? record.error_message.replace("CREDITO_INSUFICIENTE: ", "") : record.error_message}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                <p className="text-[10px] text-muted-foreground">{new Date(record.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">Nenhum registro encontrado com os filtros</div>}
      </div>
    </div>
  );
};
