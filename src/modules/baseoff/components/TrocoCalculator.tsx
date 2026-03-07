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
  RefreshCw,
  CreditCard,
  Banknote
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
  operationType?: 'portabilidade' | 'refinanciamento' | 'novo_emprestimo' | 'cartao';
}

type OperationType = 'portabilidade' | 'refinanciamento' | 'novo_emprestimo' | 'cartao';

interface TrocoCalculatorProps {
  contracts: BaseOffContract[];
  selectedContracts: string[];
  onSelectionChange: (ids: string[]) => void;
  onSimulationChange?: (simulation: TrocoSimulation | null) => void;
  onGeneratePDF?: (simulation: TrocoSimulation) => void;
  compact?: boolean;
  margemLivre?: number | null;
  rmcDisponivel?: number | null;
  rccDisponivel?: number | null;
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

const PRAZOS_PORT_REFIN = [96, 84];
const PRAZOS_MARGEM_CARTAO = [96, 84, 72];
const DEFAULT_RATES = [1.85, 1.80, 1.75];
const IOF_PERCENT = 0.03;
const CARTAO_TAXA = 2.55;
const CARTAO_SAQUE_PERCENT = 0.70;

function calcPMT(pv: number, ratePct: number, n: number): number {
  const r = ratePct / 100;
  if (r === 0) return pv / n;
  const factor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return pv * factor;
}

// Price System: Calculate Present Value (financed amount) from installment
function calcPV(pmt: number, ratePct: number, n: number): number {
  const r = ratePct / 100;
  if (r === 0) return pmt * n;
  return pmt * (1 - Math.pow(1 + r, -n)) / r;
}

interface RateResult {
  taxa: number;
  novaParcela: number;
  valorContrato: number;
  iof: number;
  trocoBruto: number;
  trocoLiquido: number;
}

interface CardResult {
  tipo: 'RMC' | 'RCC';
  prazo: number;
  margem: number;
  parcela: number;
  limite: number;
  iof: number;
  saque: number;
}

const OP_LABELS: Record<OperationType, { label: string; icon: React.ElementType; description: string }> = {
  portabilidade: { label: 'Portabilidade', icon: ArrowRightLeft, description: 'Transferir contrato com troco (IOF descontado)' },
  refinanciamento: { label: 'Refinanciamento', icon: RefreshCw, description: 'Refinanciar contratos (IOF descontado)' },
  novo_emprestimo: { label: 'Novo Empréstimo', icon: Banknote, description: 'Calcular empréstimo pela margem livre' },
  cartao: { label: 'Cartões RMC/RCC', icon: CreditCard, description: 'Calcular saque do cartão (taxa 2,55%, saque 70%)' },
};

export function TrocoCalculator({ 
  contracts, 
  selectedContracts, 
  onSelectionChange,
  onSimulationChange,
  onGeneratePDF,
  compact = false,
  margemLivre = null,
  rmcDisponivel = null,
  rccDisponivel = null,
}: TrocoCalculatorProps) {
  const [banks, setBanks] = useState<BankRate[]>(FALLBACK_BANKS);
  const [banco, setBanco] = useState('BRB');
  const [prazo, setPrazo] = useState(96);
  const [operationType, setOperationType] = useState<OperationType>('portabilidade');
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [customRates, setCustomRates] = useState<number[]>([]);
  const [newRate, setNewRate] = useState('');
  const [showBankManager, setShowBankManager] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankRate, setNewBankRate] = useState('');

  const prazos = (operationType === 'portabilidade' || operationType === 'refinanciamento') 
    ? PRAZOS_PORT_REFIN 
    : PRAZOS_MARGEM_CARTAO;

  // Reset prazo when switching modes if current prazo is not available
  useEffect(() => {
    if (!prazos.includes(prazo)) {
      setPrazo(prazos[0]);
    }
  }, [operationType]);

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

  // Port/Refin results
  const rateResults = useMemo<RateResult[]>(() => {
    if ((operationType !== 'portabilidade' && operationType !== 'refinanciamento') || 
        selectedContracts.length === 0 || totals.saldoTotal <= 0) return [];

    return allRates.map(taxa => {
      const saldo = totals.saldoTotal;
      const novaParcela = calcPMT(saldo, taxa, prazo);
      const valorContrato = calcPV(novaParcela, taxa, prazo);
      const totalPago = novaParcela * prazo;
      const iof = saldo * IOF_PERCENT;
      const trocoBruto = Math.max(0, valorContrato - saldo - iof);
      // Portabilidade and refinanciamento: NO 70% rule, just IOF
      return { taxa, novaParcela, valorContrato, totalPago, iof, trocoBruto, trocoLiquido: trocoBruto };
    });
  }, [allRates, prazo, selectedContracts, totals, operationType]);

  // Novo empréstimo results
  const novoEmprestimoResults = useMemo<RateResult[]>(() => {
    if (operationType !== 'novo_emprestimo' || !margemLivre || margemLivre <= 0) return [];

    return allRates.map(taxa => {
      // PMT = margemLivre, calculate PV (how much can borrow)
      const r = taxa / 100;
      const pv = r === 0 
        ? margemLivre * prazo 
        : margemLivre * (Math.pow(1 + r, prazo) - 1) / (r * Math.pow(1 + r, prazo));
      const totalPago = margemLivre * prazo;
      const iof = pv * IOF_PERCENT;
      const liquido = pv - iof;
      return { 
        taxa, 
        novaParcela: margemLivre, 
        valorContrato: pv, 
        totalPago,
        iof, 
        trocoBruto: liquido, 
        trocoLiquido: liquido 
      };
    });
  }, [allRates, prazo, margemLivre, operationType]);

  // Cartão results
  const cartaoResults = useMemo<CardResult[]>(() => {
    if (operationType !== 'cartao') return [];
    const results: CardResult[] = [];
    
    const calcCard = (tipo: 'RMC' | 'RCC', margem: number | null) => {
      if (!margem || margem <= 0) return;
      // Margem is the installment the client can pay
      // Limit = margem / (taxa/100) using simple card formula
      // For card: parcela = margem, limit = parcela * prazo (simplified)
      // Actually: limit calculated via PMT inverse at 2.55%
      const r = CARTAO_TAXA / 100;
      const limit = r === 0 
        ? margem * prazo 
        : margem * (Math.pow(1 + r, prazo) - 1) / (r * Math.pow(1 + r, prazo));
      const iof = limit * IOF_PERCENT;
      const saque = (limit - iof) * CARTAO_SAQUE_PERCENT;

      prazos.forEach(p => {
        const limitP = r === 0
          ? margem * p
          : margem * (Math.pow(1 + r, p) - 1) / (r * Math.pow(1 + r, p));
        const iofP = limitP * IOF_PERCENT;
        const saqueP = (limitP - iofP) * CARTAO_SAQUE_PERCENT;
        results.push({ tipo, prazo: p, margem, parcela: margem, limite: limitP, iof: iofP, saque: saqueP });
      });
    };

    calcCard('RMC', rmcDisponivel);
    calcCard('RCC', rccDisponivel);
    return results;
  }, [operationType, rmcDisponivel, rccDisponivel, prazos]);

  const bestSimulation = useMemo<TrocoSimulation | null>(() => {
    if (operationType === 'portabilidade' || operationType === 'refinanciamento') {
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
    }
    if (operationType === 'novo_emprestimo' && novoEmprestimoResults.length > 0) {
      const best = novoEmprestimoResults[0];
      return {
        banco: bancoInfo?.bank_name || banco,
        bancoLabel: bancoInfo?.bank_name || banco,
        taxa: best.taxa,
        prazo,
        saldoDevedor: 0,
        novaParcela: best.novaParcela,
        troco: best.trocoLiquido,
        economiaTotal: 0,
        selectedContracts: [],
        operationType,
      };
    }
    if (operationType === 'cartao' && cartaoResults.length > 0) {
      const best = cartaoResults.reduce((a, b) => a.saque > b.saque ? a : b);
      return {
        banco: best.tipo,
        bancoLabel: `Cartão ${best.tipo}`,
        taxa: CARTAO_TAXA,
        prazo: best.prazo,
        saldoDevedor: 0,
        novaParcela: best.parcela,
        troco: best.saque,
        economiaTotal: 0,
        selectedContracts: [],
        operationType,
      };
    }
    return null;
  }, [rateResults, novoEmprestimoResults, cartaoResults, banco, bancoInfo, prazo, totals, selectedContracts, operationType]);

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

  if (contracts.length === 0 && operationType !== 'novo_emprestimo' && operationType !== 'cartao') return null;

  const showContractBasedUI = operationType === 'portabilidade' || operationType === 'refinanciamento';

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
            <h3 className="font-semibold">Simulador de Operações</h3>
            <p className="text-sm text-muted-foreground">
              {OP_LABELS[operationType].description}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Operation Type - 4 modes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(Object.keys(OP_LABELS) as OperationType[]).map(op => {
              const { label, icon: Icon } = OP_LABELS[op];
              return (
                <Button
                  key={op}
                  variant={operationType === op ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setOperationType(op)}
                  className="gap-1.5 text-xs"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Button>
              );
            })}
          </div>

          {/* Parameters for port/refin/novo */}
          {operationType !== 'cartao' && (
            <div className="grid sm:grid-cols-2 gap-4">
              {showContractBasedUI && (
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
              )}

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
                    {prazos.map(p => (
                      <SelectItem key={p} value={String(p)}>
                        {p} meses ({Math.floor(p / 12)} anos)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Bank Manager */}
          {showBankManager && showContractBasedUI && (
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
                <Input placeholder="Nome do banco" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} className="h-8 text-sm" />
                <Input placeholder="Taxa %" value={newBankRate} onChange={(e) => setNewBankRate(e.target.value)} className="h-8 text-sm w-24" />
                <Button variant="outline" size="sm" onClick={handleAddBank} className="h-8 gap-1">
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          )}

          {/* Custom rate - for port/refin/novo */}
          {operationType !== 'cartao' && (
            <>
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
                      <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-destructive/20" onClick={() => handleRemoveRate(rate)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}
            </>
          )}

          {/* RESULTS: Port/Refin */}
          {showContractBasedUI && rateResults.length > 0 && (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs font-semibold">Taxa a.m.</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Nova Parcela</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Vl. Financiado</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Total Pago</TableHead>
                    <TableHead className="text-xs font-semibold text-right">IOF (~3%)</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Troco</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateResults.map((r) => (
                    <TableRow key={r.taxa} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-semibold text-sm">{r.taxa.toFixed(2)}%</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(r.novaParcela)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(r.valorContrato)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(r.totalPago)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(r.iof)}</TableCell>
                      <TableCell className="text-right font-bold text-sm text-emerald-600">{formatCurrency(r.trocoLiquido)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* RESULTS: Novo Empréstimo */}
          {operationType === 'novo_emprestimo' && (
            <>
              {margemLivre && margemLivre > 0 ? (
                <div className="border rounded-lg overflow-auto">
                  <div className="px-3 py-2 bg-muted/30 text-sm">
                    Margem livre disponível: <strong className="text-emerald-600">{formatCurrency(margemLivre)}</strong> /mês
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs font-semibold">Taxa a.m.</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Parcela</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Vl. Financiado</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Total Pago</TableHead>
                        <TableHead className="text-xs font-semibold text-right">IOF (~3%)</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Líquido</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {novoEmprestimoResults.map((r) => (
                        <TableRow key={r.taxa} className="hover:bg-muted/30">
                          <TableCell className="font-mono font-semibold text-sm">{r.taxa.toFixed(2)}%</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(r.novaParcela)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(r.valorContrato)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(r.totalPago)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(r.iof)}</TableCell>
                          <TableCell className="text-right font-bold text-sm text-emerald-600">{formatCurrency(r.trocoLiquido)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Banknote className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem margem livre disponível para novo empréstimo</p>
                </div>
              )}
            </>
          )}

          {/* RESULTS: Cartões */}
          {operationType === 'cartao' && (
            <>
              {cartaoResults.length > 0 ? (
                <div className="border rounded-lg overflow-auto">
                  <div className="px-3 py-2 bg-muted/30 text-sm">
                    Taxa fixa: <strong>2,55% a.m.</strong> • Saque = (Limite - IOF) × 70%
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs font-semibold">Tipo</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Prazo</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Parcela</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Limite</TableHead>
                        <TableHead className="text-xs font-semibold text-right">IOF (~3%)</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Saque (70%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartaoResults.map((r, i) => (
                        <TableRow key={i} className="hover:bg-muted/30">
                          <TableCell className="font-semibold text-sm">
                            <Badge variant={r.tipo === 'RMC' ? 'default' : 'secondary'}>{r.tipo}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{r.prazo}x</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(r.parcela)}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(r.limite)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(r.iof)}</TableCell>
                          <TableCell className="text-right font-bold text-sm text-emerald-600">{formatCurrency(r.saque)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20">
                    ℹ️ Cliente pode ter no máximo 1 RMC e 1 RCC
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem margem de cartão disponível (RMC/RCC)</p>
                </div>
              )}
            </>
          )}

          {/* Summary row */}
          {showContractBasedUI && rateResults.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              <span>Saldo quitado: <strong className="text-foreground">{formatCurrency(totals.saldoTotal)}</strong></span>
              <span>Parcela atual: <strong className="text-foreground">{formatCurrency(totals.parcelaTotal)}</strong></span>
              <span>Prazo: <strong className="text-foreground">{prazo}x</strong></span>
            </div>
          )}

          {/* No contracts selected warning for port/refin */}
          {showContractBasedUI && selectedContracts.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Selecione contratos acima para calcular</p>
            </div>
          )}

          {/* Generate PDF */}
          {bestSimulation && onGeneratePDF && (
            <Button 
              onClick={() => onGeneratePDF(bestSimulation)} 
              className="w-full gap-2"
            >
              <Download className="w-4 h-4" />
              Gerar Proposta
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
