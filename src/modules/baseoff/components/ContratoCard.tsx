import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  CreditCard, 
  ChevronDown, 
  ChevronUp,
  Calculator,
  RefreshCw,
  ArrowRightLeft,
  FileText,
  Calendar,
  Percent,
  Wallet
} from 'lucide-react';
import { BaseOffContract, ClientStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatCurrency, formatDate } from '../utils';
import { cn } from '@/lib/utils';

interface ContratoCardProps {
  contract: BaseOffContract;
  onSimular?: () => void;
  onRefinanciar?: () => void;
  onPortar?: () => void;
  onGerarProposta?: () => void;
}

// Map situacao to status
function getContractStatus(situacao: string | null): ClientStatus {
  if (!situacao) return 'simulado';
  const lower = situacao.toLowerCase();
  if (lower.includes('ativo') || lower.includes('normal') || lower.includes('regular')) {
    return 'ativo';
  }
  if (lower.includes('finalizado') || lower.includes('quitado') || lower.includes('liquidado')) {
    return 'finalizado';
  }
  if (lower.includes('analise') || lower.includes('andamento')) {
    return 'em_analise';
  }
  if (lower.includes('vencendo') || lower.includes('atraso')) {
    return 'vencendo';
  }
  return 'simulado';
}

export function ContratoCard({ 
  contract, 
  onSimular, 
  onRefinanciar, 
  onPortar, 
  onGerarProposta 
}: ContratoCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const status = getContractStatus(contract.situacao_emprestimo);

  return (
    <Card className="overflow-hidden border-2 hover:border-primary/30 transition-all">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 text-left hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-4">
              {/* Left - Bank Info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg">
                      Banco {contract.banco_emprestimo || 'N/I'}
                    </span>
                    <StatusBadge status={status} size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {contract.tipo_emprestimo || 'Empréstimo'} • Contrato: {contract.contrato}
                  </p>
                </div>
              </div>

              {/* Middle - Key Values */}
              <div className="hidden md:flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Parcela</p>
                  <p className="font-bold text-lg">{formatCurrency(contract.vl_parcela)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Saldo</p>
                  <p className="font-bold text-lg">{formatCurrency(contract.saldo)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Prazo</p>
                  <p className="font-bold text-lg">{contract.prazo || '---'}</p>
                </div>
              </div>

              {/* Right - Expand Button */}
              <div className="shrink-0">
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Mobile Values Row */}
            <div className="flex md:hidden items-center gap-4 mt-3 pt-3 border-t">
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground">Parcela</p>
                <p className="font-bold">{formatCurrency(contract.vl_parcela)}</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className="font-bold">{formatCurrency(contract.saldo)}</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-muted-foreground">Prazo</p>
                <p className="font-bold">{contract.prazo || '---'}</p>
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 border-t bg-muted/20">
            {/* Contract Details */}
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 py-4">
              <DetailItem 
                icon={Wallet} 
                label="Valor Empréstimo" 
                value={formatCurrency(contract.vl_emprestimo)} 
              />
              <DetailItem 
                icon={Percent} 
                label="Taxa" 
                value={contract.taxa ? `${contract.taxa}%` : '---'} 
              />
              <DetailItem 
                icon={Calendar} 
                label="Início Desconto" 
                value={formatDate(contract.inicio_desconto)} 
              />
              <DetailItem 
                icon={Calendar} 
                label="Data Averbação" 
                value={formatDate(contract.data_averbacao)} 
              />
              <DetailItem 
                icon={Calendar} 
                label="Competência Final" 
                value={formatDate(contract.competencia_final)} 
              />
              <DetailItem 
                icon={FileText} 
                label="Situação" 
                value={contract.situacao_emprestimo || '---'} 
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              {onSimular && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); onSimular(); }}
                  className="gap-2"
                >
                  <Calculator className="w-4 h-4" />
                  Simular
                </Button>
              )}
              {onRefinanciar && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); onRefinanciar(); }}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refinanciar
                </Button>
              )}
              {onPortar && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); onPortar(); }}
                  className="gap-2"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  Portar
                </Button>
              )}
              {onGerarProposta && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={(e) => { e.stopPropagation(); onGerarProposta(); }}
                  className="gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Gerar Proposta
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function DetailItem({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType;
  label: string; 
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-background">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value || '---'}</p>
      </div>
    </div>
  );
}
