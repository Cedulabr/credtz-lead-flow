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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Banknote,
  Trophy,
  AlertCircle
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
const CARTAO_TAXA = 2.55;
const CARTAO_SAQUE_PERCENT = 0.70;

// ─── Financial Functions ────────────────────────────────────────────────

function getTaxaDiaria(taxaMensalPct: number): number {
  return Math.pow(1 + taxaMensalPct / 100, 1 / 30) - 1;
}

function calcPMT(pv: number, ratePct: number, n: number): number {
  const r = ratePct / 100;
  if (r === 0) return pv / n;
  const factor = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  return pv * factor;
}

function calcPVDiario(pmt: number, taxaMensalPct: number, n: number, diasPrimeiraParcela: number): number {
  const im = taxaMensalPct / 100;
  if (im === 0) return pmt * n;
  const id = getTaxaDiaria(taxaMensalPct);
  const fatorPrimeiro = Math.pow(1 + id, diasPrimeiraParcela);
  const pvRestante = pmt * (1 - Math.pow(1 + im, -(n - 1))) / im;
  return (pmt + pvRestante) / fatorPrimeiro;
}

function calcPMTDiario(pv: number, taxaMensalPct: number, n: number, diasPrimeiraParcela: number): number {
  const im = taxaMensalPct / 100;
  if (im === 0) return pv / n;
  const id = getTaxaDiaria(taxaMensalPct);
  const fatorPrimeiro = Math.pow(1 + id, diasPrimeiraParcela);
  const pvFactor = (1 + (1 - Math.pow(1 + im, -(n - 1))) / im) / fatorPrimeiro;
  return pv / pvFactor;
}

function calcIOFFederal(valorFinanciado: number, prazoMeses: number): number {
  const iofFixo = valorFinanciado * 0.0038;
  const dias = Math.min(prazoMeses * 30, 365);
  const iofDiario = valorFinanciado * 0.000082 * dias;
  return iofFixo + iofDiario;
}

function calcCETMensal(valorLiberado: number, pmt: number, n: number): number {
  if (valorLiberado <= 0 || pmt <= 0 || n <= 0) return 0;
  let lo = 0.0001, hi = 0.15;
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
  bancoNome: string;
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
  portabilidade: { label: 'Portabilidade', icon: ArrowRightLeft, description: 'Transferir contrato com troco' },
  refinanciamento: { label: 'Refinanciamento', icon: RefreshCw, description: 'Refinanciar contratos' },
  novo_emprestimo: { label: 'Novo Empréstimo', icon: Banknote, description: 'Empréstimo pela margem livre' },
  cartao: { label: 'Cartões RMC/RCC', icon: CreditCard, description: 'Saque do cartão' },
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
  const [showBankManager, setShowBankManager] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankRate, setNewBankRate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

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
    if (!prazos.includes(prazo)) setPrazo(prazos[0]);
  }, [operationType]);

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
            id: d.id, bank_name: d.bank_name, bank_code: d.bank_code,
            default_rate: Number(d.default_rate), is_active: d.is_active ?? true,
          })));
          if (!data.find(d => d.bank_name === banco)) setBanco(data[0].bank_name);
        }
      } catch (e) { console.error('Error fetching bank rates:', e); }
    };
    fetchBanks();
  }, []);

  const bancoInfo = banks.find(b => b.bank_name === banco);
  // Use bank rates instead of static DEFAULT_RATES
  const bankRates = banks.map(b => ({ taxa: b.default_rate, nome: b.bank_name }));

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

  const rateResults = useMemo<RateResult[]>(() => {
    if ((operationType !== 'portabilidade' && operationType !== 'refinanciamento') || 
        selectedContracts.length === 0 || totals.saldoTotal <= 0) return [];
    return bankRates.map(({ taxa, nome }) => {
      const saldo = totals.saldoTotal;
      const novaParcela = totals.parcelaTotal;
      const valorContrato = calcPVDiario(novaParcela, taxa, prazo, diasAtePrimeiraParcela);
      const iof = calcIOFFederal(valorContrato, prazo);
      const valorLiberado = valorContrato - iof;
      const trocoBruto = valorContrato - saldo - iof;
      const totalOperacao = novaParcela * prazo;
      const cetM = calcCETMensal(valorLiberado, novaParcela, prazo);
      const cetA = Math.pow(1 + cetM, 12) - 1;
      return { taxa, bancoNome: nome, novaParcela, valorContrato, iof, valorLiberado, trocoBruto, trocoLiquido: trocoBruto, cetMensal: cetM * 100, cetAnual: cetA * 100, totalOperacao };
    });
  }, [bankRates, prazo, selectedContracts, totals, operationType, diasAtePrimeiraParcela]);

  const novoEmprestimoResults = useMemo<RateResult[]>(() => {
    if (operationType !== 'novo_emprestimo' || !margemLivre || margemLivre <= 0) return [];
    return bankRates.map(({ taxa, nome }) => {
      const novaParcela = margemLivre;
      const valorContrato = calcPVDiario(novaParcela, taxa, prazo, diasAtePrimeiraParcela);
      const iof = calcIOFFederal(valorContrato, prazo);
      const valorLiberado = valorContrato - iof;
      const totalOperacao = novaParcela * prazo;
      const cetM = calcCETMensal(valorLiberado, novaParcela, prazo);
      const cetA = Math.pow(1 + cetM, 12) - 1;
      return { taxa, bancoNome: nome, novaParcela, valorContrato, iof, valorLiberado, trocoBruto: valorLiberado, trocoLiquido: valorLiberado, cetMensal: cetM * 100, cetAnual: cetA * 100, totalOperacao };
    });
  }, [bankRates, prazo, margemLivre, operationType, diasAtePrimeiraParcela]);

  const cartaoResults = useMemo<CardResult[]>(() => {
    if (operationType !== 'cartao') return [];
    const results: CardResult[] = [];
    const calcCard = (tipo: 'RMC' | 'RCC', margem: number | null) => {
      if (!margem || margem <= 0) return;
      const r = CARTAO_TAXA / 100;
      prazos.forEach(p => {
        const limitP = r === 0 ? margem * p : margem * (Math.pow(1 + r, p) - 1) / (r * Math.pow(1 + r, p));
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
      // Best = highest viable rate (maximizes vendor commission)
      const viable = rateResults.filter(r => r.trocoLiquido > 0);
      const best = viable.length > 0
        ? viable.reduce((a, b) => a.taxa > b.taxa ? a : b)
        : rateResults.reduce((a, b) => a.trocoLiquido > b.trocoLiquido ? a : b);
      return {
        banco: best.bancoNome, bancoLabel: best.bancoNome,
        taxa: best.taxa, prazo, saldoDevedor: totals.saldoTotal, novaParcela: best.novaParcela,
        troco: best.trocoLiquido, economiaTotal: (totals.parcelaTotal - best.novaParcela) * prazo,
        selectedContracts, operationType,
      };
    }
    if (operationType === 'novo_emprestimo' && novoEmprestimoResults.length > 0) {
      const viable = novoEmprestimoResults.filter(r => r.trocoLiquido > 0);
      const best = viable.length > 0
        ? viable.reduce((a, b) => a.taxa > b.taxa ? a : b)
        : novoEmprestimoResults[0];
      return {
        banco: best.bancoNome, bancoLabel: best.bancoNome,
        taxa: best.taxa, prazo, saldoDevedor: 0, novaParcela: best.novaParcela,
        troco: best.trocoLiquido, economiaTotal: 0, selectedContracts: [], operationType,
      };
    }
    if (operationType === 'cartao' && cartaoResults.length > 0) {
      const best = cartaoResults.reduce((a, b) => a.saque > b.saque ? a : b);
      return {
        banco: best.tipo, bancoLabel: `Cartão ${best.tipo}`,
        taxa: CARTAO_TAXA, prazo: best.prazo, saldoDevedor: 0, novaParcela: best.parcela,
        troco: best.saque, economiaTotal: 0, selectedContracts: [], operationType,
      };
    }
    return null;
  }, [rateResults, novoEmprestimoResults, cartaoResults, banco, bancoInfo, prazo, totals, selectedContracts, operationType]);

  useEffect(() => { onSimulationChange?.(bestSimulation); }, [bestSimulation, onSimulationChange]);

  const handleAddBank = async () => {
    const rate = parseFloat(newBankRate.replace(',', '.'));
    if (!newBankName.trim() || isNaN(rate) || rate <= 0) { toast.error('Preencha nome e taxa válida'); return; }
    try {
      const { data, error } = await supabase
        .from('baseoff_bank_rates')
        .insert({ bank_name: newBankName.trim(), bank_code: newBankName.trim().toUpperCase(), default_rate: rate })
        .select().single();
      if (error) throw error;
      setBanks(prev => [...prev, { id: data.id, bank_name: data.bank_name, bank_code: data.bank_code, default_rate: Number(data.default_rate), is_active: true }]);
      setNewBankName(''); setNewBankRate('');
      toast.success(`Banco ${data.bank_name} adicionado!`);
    } catch (e) { toast.error('Erro ao adicionar banco'); }
  };

  const handleRemoveBank = async (bankId: string) => {
    try {
      await supabase.from('baseoff_bank_rates').update({ is_active: false }).eq('id', bankId);
      setBanks(prev => prev.filter(b => b.id !== bankId));
      toast.success('Banco removido');
    } catch (e) { toast.error('Erro ao remover banco'); }
  };

  if (contracts.length === 0 && operationType !== 'novo_emprestimo' && operationType !== 'cartao') return null;

  const showContractBasedUI = operationType === 'portabilidade' || operationType === 'refinanciamento';
  const currentResults = showContractBasedUI ? rateResults : novoEmprestimoResults;

  // Best result = highest viable rate (for commission)
  const bestResult = currentResults.length > 0 
    ? (() => {
        const viable = currentResults.filter(r => r.trocoLiquido > 0);
        return viable.length > 0
          ? viable.reduce((a, b) => a.taxa > b.taxa ? a : b)
          : currentResults.reduce((a, b) => a.trocoLiquido > b.trocoLiquido ? a : b);
      })()
    : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Calculator className="w-4 h-4" />
          Simulador de Operações
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-4">
          {/* Operation Type */}
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

          {/* Parameters */}
          {operationType !== 'cartao' && (
            <div className="space-y-4">
              {/* ─── Bloco 1: Banco ─── */}
              {showContractBasedUI && (
                <Card className="p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" /> Banco
                    </h4>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"
                      onClick={() => setShowBankManager(!showBankManager)}>
                      <Settings className="w-3 h-3" /> {showBankManager ? 'Fechar' : 'Alterar'}
                    </Button>
                  </div>

                  {!showBankManager ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base truncate">{bancoInfo?.bank_name || banco}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-xs font-mono">
                            {bancoInfo?.default_rate?.toFixed(2) || '0.00'}% a.m.
                          </Badge>
                          <span className="text-xs text-muted-foreground">Taxa padrão</span>
                        </div>
                      </div>
                      <Select value={banco} onValueChange={setBanco}>
                        <SelectTrigger className="w-auto h-8 text-xs border-dashed">
                          <SelectValue placeholder="Trocar" />
                        </SelectTrigger>
                        <SelectContent>
                          {banks.map(b => (
                            <SelectItem key={b.id} value={b.bank_name}>
                              {b.bank_name} ({b.default_rate.toFixed(2)}%)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {banks.map(b => (
                          <Badge key={b.id} variant={b.bank_name === banco ? 'default' : 'secondary'} 
                            className="gap-1 pr-1 cursor-pointer" onClick={() => setBanco(b.bank_name)}>
                            {b.bank_name} ({b.default_rate.toFixed(2)}%)
                            <Button variant="ghost" size="icon" className="h-4 w-4 hover:bg-destructive/20" 
                              onClick={(e) => { e.stopPropagation(); handleRemoveBank(b.id); }}>
                              <X className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input placeholder="Nome do banco" value={newBankName} onChange={(e) => setNewBankName(e.target.value)} className="h-8 text-sm" />
                        <Input placeholder="Taxa %" value={newBankRate} onChange={(e) => setNewBankRate(e.target.value)} className="h-8 text-sm w-24" />
                        <Button variant="outline" size="sm" onClick={handleAddBank} className="h-8 gap-1"><Plus className="w-3 h-3" /> Adicionar</Button>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* ─── Bloco 2: Condições da Operação ─── */}
              <Card className="p-4 shadow-sm">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <Calendar className="w-3.5 h-3.5" /> Condições da Operação
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Prazo */}
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Prazo</p>
                    <Select value={String(prazo)} onValueChange={(v) => setPrazo(Number(v))}>
                      <SelectTrigger className="h-9 border-0 bg-background shadow-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {prazos.map(p => (
                          <SelectItem key={p} value={String(p)}>{p} meses ({Math.floor(p / 12)} anos)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Data Contratação */}
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Contratação</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm border-0 bg-background shadow-sm">
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          {format(dataContratacao, "dd/MM/yyyy", { locale: ptBR })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent mode="single" selected={dataContratacao} onSelect={(d) => d && setDataContratacao(d)} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Primeiro Vencimento */}
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-1.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">1º Vencimento</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal h-9 text-sm border-0 bg-background shadow-sm">
                          <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                          {format(primeiroVencimento, "dd/MM/yyyy", { locale: ptBR })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent mode="single" selected={primeiroVencimento} onSelect={(d) => d && setPrimeiroVencimento(d)} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground mt-3 pt-3 border-t">
                  <span>Dias até 1ª parcela: <strong className="text-foreground">{diasAtePrimeiraParcela} dias</strong></span>
                  <span>Último vencimento: <strong className="text-foreground">{format(ultimoVencimento, "dd/MM/yyyy", { locale: ptBR })}</strong></span>
                </div>
              </Card>
            </div>
          )}

          {/* ═══ BEST OPERATION HIGHLIGHT ═══ */}
          {bestSimulation && bestSimulation.troco > 0 && (
            <Card className="p-5 bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30 border-emerald-200 dark:border-emerald-800 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Melhor operação disponível</p>
                  <p className="text-xs text-muted-foreground">{bestSimulation.bancoLabel} • {bestSimulation.taxa.toFixed(2)}% a.m. • {bestSimulation.prazo}x</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-3xl font-bold text-emerald-600">
                  {formatCurrency(bestSimulation.troco)}
                </span>
              </div>
            </Card>
          )}

          {/* ═══ RESULTS: Port/Refin as Cards ═══ */}
          {showContractBasedUI && rateResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>Saldo: <strong className="text-foreground">{formatCurrency(totals.saldoTotal)}</strong></span>
                <span>Parcela atual: <strong className="text-foreground">{formatCurrency(totals.parcelaTotal)}</strong></span>
                <span>Prazo: <strong className="text-foreground">{prazo}x</strong></span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rateResults.map((r) => (
                  <ResultCard key={r.taxa} result={r} isBest={bestResult?.taxa === r.taxa && r.trocoLiquido > 0} type="troco" />
                ))}
              </div>
            </div>
          )}

          {/* ═══ RESULTS: Novo Empréstimo as Cards ═══ */}
          {operationType === 'novo_emprestimo' && (
            <>
              {margemLivre && margemLivre > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Margem livre: <strong className="text-emerald-600">{formatCurrency(margemLivre)}</strong> /mês
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {novoEmprestimoResults.map((r) => (
                      <ResultCard key={r.taxa} result={r} isBest={false} type="liberado" />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Banknote className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem margem livre disponível</p>
                </div>
              )}
            </>
          )}

          {/* ═══ RESULTS: Cartões as Cards ═══ */}
          {operationType === 'cartao' && (
            <>
              {cartaoResults.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Taxa fixa: <strong>2,55% a.m.</strong> • Saque = (Limite - IOF) × 70%
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {cartaoResults.map((r, i) => (
                      <Card key={i} className="p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant={r.tipo === 'RMC' ? 'default' : 'secondary'}>{r.tipo}</Badge>
                          <span className="text-sm font-medium">{r.prazo}x</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <DataCell label="Parcela" value={formatCurrency(r.parcela)} />
                          <DataCell label="Limite" value={formatCurrency(r.limite)} />
                        </div>
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Saque (70%)</p>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span className="text-xl font-bold text-emerald-600">{formatCurrency(r.saque)}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sem margem de cartão disponível (RMC/RCC)</p>
                </div>
              )}
            </>
          )}

          {/* No contracts selected */}
          {showContractBasedUI && selectedContracts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calculator className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Selecione contratos acima para calcular</p>
            </div>
          )}

          {/* ═══ GERAR PROPOSTA ═══ */}
          {bestSimulation && onGeneratePDF && (
            <Button 
              onClick={() => onGeneratePDF(bestSimulation)} 
              size="lg"
              className="w-full h-14 text-lg font-bold gap-3 bg-primary hover:bg-primary/90 shadow-lg"
            >
              <Download className="w-5 h-5" />
              GERAR PROPOSTA
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Result Card Component ──────────────────────────────────────────────

function ResultCard({ result: r, isBest, type }: { result: RateResult; isBest: boolean; type: 'troco' | 'liberado' }) {
  const mainValue = type === 'troco' ? r.trocoLiquido : r.valorLiberado;
  const isPositive = mainValue >= 0;

  return (
    <Card className={cn(
      "p-4 shadow-sm transition-all",
      isBest && "ring-2 ring-emerald-400 border-emerald-300"
    )}>
      {isBest && (
        <Badge className="mb-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-xs gap-1">
          <Trophy className="w-3 h-3" /> Melhor
        </Badge>
      )}
      
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="text-lg font-bold font-mono">{r.taxa.toFixed(2)}%</span>
          <span className="text-sm text-muted-foreground ml-1">a.m.</span>
        </div>
        <Badge variant="outline" className="text-xs">{r.bancoNome}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <DataCell label="Parcela" value={formatCurrency(r.novaParcela)} />
        <DataCell label="Financiado" value={formatCurrency(r.valorContrato)} />
        <DataCell label="Liberado" value={formatCurrency(r.valorLiberado)} />
        <DataCell label="Prazo" value={`${r.totalOperacao > 0 ? Math.round(r.totalOperacao / r.novaParcela) : 0}x`} />
      </div>

      {/* Main value: Troco or Liberado */}
      <div className="pt-3 border-t">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          {type === 'troco' ? 'Troco ao Cliente' : 'Valor Liberado'}
        </p>
        <div className="flex items-center gap-2">
          <span className={cn(
            "w-3 h-3 rounded-full shrink-0",
            isPositive ? "bg-emerald-500" : "bg-destructive"
          )} />
          <span className={cn(
            "text-2xl font-bold",
            isPositive ? "text-emerald-600" : "text-destructive"
          )}>
            {formatCurrency(mainValue)}
          </span>
        </div>
        {!isPositive && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Operação inviável
          </p>
        )}
      </div>
    </Card>
  );
}

function DataCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
