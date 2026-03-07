import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  CalendarIcon,
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
import { formatCurrency, calculateInstallments, calcSaldoDevedor } from '../utils';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, differenceInDays, addDays, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
const CARTAO_TAXA = 2.55;
const CARTAO_SAQUE_PERCENT = 0.70;

// ─── Financial Functions ────────────────────────────────────────────────

/** Convert monthly rate to equivalent daily rate */
function getTaxaDiaria(taxaMensalPct: number): number {
  return Math.pow(1 + taxaMensalPct / 100, 1 / 30) - 1;
}

/** PMT = PV × [r(1+r)^n] / [(1+r)^n - 1] */
function calcPMT(pv: number, ratePct: number, n: number): number {
  const r = ratePct / 100;
  if (r === 0) return pv / n;
  const factor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return pv * factor;
}

/** PV with daily coefficient for first period (fractional first installment) */
function calcPVDiario(pmt: number, taxaMensalPct: number, n: number, diasPrimeiraParcela: number): number {
  const im = taxaMensalPct / 100;
  if (im === 0) return pmt * n;
  const id = getTaxaDiaria(taxaMensalPct);
  const fatorPrimeiro = Math.pow(1 + id, diasPrimeiraParcela);
  // First installment discounted by daily factor, remaining by monthly Price
  const pvRestante = pmt * (1 - Math.pow(1 + im, -(n - 1))) / im;
  return (pmt + pvRestante) / fatorPrimeiro;
}

/** PMT from PV using daily coefficient for first period */
function calcPMTDiario(pv: number, taxaMensalPct: number, n: number, diasPrimeiraParcela: number): number {
  const im = taxaMensalPct / 100;
  if (im === 0) return pv / n;
  const id = getTaxaDiaria(taxaMensalPct);
  const fatorPrimeiro = Math.pow(1 + id, diasPrimeiraParcela);
  const pvFactor = (1 + (1 - Math.pow(1 + im, -(n - 1))) / im) / fatorPrimeiro;
  return pv / pvFactor;
}

/** IOF federal: 0.38% fixed + 0.0082%/day (capped at 365 days) */
function calcIOFFederal(valorFinanciado: number, prazoMeses: number): number {
  const iofFixo = valorFinanciado * 0.0038;
  const dias = Math.min(prazoMeses * 30, 365);
  const iofDiario = valorFinanciado * 0.000082 * dias;
  return iofFixo + iofDiario;
}

/** CET mensal via bisection: find rate r where PV(pmt, r, n) = valorLiberado */
function calcCETMensal(valorLiberado: number, pmt: number, n: number): number {
  if (valorLiberado <= 0 || pmt <= 0 || n <= 0) return 0;
  let lo = 0.0001, hi = 0.15; // 0.01% to 15% monthly
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const pv = pmt * (1 - Math.pow(1 + mid, -n)) / mid;
    if (pv > valorLiberado) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// ─── Interfaces ─────────────────────────────────────────────────────────

interface RateResult {
  taxa: number;
  novaParcela: number;
  valorContrato: number;
  iof: number;
  valorLiberado: number;
  trocoBruto: number;
  trocoLiquido: number;
  cetMensal: number;
  cetAnual: number;
  totalOperacao: number;
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

  // Date fields for daily coefficient
  const [dataContratacao, setDataContratacao] = useState<Date>(new Date());
  const [primeiroVencimento, setPrimeiroVencimento] = useState<Date>(addDays(new Date(), 30));

  const diasAtePrimeiraParcela = useMemo(
    () => Math.max(1, differenceInDays(primeiroVencimento, dataContratacao)),
    [dataContratacao, primeiroVencimento]
  );

  const ultimoVencimento = useMemo(
    () => addMonths(primeiroVencimento, prazo - 1),
    [primeiroVencimento, prazo]
  );

  const prazos = (operationType === 'portabilidade' || operationType === 'refinanciamento') 
    ? PRAZOS_PORT_REFIN 
    : PRAZOS_MARGEM_CARTAO;

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
      saldoTotal: selected.reduce((sum, c) => {
        const inst = calculateInstallments(c.data_averbacao, c.prazo);
        const sd = calcSaldoDevedor(c.vl_parcela, c.taxa, inst.restantes);
        return sum + (sd !== null ? sd : (c.saldo || 0));
      }, 0),
      parcelaTotal: selected.reduce((sum, c) => sum + (c.vl_parcela || 0), 0),
      qtdContratos: selected.length,
    };
  }, [contracts, selectedContracts]);

  // Port/Refin results with daily coefficient + federal IOF
  const rateResults = useMemo<RateResult[]>(() => {
    if ((operationType !== 'portabilidade' && operationType !== 'refinanciamento') || 
        selectedContracts.length === 0 || totals.saldoTotal <= 0) return [];

    return allRates.map(taxa => {
      const saldo = totals.saldoTotal;
      
      if (operationType === 'portabilidade') {
        // Portabilidade: preserve current installment, lower rate = higher PV = troco
        const novaParcela = totals.parcelaTotal;
        const valorContrato = calcPVDiario(novaParcela, taxa, prazo, diasAtePrimeiraParcela);
        const iof = calcIOFFederal(valorContrato, prazo);
        const valorLiberado = valorContrato - iof;
        const trocoBruto = valorContrato - saldo - iof;
        const totalOperacao = novaParcela * prazo;
        const cetM = calcCETMensal(valorLiberado, novaParcela, prazo);
        const cetA = Math.pow(1 + cetM, 12) - 1;
        return { taxa, novaParcela, valorContrato, iof, valorLiberado, trocoBruto, trocoLiquido: trocoBruto, cetMensal: cetM * 100, cetAnual: cetA * 100, totalOperacao };
      } else {
        // Refinanciamento: recalculate installment from balance using daily coefficient
        const novaParcela = calcPMTDiario(saldo, taxa, prazo, diasAtePrimeiraParcela);
        const valorContrato = calcPVDiario(novaParcela, taxa, prazo, diasAtePrimeiraParcela);
        const iof = calcIOFFederal(valorContrato, prazo);
        const valorLiberado = valorContrato - iof;
        const trocoBruto = valorContrato - saldo - iof;
        const totalOperacao = novaParcela * prazo;
        const cetM = calcCETMensal(valorLiberado, novaParcela, prazo);
        const cetA = Math.pow(1 + cetM, 12) - 1;
        return { taxa, novaParcela, valorContrato, iof, valorLiberado, trocoBruto, trocoLiquido: trocoBruto, cetMensal: cetM * 100, cetAnual: cetA * 100, totalOperacao };
      }
    });
  }, [allRates, prazo, selectedContracts, totals, operationType, diasAtePrimeiraParcela]);

  // Novo empréstimo results with daily coefficient + federal IOF
  const novoEmprestimoResults = useMemo<RateResult[]>(() => {
    if (operationType !== 'novo_emprestimo' || !margemLivre || margemLivre <= 0) return [];

    return allRates.map(taxa => {
      const novaParcela = margemLivre;
      const valorContrato = calcPVDiario(novaParcela, taxa, prazo, diasAtePrimeiraParcela);
      const iof = calcIOFFederal(valorContrato, prazo);
      const valorLiberado = valorContrato - iof;
      const totalOperacao = novaParcela * prazo;
      const cetM = calcCETMensal(valorLiberado, novaParcela, prazo);
      const cetA = Math.pow(1 + cetM, 12) - 1;
      return { 
        taxa, novaParcela, valorContrato, iof, valorLiberado,
        trocoBruto: valorLiberado, trocoLiquido: valorLiberado,
        cetMensal: cetM * 100, cetAnual: cetA * 100, totalOperacao
      };
    });
  }, [allRates, prazo, margemLivre, operationType, diasAtePrimeiraParcela]);

  // Cartão results (kept with fixed IOF for cards as per original spec)
  const cartaoResults = useMemo<CardResult[]>(() => {
    if (operationType !== 'cartao') return [];
    const results: CardResult[] = [];
    
    const calcCard = (tipo: 'RMC' | 'RCC', margem: number | null) => {
      if (!margem || margem <= 0) return;
      const r = CARTAO_TAXA / 100;

      prazos.forEach(p => {
        const limitP = r === 0
          ? margem * p
          : margem * (Math.pow(1 + r, p) - 1) / (r * Math.pow(1 + r, p));
        const iofP = calcIOFFederal(limitP, p);
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
            <>
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

              {/* Date pickers for daily coefficient */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Data da Contratação</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dataContratacao, "dd/MM/yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={dataContratacao}
                        onSelect={(d) => d && setDataContratacao(d)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Primeiro Vencimento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(primeiroVencimento, "dd/MM/yyyy", { locale: ptBR })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={primeiroVencimento}
                        onSelect={(d) => d && setPrimeiroVencimento(d)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
                <span>Dias até 1ª parcela: <strong className="text-foreground">{diasAtePrimeiraParcela} dias</strong></span>
                <span>Último vencimento: <strong className="text-foreground">{format(ultimoVencimento, "dd/MM/yyyy", { locale: ptBR })}</strong></span>
              </div>
            </>
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
          <div className="rounded-xl border overflow-hidden">
              {/* Summary bar */}
              <div className="px-4 py-3 bg-muted/40 border-b flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                <span>Saldo devedor: <strong className="text-foreground">{formatCurrency(totals.saldoTotal)}</strong></span>
                <span>Parcela atual: <strong className="text-foreground">{formatCurrency(totals.parcelaTotal)}</strong></span>
                <span>Prazo: <strong className="text-foreground">{prazo}x</strong></span>
                {operationType === 'portabilidade' && (
                  <Badge variant="outline" className="text-xs">Parcela preservada</Badge>
                )}
              </div>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs font-semibold">Taxa a.m.</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Parcela</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Vl. Financiado</TableHead>
                    <TableHead className="text-xs font-semibold text-right">IOF</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Vl. Liberado</TableHead>
                    <TableHead className="text-xs font-semibold text-right">💰 Troco</TableHead>
                    <TableHead className="text-xs font-semibold text-right">CET a.m.</TableHead>
                    <TableHead className="text-xs font-semibold text-right">CET a.a.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rateResults.map((r) => (
                    <TableRow key={r.taxa} className="hover:bg-muted/20">
                      <TableCell className="font-mono font-semibold text-sm">{r.taxa.toFixed(2)}%</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(r.novaParcela)}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(r.valorContrato)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(r.iof)}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(r.valorLiberado)}</TableCell>
                      <TableCell className={cn(
                        "text-right font-bold text-sm",
                        r.trocoLiquido >= 0 
                          ? "text-emerald-600" 
                          : "text-destructive"
                      )}>
                        <span className={cn(
                          "inline-block px-2 py-0.5 rounded-md",
                          r.trocoLiquido >= 0 
                            ? "bg-emerald-50 dark:bg-emerald-950/30" 
                            : "bg-destructive/10"
                        )}>
                          {formatCurrency(r.trocoLiquido)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{r.cetMensal.toFixed(2)}%</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">{r.cetAnual.toFixed(2)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </div>
          )}

          {/* RESULTS: Novo Empréstimo */}
          {operationType === 'novo_emprestimo' && (
            <>
              {margemLivre && margemLivre > 0 ? (
                <div className="rounded-xl border overflow-hidden">
                  <div className="px-4 py-2 bg-muted/30 text-sm border-b">
                    Margem livre disponível: <strong className="text-emerald-600">{formatCurrency(margemLivre)}</strong> /mês
                  </div>
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs font-semibold">Taxa a.m.</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Parcela</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Vl. Financiado</TableHead>
                        <TableHead className="text-xs font-semibold text-right">IOF</TableHead>
                        <TableHead className="text-xs font-semibold text-right">💰 Liberado</TableHead>
                        <TableHead className="text-xs font-semibold text-right">CET a.m.</TableHead>
                        <TableHead className="text-xs font-semibold text-right">CET a.a.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {novoEmprestimoResults.map((r) => (
                        <TableRow key={r.taxa} className="hover:bg-muted/20">
                          <TableCell className="font-mono font-semibold text-sm">{r.taxa.toFixed(2)}%</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(r.novaParcela)}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(r.valorContrato)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(r.iof)}</TableCell>
                          <TableCell className="text-right font-bold text-sm">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
                              {formatCurrency(r.valorLiberado)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{r.cetMensal.toFixed(2)}%</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{r.cetAnual.toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
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
                <div className="rounded-xl border overflow-hidden">
                  <div className="px-4 py-2 bg-muted/30 text-sm border-b">
                    Taxa fixa: <strong>2,55% a.m.</strong> • Saque = (Limite - IOF) × 70%
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs font-semibold">Tipo</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Prazo</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Parcela</TableHead>
                        <TableHead className="text-xs font-semibold text-right">Limite</TableHead>
                        <TableHead className="text-xs font-semibold text-right">IOF</TableHead>
                        <TableHead className="text-xs font-semibold text-right">💰 Saque (70%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartaoResults.map((r, i) => (
                        <TableRow key={i} className="hover:bg-muted/20">
                          <TableCell className="font-semibold text-sm">
                            <Badge variant={r.tipo === 'RMC' ? 'default' : 'secondary'}>{r.tipo}</Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">{r.prazo}x</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(r.parcela)}</TableCell>
                          <TableCell className="text-right text-sm">{formatCurrency(r.limite)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{formatCurrency(r.iof)}</TableCell>
                          <TableCell className="text-right font-bold text-sm">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600">
                              {formatCurrency(r.saque)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem margem de cartão disponível (RMC/RCC)</p>
                </div>
              )}
            </>
          )}

          {/* Cartões info */}
          {operationType === 'cartao' && cartaoResults.length > 0 && (
            <div className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
              ℹ️ Cliente pode ter no máximo 1 RMC e 1 RCC
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
