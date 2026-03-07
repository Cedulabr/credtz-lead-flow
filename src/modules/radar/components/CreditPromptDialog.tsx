import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Coins, AlertTriangle } from 'lucide-react';
import { RadarCredits } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credits: RadarCredits | null;
  totalAvailable: number;
  onConfirm: (creditsToUse: number) => void;
}

export function CreditPromptDialog({ open, onOpenChange, credits, totalAvailable, onConfirm }: Props) {
  const [amount, setAmount] = useState(1);
  const balance = credits?.credits_balance ?? 0;

  const handleConfirm = () => {
    if (amount < 1 || amount > balance) return;
    onConfirm(amount);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Quantos créditos deseja usar?
          </DialogTitle>
          <DialogDescription>
            Cada crédito carrega uma página de resultados da busca.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {totalAvailable > 5000 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <span>
                Existem <strong>{totalAvailable.toLocaleString('pt-BR')}</strong> oportunidades disponíveis. 
                Por performance, carregamos até 5.000 por busca.
              </span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Seus créditos disponíveis:</span>
            <span className="text-lg font-bold text-primary">{balance}</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Créditos a consumir nesta busca</label>
            <Input
              type="number"
              min={1}
              max={balance}
              value={amount}
              onChange={e => setAmount(Math.max(1, Math.min(balance, parseInt(e.target.value) || 1)))}
            />
            <p className="text-xs text-muted-foreground">Mínimo: 1 crédito por busca</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={amount < 1 || amount > balance}>
            Confirmar e Buscar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
