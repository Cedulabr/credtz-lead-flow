import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calculator, 
  Wallet, 
  TrendingDown, 
  Percent, 
  Calendar,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { BaseOffContract } from '../types';
import { formatCurrency } from '../utils';
import { cn } from '@/lib/utils';

export interface TrocoSimulation {
  banco: string;
  bancoLabel: string;
  taxa: number;
  prazo: number;
  saldoDevedor: number;
  novaParcela: number;
  troco: number;
  economiaTotal: number;
  selectedContracts: string[];
}

interface TrocoCalculatorProps {
  contracts: BaseOffContract[];
  selectedContracts: string[];
  onSelectionChange: (ids: string[]) => void;
  onSimulationChange?: (simulation: TrocoSimulation | null) => void;
  onGeneratePDF?: (simulation: TrocoSimulation) => void;
  compact?: boolean;
}

const BANCOS_SIMULACAO = [
  { value: 'BMG', label: 'BMG', taxaBase: 1.80 },
  { value: 'C6', label: 'C6 Bank', taxaBase: 1.75 },
  { value: 'SAFRA', label: 'Safra', taxaBase: 1.85 },
  { value: 'MASTER', label: 'Master', taxaBase: 1.90 },
  { value: 'PAN', label: 'Banco Pan', taxaBase: 1.82 },
  { value: 'OLE', label: 'Olé', taxaBase: 1.88 },
  { value: 'FACTA', label: 'Facta', taxaBase: 1.79 },
  { value: 'ITAU', label: 'Itaú', taxaBase: 1.70 },
  { value: 'BRADESCO', label: 'Bradesco', taxaBase: 1.72 },
  { value: 'SANTANDER', label: 'Santander', taxaBase: 1.78 },
];

const PRAZOS = [12, 24, 36, 48, 60, 72, 84, 96];

export function TrocoCalculator({ 
  contracts, 
  selectedContracts, 
  onSelectionChange,
  onSimulationChange,
  onGeneratePDF,
  compact = false
}: TrocoCalculatorProps) {
  const [banco, setBanco] = useState(BANCOS_SIMULACAO[0].value);
  const [prazo, setPrazo] = useState(84);
  const [taxaCustom, setTaxaCustom] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(!compact);

  const bancoInfo = BANCOS_SIMULACAO.find(b => b.value === banco);
  const taxaEfetiva = taxaCustom ?? (bancoInfo?.taxaBase || 1.80);

  // Calculate totals from selected contracts
  const totals = useMemo(() => {
    const selected = contracts.filter(c => selectedContracts.includes(c.id));
    return {
      saldoTotal: selected.reduce((sum, c) => sum + (c.saldo || 0), 0),
      parcelaTotal: selected.reduce((sum, c) => sum + (c.vl_parcela || 0), 0),
      qtdContratos: selected.length,
    };
  }, [contracts, selectedContracts]);

  // Calculate simulation
  const simulation = useMemo<TrocoSimulation | null>(() => {
    if (selectedContracts.length === 0 || totals.saldoTotal <= 0) {
      return null;
    }

    const taxaMensal = taxaEfetiva / 100;
    const n = prazo;
    const saldoDevedor = totals.saldoTotal;

    // PMT = PV * [r(1+r)^n] / [(1+r)^n - 1]
    const fator = (taxaMensal * Math.pow(1 + taxaMensal, n)) / (Math.pow(1 + taxaMensal, n) - 1);
    const novaParcela = saldoDevedor * fator;

    // Cálculo do troco (valor liberado)
    // Troco = Valor refinanciado - Saldo quitado - Custos operacionais (~2%)
    const valorTotalRefinanciado = novaParcela * n;
    const custosOperacionais = saldoDevedor * 0.02;
    const troco = Math.max(0, (valorTotalRefinanciado * 0.85) - saldoDevedor - custosOperacionais);

    // Economia comparando parcelas atuais vs nova
    const economiaTotal = (totals.parcelaTotal - novaParcela) * prazo;

    return {
      banco,
      bancoLabel: bancoInfo?.label || banco,
      taxa: taxaEfetiva,
      prazo,
      saldoDevedor,
      novaParcela,
      troco,
      economiaTotal,
      selectedContracts,
    };
  }, [banco, bancoInfo, prazo, taxaEfetiva, selectedContracts, totals]);

  // Notify parent of simulation changes
  React.useEffect(() => {
    onSimulationChange?.(simulation);
  }, [simulation, onSimulationChange]);

  const handleGeneratePDF = () => {
    if (simulation) {
      onGeneratePDF?.(simulation);
    }
  };

  if (contracts.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div 
        className={cn(
          "p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b cursor-pointer",
          "flex items-center justify-between"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Simulador de Troco</h3>
            <p className="text-sm text-muted-foreground">
              {selectedContracts.length > 0 
                ? `${selectedContracts.length} contrato(s) • ${formatCurrency(totals.saldoTotal)}`
                : 'Selecione contratos para simular'
              }
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </Button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Parameters */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Banco para Refinanciamento
              </Label>
              <Select value={banco} onValueChange={setBanco}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANCOS_SIMULACAO.map(b => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label} ({b.taxaBase}% a.m.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Novo Prazo
              </Label>
              <Select value={String(prazo)} onValueChange={(v) => setPrazo(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRAZOS.map(p => (
                    <SelectItem key={p} value={String(p)}>
                      {p} meses ({Math.floor(p / 12)} anos{p % 12 > 0 ? ` e ${p % 12} meses` : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Rate Slider */}
          <div className="space-y-3">
            <Label className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Taxa Personalizada
              </span>
              <Badge variant="outline" className="font-mono">
                {taxaEfetiva.toFixed(2)}% a.m.
              </Badge>
            </Label>
            <Slider
              value={[taxaEfetiva]}
              onValueChange={([v]) => setTaxaCustom(v)}
              min={1.0}
              max={3.0}
              step={0.05}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1.00%</span>
              <span className="text-center">Taxa padrão: {bancoInfo?.taxaBase}%</span>
              <span>3.00%</span>
            </div>
          </div>

          {/* Results */}
          {simulation && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* Troco - Highlighted */}
              <Card className="col-span-2 p-4 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 border-emerald-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Troco Estimado</p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {formatCurrency(simulation.troco)}
                    </p>
                  </div>
                  {simulation.troco > 0 && (
                    <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30">
                      💰 Disponível
                    </Badge>
                  )}
                </div>
              </Card>

              {/* Nova Parcela */}
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">Nova Parcela</p>
                <p className="text-lg font-bold text-primary">
                  {formatCurrency(simulation.novaParcela)}
                </p>
                {totals.parcelaTotal > 0 && simulation.novaParcela < totals.parcelaTotal && (
                  <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
                    <TrendingDown className="w-3 h-3" />
                    -{formatCurrency(totals.parcelaTotal - simulation.novaParcela)}
                  </div>
                )}
              </Card>

              {/* Economia */}
              <Card className="p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {simulation.economiaTotal >= 0 ? 'Economia Total' : 'Custo Adicional'}
                </p>
                <p className={cn(
                  "text-lg font-bold",
                  simulation.economiaTotal >= 0 ? "text-green-600" : "text-orange-600"
                )}>
                  {formatCurrency(Math.abs(simulation.economiaTotal))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  em {prazo} meses
                </p>
              </Card>
            </div>
          )}

          {/* Actions */}
          {simulation && onGeneratePDF && (
            <Button 
              onClick={handleGeneratePDF} 
              className="w-full gap-2"
              disabled={selectedContracts.length === 0}
            >
              <Download className="w-4 h-4" />
              Gerar Proposta com Troco
            </Button>
          )}

          {selectedContracts.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Selecione contratos acima para calcular o troco</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
