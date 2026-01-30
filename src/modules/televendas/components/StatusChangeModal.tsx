import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AlertTriangle, ArrowRight, CheckCircle, Shield, CalendarIcon } from "lucide-react";
import { Televenda, STATUS_CONFIG } from "../types";
import { cn } from "@/lib/utils";

interface StatusChangeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  televenda: Televenda | null;
  newStatus: string;
  onConfirm: (reason: string, paymentDate?: string) => Promise<void>;
  isLoading?: boolean;
}

// Status que requerem data de pagamento
const PAYMENT_STATUSES = ["pago_aguardando", "proposta_paga"];

export const StatusChangeModal = ({
  open,
  onOpenChange,
  televenda,
  newStatus,
  onConfirm,
  isLoading,
}: StatusChangeModalProps) => {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date | undefined>(undefined);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setReason("");
      setError("");
      // Default to today's date for payment statuses
      if (PAYMENT_STATUSES.includes(newStatus)) {
        setPaymentDate(new Date());
      } else {
        setPaymentDate(undefined);
      }
    }
  }, [open, newStatus]);

  if (!televenda) return null;

  const currentConfig = STATUS_CONFIG[televenda.status];
  const newConfig = STATUS_CONFIG[newStatus];

  // Determine if this is a critical change
  const isCriticalChange = 
    newStatus === "proposta_paga" ||
    newStatus === "proposta_cancelada" ||
    newStatus === "exclusao_aprovada" ||
    televenda.status.includes("pago") ||
    televenda.status.includes("cancelado");

  // Check if we need to show payment date picker
  const requiresPaymentDate = PAYMENT_STATUSES.includes(newStatus);

  const handleConfirm = async () => {
    if (isCriticalChange && !reason.trim()) {
      setError("Por favor, informe o motivo da alteração");
      return;
    }

    setError("");
    try {
      const paymentDateStr = paymentDate 
        ? format(paymentDate, "yyyy-MM-dd")
        : undefined;
      await onConfirm(reason.trim(), paymentDateStr);
      setReason("");
      setPaymentDate(undefined);
      // Modal will be closed by parent after successful update
    } catch (error) {
      console.error("Error in confirm:", error);
      setError("Erro ao processar alteração");
    }
  };

  const handleClose = () => {
    if (isLoading) return; // Prevent closing while loading
    setReason("");
    setError("");
    setPaymentDate(undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCriticalChange && (
              <Shield className="h-5 w-5 text-amber-500" />
            )}
            Alterar Status da Proposta
          </DialogTitle>
          <DialogDescription>
            Confirme a alteração de status para a proposta de{" "}
            <span className="font-semibold">{televenda.nome}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status transition */}
          <div className="flex items-center justify-center gap-4 p-4 bg-muted/50 rounded-xl">
            {currentConfig && (
              <Badge
                variant="outline"
                className={cn("px-3 py-1.5 text-sm", currentConfig.bgColor)}
              >
                {currentConfig.emoji} {currentConfig.shortLabel}
              </Badge>
            )}
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            {newConfig && (
              <Badge
                variant="outline"
                className={cn("px-3 py-1.5 text-sm", newConfig.bgColor)}
              >
                {newConfig.emoji} {newConfig.shortLabel}
              </Badge>
            )}
          </div>

          {/* Critical change warning */}
          {isCriticalChange && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-300 rounded-xl"
            >
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Alteração crítica
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-300">
                  Esta alteração será registrada no histórico com data, hora e
                  seu nome. Por favor, informe o motivo.
                </p>
              </div>
            </motion.div>
          )}

          {/* Payment date picker - only for payment statuses */}
          {requiresPaymentDate && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <Label htmlFor="payment-date" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-green-600" />
                Data do Pagamento
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="payment-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? (
                      format(paymentDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecionar data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={setPaymentDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Informe a data em que o pagamento foi efetivamente realizado
              </p>
            </motion.div>
          )}

          {/* Reason input */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="flex items-center gap-2">
              Motivo da alteração
              {isCriticalChange && (
                <span className="text-destructive">*</span>
              )}
            </Label>
            <Textarea
              id="reason"
              placeholder="Descreva o motivo da alteração de status..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={cn(
                "resize-none",
                error && "border-destructive focus:ring-destructive"
              )}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          {/* Audit info */}
          <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
            <p className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Esta alteração será registrada automaticamente no histórico
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Confirmar Alteração"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
