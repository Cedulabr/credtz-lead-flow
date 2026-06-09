import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CreditCard, History } from "lucide-react";

interface CreditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  performanceStats: any;
}

export function CreditRequestModal({ isOpen, onClose, onSuccess, performanceStats }: CreditRequestModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('agibank_credit_requests')
        .insert({
          user_id: user.id,
          amount: amount,
          performance_snapshot: performanceStats,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Solicitação enviada!",
        description: `Sua solicitação de ${amount} créditos foi enviada para análise do administrador.`,
      });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: "Erro ao solicitar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Solicitar Crédito AGibank
          </DialogTitle>
          <DialogDescription>
            Leads com bom desempenho podem solicitar créditos extras. Sua solicitação será revisada pelo administrador.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Quantidade de Créditos</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value))}
              min={1}
            />
          </div>
          <div className="p-3 rounded-lg bg-muted text-xs space-y-1">
            <p className="font-semibold">Snapshot de Desempenho:</p>
            <div className="grid grid-cols-2 gap-1">
              <span>Total Leads: {performanceStats?.total || 0}</span>
              <span>Fechados: {performanceStats?.fechados || 0}</span>
              <span>Conversão: {performanceStats?.conversionRate?.toFixed(1) || 0}%</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Solicitar Crédito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
