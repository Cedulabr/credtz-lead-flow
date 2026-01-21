import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calculator, 
  TrendingDown, 
  TrendingUp, 
  Percent,
  Calendar,
  Wallet,
  CreditCard,
  Check,
  ArrowRight
} from 'lucide-react';
import { BaseOffContract, BaseOffClient } from '../types';
import { formatCurrency } from '../utils';
import { cn } from '@/lib/utils';

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: BaseOffClient;
  contract: BaseOffContract;
  onConfirm?: (simulation: SimulationResult) => void;
}

interface SimulationResult {
  novaTaxa: number;
  novoPrazo: number;
  novaParcela: number;
  valorLiberado: number;
  economiaTotal: number;
  saldoDevedor: number;
  banco: string;
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
];

const PRAZOS = [12, 24, 36, 48, 60, 72, 84, 96];

export function SimulationModal({ 
  isOpen, 
  onClose, 
  client, 
  contract, 
  onConfirm 
}: SimulationModalProps) {
  const [bancoSelecionado, setBancoSelecionado] = useState(BANCOS_SIMULACAO[0].value);
  const [novoPrazo, setNovoPrazo] = useState(contract.prazo || 84);
  const [taxaPersonalizada, setTaxaPersonalizada] = useState<number | null>(null);

  const bancoInfo = BANCOS_SIMULACAO.find(b => b.value === bancoSelecionado);
  const taxaAtual = contract.taxa || 2.5;
  const saldoDevedor = contract.saldo || (contract.vl_emprestimo || 0) * 0.8;
  const parcelaAtual = contract.vl_parcela || 0;

  const simulacao = useMemo<SimulationResult>(() => {
    const taxaNova = taxaPersonalizada || (bancoInfo?.taxaBase || 1.80);
    
    // Cálculo de refinanciamento
    // PMT = PV * [r(1+r)^n] / [(1+r)^n - 1]
    const taxaMensal = taxaNova / 100;
    const n = novoPrazo;
    
    // Valor a ser financiado (saldo devedor + custos)
    const valorFinanciado = saldoDevedor;
    
    // Calcular nova parcela
    const fator = (taxaMensal * Math.pow(1 + taxaMensal, n)) / (Math.pow(1 + taxaMensal, n) - 1);
    const novaParcela = valorFinanciado * fator;
    
    // Valor liberado (diferença entre novo empréstimo e quitação)
    // Para refinanciamento, geralmente libera-se um troco
    const valorTotalNovo = novaParcela * n;
    const valorLiberado = Math.max(0, (valorTotalNovo * 0.15) - (saldoDevedor * 0.05));
    
    // Economia total comparando parcelas
    const totalAtual = parcelaAtual * (contract.prazo || 84);
    const economiaTotal = totalAtual - valorTotalNovo;

    return {
      novaTaxa: taxaNova,
      novoPrazo: n,
      novaParcela,
      valorLiberado,
      economiaTotal,
      saldoDevedor,
      banco: bancoSelecionado,
    };
  }, [bancoSelecionado, novoPrazo, taxaPersonalizada, saldoDevedor, parcelaAtual, contract.prazo, bancoInfo]);

  const handleConfirm = () => {
    onConfirm?.(simulacao);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Simulador de Refinanciamento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Contract Info */}
          <Card className="p-4 bg-muted/50">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Contrato Atual
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Banco</p>
                <p className="font-bold">{contract.banco_emprestimo || 'N/I'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Parcela</p>
                <p className="font-bold">{formatCurrency(parcelaAtual)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Taxa Atual</p>
                <p className="font-bold">{taxaAtual.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-muted-foreground">Saldo Devedor</p>
                <p className="font-bold">{formatCurrency(saldoDevedor)}</p>
              </div>
            </div>
          </Card>

          {/* Simulation Parameters */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Banco para Refinanciamento</Label>
              <Select value={bancoSelecionado} onValueChange={setBancoSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BANCOS_SIMULACAO.map(banco => (
                    <SelectItem key={banco.value} value={banco.value}>
                      {banco.label} ({banco.taxaBase}% a.m.)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Novo Prazo (meses)</Label>
              <Select value={String(novoPrazo)} onValueChange={(v) => setNovoPrazo(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRAZOS.map(prazo => (
                    <SelectItem key={prazo} value={String(prazo)}>
                      {prazo} meses
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center justify-between">
              <span>Taxa Personalizada (% a.m.)</span>
              <span className="text-sm text-muted-foreground">
                {taxaPersonalizada ? `${taxaPersonalizada.toFixed(2)}%` : 'Usando taxa do banco'}
              </span>
            </Label>
            <Slider
              value={[taxaPersonalizada || bancoInfo?.taxaBase || 1.80]}
              onValueChange={([v]) => setTaxaPersonalizada(v)}
              min={1.0}
              max={3.0}
              step={0.05}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1.00%</span>
              <span>3.00%</span>
            </div>
          </div>

          {/* Simulation Results */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Nova Parcela</span>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(simulacao.novaParcela)}
              </p>
              <div className="flex items-center gap-1 mt-1 text-sm">
                {simulacao.novaParcela < parcelaAtual ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">
                      -{formatCurrency(parcelaAtual - simulacao.novaParcela)}
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 text-orange-500" />
                    <span className="text-orange-600">
                      +{formatCurrency(simulacao.novaParcela - parcelaAtual)}
                    </span>
                  </>
                )}
              </div>
            </Card>

            <Card className="p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-5 h-5 text-green-600" />
                <span className="text-sm text-muted-foreground">Valor Liberado</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(simulacao.valorLiberado)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Troco disponível</p>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Nova Taxa</span>
              </div>
              <p className="text-2xl font-bold">
                {simulacao.novaTaxa.toFixed(2)}%
              </p>
              <Badge 
                variant="outline" 
                className={cn(
                  "mt-1",
                  simulacao.novaTaxa < taxaAtual ? "text-green-600 border-green-600" : "text-orange-600 border-orange-600"
                )}
              >
                {simulacao.novaTaxa < taxaAtual 
                  ? `↓ ${(taxaAtual - simulacao.novaTaxa).toFixed(2)}%` 
                  : `↑ ${(simulacao.novaTaxa - taxaAtual).toFixed(2)}%`
                }
              </Badge>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Novo Prazo</span>
              </div>
              <p className="text-2xl font-bold">
                {simulacao.novoPrazo} meses
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.floor(simulacao.novoPrazo / 12)} anos e {simulacao.novoPrazo % 12} meses
              </p>
            </Card>
          </div>

          {/* Summary */}
          <Card className="p-4 bg-muted/50 border-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <ArrowRight className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Resumo da Simulação</p>
                <p className="text-sm text-muted-foreground">
                  Refinanciamento de {formatCurrency(simulacao.saldoDevedor)} em {simulacao.novoPrazo}x 
                  de {formatCurrency(simulacao.novaParcela)} no {bancoInfo?.label}
                </p>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleConfirm} className="flex-1 gap-2">
              <Check className="w-4 h-4" />
              Confirmar Simulação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
