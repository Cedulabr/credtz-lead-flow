import React, { useState, useMemo, useEffect } from 'react';
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
  X,
  Settings,
  ArrowRightLeft,
  RefreshCw
} from 'lucide-react';
import { BaseOffContract } from '../types';
import { formatCurrency } from '../utils';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  operationType?: 'portabilidade' | 'refinanciamento';
}

interface TrocoCalculatorProps {
  contracts: BaseOffContract[];
  selectedContracts: string[];
  onSelectionChange: (ids: string[]) => void;
  onSimulationChange?: (simulation: TrocoSimulation | null) => void;
  onGeneratePDF?: (simulation: TrocoSimulation) => void;
  compact?: boolean;
}

interface BankRate {
  id: string;
  bank_name: string;
  bank_code: string | null;
  default_rate: number;
  is_active: boolean;
}

const FALLBACK_BANKS: BankRate[] = [
  { id: 'fb-1', bank_name: 'BRB', bank_code: 'BRB', default_rate: 1.80, is_active: true },
  { id: 'fb-2', bank_name: 'Finanto', bank_code: 'FINANTO', default_rate: 1.75, is_active: true },
  { id: 'fb-3', bank_name: 'Pic Pay', bank_code: 'PICPAY', default_rate: 1.70, is_active: true },
  { id: 'fb-4', bank_name: 'Digio', bank_code: 'DIGIO', default_rate: 1.65, is_active: true },
];

const PRAZOS = [12, 24, 36, 48, 60, 72, 84, 96];
const DEFAULT_RATES = [1.85, 1.80, 1.75]; // Only show 3 highest by default
const IOF_PERCENT = 0.03;
const PORTABILIDADE_SAQUE_PERCENT = 0.70;

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
  trocoBruto: number;
  trocoLiquido: number;
}

export function TrocoCalculator({ 
  contracts, 
  selectedContracts, 
  onSelectionChange,
  onSimulationChange,
  onGeneratePDF,
  compact = false
}: TrocoCalculatorProps) {
  const [banks, setBanks] = useState<BankRate[]>(FALLBACK_BANKS);
  const [banco, setBanco] = useState('BRB');
  const [prazo, setPrazo] = useState(84);
  const [operationType, setOperationType] = useState<'portabilidade' | 'refinanciamento'>('portabilidade');
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [customRates, setCustomRates] = useState<number[]>([]);
  const [newRate, setNewRate] = useState('');
  const [showBankManager, setShowBankManager] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankRate, setNewBankRate] = useState('');

  // Fetch bank rates from Supabase
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const { data, error } = await supabase
          .from('baseoff_bank_rates')
          .select('*')
          .eq('is_active', true)
          .order('bank_name');
        
        if (!error && data && data.length > 0) {
          setBanks(data.map(d => ({
            id: d.id,
            bank_name: d.bank_name,
            bank_code: d.bank_code,
            default_rate: Number(d.default_rate),
            is_active: d.is_active ?? true,
          })));
          if (!data.find(d => d.bank_name === banco)) {
            setBanco(data[0].bank_name);
          }
        }
      } catch (e) {
        console.error('Error fetching bank rates:', e);
      }
    };
    fetchBanks();
  }, []);

  const bancoInfo = banks.find(b => b.bank_name === banco);
  const allRates = [...DEFAULT_RATES, ...customRates];

  const totals = useMemo(() => {
    const selected = contracts.filter(c => selectedContracts.includes(c.id));
    return {
      saldoTotal: selected.reduce((sum, c) => sum + (c.saldo || 0), 0),
      parcelaTotal: selected.reduce((sum, c) => sum + (c.vl_parcela || 0), 0),
      qtdContratos: selected.length,
    };
  }, [contracts, selectedContracts]);

  const rateResults = useMemo<RateResult[]>(() => {
    if (selectedContracts.length === 0 || totals.saldoTotal <= 0) return [];

    return allRates.map(taxa => {
      const saldo = totals.saldoTotal;
      const novaParcela = calcPMT(saldo, taxa, prazo);
      const valorContrato = novaParcela * prazo;
      const iof = saldo * IOF_PERCENT;
      const trocoBruto = Math.max(0, valorContrato - saldo - iof);
      
      // Portabilidade: client can only withdraw 70%
      const trocoLiquido = operationType === 'portabilidade' 
        ? trocoBruto * PORTABILIDADE_SAQUE_PERCENT 
        : trocoBruto;

      return { taxa, novaParcela, valorContrato, iof, trocoBruto, trocoLiquido };
    });
  }, [allRates, prazo, selectedContracts, totals, operationType]);

  const bestSimulation = useMemo<TrocoSimulation | null>(() => {
    if (rateResults.length === 0) return null;
    const best = rateResults.reduce((a, b) => a.trocoLiquido > b.trocoLiquido ? a : b);
    return {
      banco: bancoInfo?.bank_name || banco,
      bancoLabel: bancoInfo?.bank_name || banco,
      taxa: best.taxa,
      prazo,
      saldoDevedor: totals.saldoTotal,
      novaParcela: best.novaParcela,
      troco: best.trocoLiquido,
      economiaTotal: (totals.parcelaTotal - best.novaParcela) * prazo,
      selectedContracts,
      operationType,
    };
  }, [rateResults, banco, bancoInfo, prazo, totals, selectedContracts, operationType]);

  useEffect(() => {
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

  const handleAddBank = async () => {
    const rate = parseFloat(newBankRate.replace(',', '.'));
    if (!newBankName.trim() || isNaN(rate) || rate <= 0) {
      toast.error('Preencha nome e taxa válida');
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('baseoff_bank_rates')
        .insert({ bank_name: newBankName.trim(), bank_code: newBankName.trim().toUpperCase(), default_rate: rate })
        .select()
        .single();
      
      if (error) throw error;
      
      setBanks(prev => [...prev, {
        id: data.id,
        bank_name: data.bank_name,
        bank_code: data.bank_code,
        default_rate: Number(data.default_rate),
        is_active: true,
      }]);
      setNewBankName('');
      setNewBankRate('');
      toast.success(`Banco ${data.bank_name} adicionado!`);
    } catch (e) {
      toast.error('Erro ao adicionar banco');
    }
  };

  const handleRemoveBank = async (bankId: string) => {
    try {
      await supabase.from('baseoff_bank_rates').update({ is_active: false }).eq('id', bankId);
      setBanks(prev => prev.filter(b => b.id !== bankId));
      toast.success('Banco removido');
    } catch (e) {
      toast.error('Erro ao remover banco');
    }
  };

  if (contracts.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 bg-muted/30 border-b cursor-pointer flex items-center justify-between"
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
          {/* Operation Type */}
          <div className="flex gap-2">
            <Button
              variant={operationType === 'portabilidade' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOperationType('portabilidade')}
              className="gap-2 flex-1"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Portabilidade com Troco
            </Button>
            <Button
              variant={operationType === 'refinanciamento' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setOperationType('refinanciamento')}
              className="gap-2 flex-1"
            >
              <RefreshCw className="w-4 h-4" />
              Refinanciamento
            </Button>
          </div>

          {operationType === 'portabilidade' && (
            <div className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              ⚠️ Portabilidade: IOF de ~3% é descontado e o cliente pode sacar apenas <strong>70%</strong> do troco líquido (Lei do Banco Central).
            </div>
          )}

          {/* Parameters */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Banco
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs gap-1"
                  onClick={(e) => { e.stopPropagation(); setShowBankManager(!showBankManager); }}
                >
                  <Settings className="w-3 h-3" />
                  Gerenciar
                </Button>
              </div>
              <Select value={banco} onValueChange={setBanco}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {banks.map(b => (
                    <SelectItem key={b.id} value={b.bank_name}>
                      {b.bank_name} ({b.default_rate.toFixed(2)}% a.m.)
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

          {/* Bank Manager */}
          {showBankManager && (
            <Card className="p-3 space-y-3 border-dashed">
              <p className="text-sm font-semibold">Gerenciar Bancos</p>
              <div className="flex flex-wrap gap-2">
                {banks.map(b => (
                  <Badge key={b.id} variant="secondary" className="gap-1 pr-1">
                    {b.bank_name} ({b.default_rate.toFixed(2)}%)
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 hover:bg-destructive/20"
                      onClick={() => handleRemoveBank(b.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do banco"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Taxa %"
                  value={newBankRate}
                  onChange={(e) => setNewBankRate(e.target.value)}
                  className="h-8 text-sm w-24"
                />
                <Button variant="outline" size="sm" onClick={handleAddBank} className="h-8 gap-1">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          )}

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
                    <TableHead className="text-xs font-semibold text-right">Troco Bruto</TableHead>
                    {operationType === 'portabilidade' && (
                      <TableHead className="text-xs font-semibold text-right">Líquido (70%)</TableHead>
                    )}
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
                      <TableCell className="text-right text-sm">
                        {formatCurrency(r.trocoBruto)}
                      </TableCell>
                      {operationType === 'portabilidade' && (
                        <TableCell className="text-right font-bold text-sm text-emerald-600">
                          {formatCurrency(r.trocoLiquido)}
                        </TableCell>
                      )}
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
