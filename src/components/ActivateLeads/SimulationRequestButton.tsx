import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { BarChart3, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useActivateLeadSimulations } from "@/hooks/useActivateLeadSimulations";

interface ActivateSimulationRequestButtonProps {
  leadId: string;
  leadName: string;
  currentSimulationStatus?: string | null;
  onSuccess?: () => void;
  variant?: "icon" | "full";
}

export function ActivateSimulationRequestButton({
  leadId,
  leadName,
  currentSimulationStatus,
  onSuccess,
  variant = "icon",
}: ActivateSimulationRequestButtonProps) {
  const { toast } = useToast();
  const { requestSimulation } = useActivateLeadSimulations();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const hasActiveSimulation = currentSimulationStatus && 
    ['solicitada', 'em_andamento', 'enviada', 'recebida'].includes(currentSimulationStatus);

  const getStatusInfo = () => {
    switch (currentSimulationStatus) {
      case 'solicitada':
        return { label: 'Aguardando', color: 'text-amber-600', bgColor: 'bg-amber-50 dark:bg-amber-950' };
      case 'em_andamento':
        return { label: 'Em Andamento', color: 'text-blue-600', bgColor: 'bg-blue-50 dark:bg-blue-950' };
      case 'enviada':
        return { label: 'Pronta!', color: 'text-emerald-600', bgColor: 'bg-emerald-50 dark:bg-emerald-950' };
      case 'recebida':
        return { label: 'Confirmada', color: 'text-green-600', bgColor: 'bg-green-50 dark:bg-green-950' };
      default:
        return null;
    }
  };

  const handleRequest = async () => {
    setIsLoading(true);
    try {
      await requestSimulation(leadId, leadName);
      setIsSuccess(true);
      toast({
        title: "📊 Simulação Solicitada!",
        description: "O gestor será notificado e a simulação será preparada.",
      });
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
        onSuccess?.();
      }, 1500);
    } catch (error: any) {
      console.error('Error requesting simulation:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao solicitar simulação",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const statusInfo = getStatusInfo();

  if (hasActiveSimulation && statusInfo) {
    return (
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.bgColor} ${statusInfo.color}`}
      >
        {currentSimulationStatus === 'solicitada' && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-amber-500"
          />
        )}
        {currentSimulationStatus === 'enviada' && (
          <CheckCircle className="h-3 w-3" />
        )}
        {currentSimulationStatus === 'recebida' && (
          <CheckCircle className="h-3 w-3" />
        )}
        {statusInfo.label}
      </motion.div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size={variant === "icon" ? "icon" : "sm"}
        onClick={() => setIsOpen(true)}
        className="border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-300 dark:border-violet-800 dark:text-violet-300 dark:hover:bg-violet-950"
        title="Solicitar Simulação"
      >
        <BarChart3 className="h-4 w-4" />
        {variant === "full" && <span className="ml-2">Solicitar Simulação</span>}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-violet-600" />
              Solicitar Simulação
            </DialogTitle>
            <DialogDescription>
              Envie uma solicitação de simulação para o gestor
            </DialogDescription>
          </DialogHeader>

          <AnimatePresence mode="wait">
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="py-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center"
                >
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </motion.div>
                <p className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">Solicitação Enviada!</p>
                <p className="text-sm text-muted-foreground mt-1">O gestor será notificado</p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-4"
              >
                <div className="bg-violet-50 dark:bg-violet-950 rounded-lg p-4 mb-4">
                  <p className="text-sm text-violet-700 dark:text-violet-300">
                    <strong>Cliente:</strong> {leadName}
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ao solicitar, o gestor receberá uma notificação e preparará a simulação.
                  Você será notificado quando estiver pronta.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {!isSuccess && (
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
                Cancelar
              </Button>
              <Button
                onClick={handleRequest}
                disabled={isLoading}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Solicitar
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
