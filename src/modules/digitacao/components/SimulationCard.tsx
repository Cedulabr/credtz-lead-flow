import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, X } from 'lucide-react';
import { SimulationItem } from '../types';
import { Separator } from '@/components/ui/separator';

interface SimulationCardProps {
  simulation: SimulationItem;
  onEdit?: () => void;
  onRemove: () => void;
}

export function SimulationCard({ simulation: s, onEdit, onRemove }: SimulationCardProps) {
  const needsPort = s.operationType >= 3;
  const needsRefin = s.operationType === 2 || s.operationType === 4;

  return (
    <Card className="border">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <p className="text-sm font-bold">{s.product}</p>
          <div className="flex gap-1">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Portabilidade */}
        {needsPort && (
          <>
            <p className="text-xs font-bold text-primary">Portabilidade</p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Contrato</span>
                <p className="font-medium">{s.originContractNumber || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Banco</span>
                <p className="font-medium">{s.originLenderCode} {s.originLenderName && `- ${s.originLenderName}`}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Saldo Devedor</span>
                <p className="font-medium">{s.originDueBalance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Parc. Restantes</span>
                <p className="font-medium">{s.originInstallmentsRemaining} de {s.originTerm}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Taxa</span>
                <p className="font-medium">{s.originRate}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Parcela</span>
                <p className="font-medium">{s.originInstallmentValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            <div className="text-xs">
              <span className="text-muted-foreground">Tabela</span>
              <p className="font-medium truncate">{s.ruleName || s.ruleId}</p>
            </div>
          </>
        )}

        {/* Refinanciamento */}
        {needsRefin && (
          <>
            <Separator />
            <p className="text-xs font-bold text-primary">Refinanciamento</p>
            <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
              <div>
                <span className="text-muted-foreground">Valor do Contrato</span>
                <p className="font-medium">{s.refinContractValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Prazo</span>
                <p className="font-medium">{s.refinTerm}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Vl. Parcela</span>
                <p className="font-medium">{s.refinInstallmentValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Taxa</span>
                <p className="font-medium">{s.refinRate}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor do Troco</span>
                <p className="font-bold text-primary">{s.changeValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </>
        )}

        {/* Novo — basic info */}
        {!needsPort && !needsRefin && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <span className="text-muted-foreground">Tabela</span>
              <p className="font-medium truncate">{s.ruleName || s.ruleId}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
