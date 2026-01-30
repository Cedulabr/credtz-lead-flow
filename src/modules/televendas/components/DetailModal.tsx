import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Phone, 
  MessageSquare, 
  User, 
  CreditCard, 
  Calendar, 
  Building2,
  Clock,
  History,
  FileText,
  DollarSign,
  Hash,
  Copy,
  Check,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Televenda, StatusHistoryItem, STATUS_CONFIG } from "../types";
import { formatCPF, formatCurrency, formatPhone, formatDate, formatTimeAgo } from "../utils";
import { StatusBadge } from "./StatusBadge";

interface DetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  televenda: Televenda | null;
}

export const DetailModal = ({ open, onOpenChange, televenda }: DetailModalProps) => {
  const [history, setHistory] = useState<StatusHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (open && televenda) {
      fetchHistory();
    }
  }, [open, televenda?.id]);

  const fetchHistory = async () => {
    if (!televenda) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("televendas_status_history")
        .select("*")
        .eq("televendas_id", televenda.id)
        .order("changed_at", { ascending: false });

      if (error) throw error;

      // Enrich with user names
      if (data?.length) {
        const userIds = [...new Set(data.map((h) => h.changed_by).filter(Boolean))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", userIds);
        const profilesMap = new Map((profiles || []).map((p) => [p.id, p.name]));

        setHistory(
          data.map((h) => ({
            ...h,
            changed_by_name: profilesMap.get(h.changed_by) || "Sistema",
          }))
        );
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleWhatsApp = () => {
    if (!televenda) return;
    const phone = televenda.telefone.replace(/\D/g, "");
    const firstName = televenda.nome.split(" ")[0];
    const message = encodeURIComponent(`Olá ${firstName}, tudo bem?`);
    window.open(`https://wa.me/55${phone}?text=${message}`, "_blank");
  };

  const handleCall = () => {
    if (!televenda) return;
    window.open(`tel:${televenda.telefone.replace(/\D/g, "")}`, "_self");
  };

  if (!televenda) return null;

  const InfoRow = ({ 
    icon: Icon, 
    label, 
    value, 
    copyable = false,
    className = ""
  }: { 
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | React.ReactNode;
    copyable?: boolean;
    className?: string;
  }) => (
    <div className={`flex items-start gap-3 py-3 ${className}`}>
      <div className="p-2 rounded-lg bg-muted">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium break-all">{value}</span>
          {copyable && typeof value === 'string' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => handleCopy(value, label)}
            >
              {copiedField === label ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold mb-2 truncate">
                {televenda.nome}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={televenda.status} size="md" />
                <Badge variant="outline" className="font-mono">
                  {formatCPF(televenda.cpf)}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 pt-2 space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button 
                onClick={handleWhatsApp}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              >
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </Button>
              <Button 
                onClick={handleCall}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Phone className="h-4 w-4" />
                Ligar
              </Button>
            </div>

            <Separator />

            {/* Client Info Section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                DADOS DO CLIENTE
              </h3>
              <div className="bg-muted/30 rounded-xl p-1">
                <InfoRow 
                  icon={User} 
                  label="Nome Completo" 
                  value={televenda.nome}
                />
                <InfoRow 
                  icon={Hash} 
                  label="CPF" 
                  value={formatCPF(televenda.cpf)}
                  copyable
                />
                <InfoRow 
                  icon={Phone} 
                  label="Telefone" 
                  value={formatPhone(televenda.telefone)}
                  copyable
                />
              </div>
            </div>

            <Separator />

            {/* Operation Info Section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                DADOS DA OPERAÇÃO
              </h3>
              <div className="bg-muted/30 rounded-xl p-1">
                <InfoRow 
                  icon={FileText} 
                  label="Tipo de Operação" 
                  value={televenda.tipo_operacao}
                />
                <InfoRow 
                  icon={Building2} 
                  label="Banco" 
                  value={televenda.banco}
                />
                <InfoRow 
                  icon={Calendar} 
                  label="Data da Venda" 
                  value={formatDate(televenda.data_venda)}
                />
                <InfoRow 
                  icon={Clock} 
                  label="Data de Cadastro" 
                  value={formatDate(televenda.created_at)}
                />
                {televenda.data_pagamento && (
                  <InfoRow 
                    icon={CheckCircle2} 
                    label="Data do Pagamento" 
                    value={formatDate(televenda.data_pagamento)}
                    className="bg-green-500/5"
                  />
                )}
              </div>
            </div>

            <Separator />

            {/* Values Section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                VALORES
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Parcela</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(televenda.parcela)}
                  </p>
                </div>
                {televenda.troco && televenda.troco > 0 && (
                  <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Troco</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(televenda.troco)}
                    </p>
                  </div>
                )}
                {televenda.saldo_devedor && televenda.saldo_devedor > 0 && (
                  <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
                    <p className="text-xs text-muted-foreground mb-1">Saldo Devedor</p>
                    <p className="text-lg font-bold text-violet-600">
                      {formatCurrency(televenda.saldo_devedor)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Observation */}
            {televenda.observacao && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    OBSERVAÇÕES
                  </h3>
                  <div className="p-4 rounded-xl bg-muted/30 text-sm">
                    {televenda.observacao}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Status History */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <History className="h-4 w-4" />
                HISTÓRICO DE STATUS
              </h3>
              
              {loadingHistory ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum histórico de mudança de status
                </p>
              ) : (
                <div className="space-y-1">
                  {history.map((item, index) => {
                    const toConfig = STATUS_CONFIG[item.to_status];
                    const fromConfig = item.from_status ? STATUS_CONFIG[item.from_status] : null;
                    
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className={`p-2 rounded-full ${toConfig?.bgColor || 'bg-muted'}`}>
                          <Clock className={`h-3 w-3 ${toConfig?.color || 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {fromConfig && (
                              <>
                                <span className="text-sm text-muted-foreground">
                                  {fromConfig.emoji} {fromConfig.shortLabel}
                                </span>
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <span className={`text-sm font-medium ${toConfig?.color || ''}`}>
                              {toConfig?.emoji || '❓'} {toConfig?.shortLabel || item.to_status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>👤 {item.changed_by_name}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(item.changed_at)}</span>
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Criado em {formatDate(televenda.created_at)} ({formatTimeAgo(televenda.created_at)})
                </span>
                {televenda.user?.name && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {televenda.user.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
