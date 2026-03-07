import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Calculator, 
  Wallet, 
  Calendar,
  Download,
  ChevronDown,
  ChevronUp,
  Plus,
  X
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
const DEFAULT_RATES = [1.85, 1.80, 1.75, 1.70, 1.65];

// IOF: ~0.38% flat + 0.0082% per day (simplified as ~3% of financed value)
const IOF_PERCENT = 0.03;

function calcPMT(pv: number, ratePct: number, n: number): number {
  const r = ratePct / 100;
  if (r === 0) return pv / n;
  const factor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return pv * factor;
}

interface RateResult {
  taxa: number;
  novaParcela: number;
  valorContrato: number;
  iof: number;
  troco: number;
}

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
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [customRates, setCustomRates] = useState<number[]>([]);
  const [newRate, setNewRate] = useState('');

  const bancoInfo = BANCOS_SIMULACAO.find(b => b.value === banco);
  const allRates = [...DEFAULT_RATES, ...customRates];

  const totals = useMemo(() => {
    const selected = contracts.filter(c => selectedContracts.includes(c.id));
    return {
      saldoTotal: selected.reduce((sum, c) => sum + (c.saldo || 0), 0),
      parcelaTotal: selected.reduce((sum, c) => sum + (c.vl_parcela || 0), 0),
      qtdContratos: selected.length,
    };
  }, [contracts, selectedContracts]);

  // Calculate results for each rate
  const rateResults = useMemo<RateResult[]>(() => {
    if (selectedContracts.length === 0 || totals.saldoTotal <= 0) return [];

    return allRates.map(taxa => {
      const saldo = totals.saldoTotal;
      const novaParcela = calcPMT(saldo, taxa, prazo);
      const valorContrato = novaParcela * prazo;
      const iof = saldo * IOF_PERCENT;
      const troco = Math.max(0, valorContrato - saldo - iof);

      return { taxa, novaParcela, valorContrato, iof, troco };
    });
  }, [allRates, prazo, selectedContracts, totals]);

  // Best simulation for parent notification (highest troco)
  const bestSimulation = useMemo<TrocoSimulation | null>(() => {
    if (rateResults.length === 0) return null;
    const best = rateResults.reduce((a, b) => a.troco > b.troco ? a : b);
    return {
      banco,
      bancoLabel: bancoInfo?.label || banco,
      taxa: best.taxa,
      prazo,
      saldoDevedor: totals.saldoTotal,
      novaParcela: best.novaParcela,
      troco: best.troco,
      economiaTotal: (totals.parcelaTotal - best.novaParcela) * prazo,
      selectedContracts,
    };
  }, [rateResults, banco, bancoInfo, prazo, totals, selectedContracts]);

  React.useEffect(() => {
    onSimulationChange?.(bestSimulation);
  }, [bestSimulation, onSimulationChange]);

  const handleAddRate = () => {
    const rate = parseFloat(newRate.replace(',', '.'));
    if (!isNaN(rate) && rate > 0 && rate < 10 && !allRates.includes(rate)) {
      setCustomRates([...customRates, rate]);
      setNewRate('');
    }
  };

  const handleRemoveRate = (rate: number) => {
    setCustomRates(customRates.filter(r => r !== rate));
  };

  if (contracts.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div 
        className={cn(
          "p-4 bg-muted/30 border-b cursor-pointer flex items-center justify-between"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Simulador de Troco</h3>
            <p className="text-sm text-muted-foreground">
              {selectedContracts.length > 0 
                ? `${selectedContracts.length} contrato(s) • Saldo: ${formatCurrency(totals.saldoTotal)}`
                : 'Selecione contratos para simular'
              }
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Parameters */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Banco
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
                Prazo
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

          {/* Add custom rate */}
          <div className="flex items-end gap-2">
            <div className="space-y-1 flex-1">
              <Label className="text-xs">Adicionar taxa personalizada (%)</Label>
              <Input
                type="text"
                placeholder="Ex: 1.60"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRate()}
                className="h-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleAddRate} className="h-9 gap-1">
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </Button>
          </div>

          {/* Custom rates chips */}
          {customRates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {customRates.map(rate => (
                <Badge key={rate} variant="secondary" className="gap-1 pr-1">
                  {rate.toFixed(2)}%
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 hover:bg-destructive/20"
                    onClick={() => handleRemoveRate(rate)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {/* Results Table */}
          {rateResults.length > 0 ? (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold">Taxa a.m.</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Nova Parcela</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Vl. Contrato</TableHead>
                    <TableHead className="text-xs font-semibold text-right">IOF (~3%)</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Troco (Líquido)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateResults.map((r) => (
                    <TableRow key={r.taxa} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-semibold text-sm">
                        {r.taxa.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(r.novaParcela)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(r.valorContrato)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatCurrency(r.iof)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-emerald-600">
                        {formatCurrency(r.troco)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Selecione contratos acima para calcular o troco</p>
            </div>
          )}

          {/* Summary row */}
          {rateResults.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <span>Saldo quitado: <strong className="text-foreground">{formatCurrency(totals.saldoTotal)}</strong></span>
              <span>Parcela atual: <strong className="text-foreground">{formatCurrency(totals.parcelaTotal)}</strong></span>
              <span>Prazo: <strong className="text-foreground">{prazo}x</strong></span>
            </div>
          )}

          {/* Generate PDF */}
          {bestSimulation && onGeneratePDF && (
            <Button 
              onClick={() => onGeneratePDF(bestSimulation)} 
              className="w-full gap-2"
              disabled={selectedContracts.length === 0}
            >
              <Download className="w-4 h-4" />
              Gerar Proposta com Troco
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
