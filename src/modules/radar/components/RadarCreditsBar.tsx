import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Coins, Plus } from 'lucide-react';
import { RadarCredits } from '../types';

interface Props {
  credits: RadarCredits | null;
  loading: boolean;
  onRequestRecharge: (quantity: number) => void;
}

export function RadarCreditsBar({ credits, loading, onRequestRecharge }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [quantity, setQuantity] = useState(100);

  if (loading || !credits) return null;

  const usagePercent = credits.monthly_limit > 0
    ? Math.round((credits.credits_used_month / credits.monthly_limit) * 100)
    : 0;

  return (
    <>
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-3 px-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Créditos disponíveis:</span>
              <span className="text-lg font-bold text-primary">{credits.credits_balance}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Usados no mês: <span className="font-medium">{credits.credits_used_month}</span> / {credits.monthly_limit}
              <span className="ml-1">({usagePercent}%)</span>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4" />
            Comprar créditos
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Recarga de Créditos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantidade desejada</label>
              <Input
                type="number"
                min={10}
                step={10}
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 10)}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Sua solicitação será enviada ao administrador para aprovação.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={() => { onRequestRecharge(quantity); setShowDialog(false); }}>
              Solicitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
