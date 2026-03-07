import React, { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CreditCard, 
  Calendar,
  Percent,
  CheckCircle,
  Clock
} from 'lucide-react';
import { BaseOffContract } from '../types';
import { formatCurrency, formatDate, calculateInstallments, calcSaldoDevedor } from '../utils';
import { cn } from '@/lib/utils';

interface ContratoCardProps {
  contract: BaseOffContract;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function ContratoCard({ contract, selected, onToggleSelect }: ContratoCardProps) {
  const installments = useMemo(() => 
    calculateInstallments(contract.data_averbacao, contract.prazo),
    [contract.data_averbacao, contract.prazo]
  );

  const saldoCalculado = useMemo(() => {
    const sd = calcSaldoDevedor(contract.vl_parcela, contract.taxa, installments.restantes);
    return sd !== null ? sd : contract.saldo;
  }, [contract.vl_parcela, contract.taxa, installments.restantes, contract.saldo]);

  const isAvailable = installments.pagas >= 12;

  return (
    <Card 
      className={cn(
        "p-4 shadow-sm transition-all cursor-pointer hover:shadow-md",
        selected && "ring-2 ring-primary border-primary/50",
      )}
      onClick={() => onToggleSelect?.(contract.id)}
    >
      {/* Top Row: Checkbox + Bank + Badge */}
      <div className="flex items-center gap-3 mb-3">
        {onToggleSelect && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(contract.id)}
            className="shrink-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base">Banco {contract.banco_emprestimo || 'N/I'}</span>
            {isAvailable ? (
              <Badge variant="secondary" className="text-xs gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                <CheckCircle className="w-3 h-3" /> Disponível
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs">
                {installments.pagas}/{contract.prazo || 0} pagas
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {contract.tipo_emprestimo || 'Empréstimo'} • Nº {contract.contrato}
          </p>
        </div>
      </div>

      {/* Data Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <DataCell label="Parcela" value={formatCurrency(contract.vl_parcela)} highlight />
        <DataCell label="Saldo Devedor" value={formatCurrency(saldoCalculado)} highlight />
        <DataCell label="Taxa" value={contract.taxa ? `${contract.taxa}%` : '---'} />
        <DataCell 
          label="Pagas / Restantes" 
          value={
            <span>
              <span className="text-emerald-600">{installments.pagas}</span>
              <span className="text-muted-foreground"> / </span>
              <span className="text-orange-600">{installments.restantes}</span>
            </span>
          } 
        />
        <DataCell label="Prazo" value={`${contract.prazo || 0}x`} />
        <DataCell label="Averbação" value={formatDate(contract.data_averbacao)} />
      </div>
    </Card>
  );
}

function DataCell({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <p className={cn("text-sm", highlight ? "font-bold" : "font-medium")}>{value}</p>
    </div>
  );
}
