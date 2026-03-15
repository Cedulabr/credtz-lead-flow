import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Loader2, Send, Calculator, CheckCircle2, AlertCircle,
  ChevronDown, Copy, FileUp, Search, User, FileText, CreditCard, ArrowLeft, ChevronRight
} from 'lucide-react';
import { CompactStepIndicator } from '@/components/ui/form-wizard';
import { useJoinBankAPI } from '@/modules/baseoff/hooks/useJoinBankAPI';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ClientFormData, BankAccountData, INITIAL_CLIENT_DATA,
  OPERATION_TYPES, UF_OPTIONS
} from '../types';

interface DigitacaoFormProps {
  onClose: () => void;
  onSuccess: () => void;
  searchClientByCPF: (cpf: string) => Promise<any>;
}

const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m}-${d}`;
  }
  return dateStr;
};

const STEPS = [
  { id: 'client', title: 'Cliente', icon: User },
  { id: 'simulation', title: 'Simulação', icon: Calculator },
  { id: 'documents', title: 'Docs', icon: FileText },
  { id: 'confirm', title: 'Enviar', icon: Send },
];

export function DigitacaoForm({ onClose, onSuccess, searchClientByCPF }: DigitacaoFormProps) {
  const api = useJoinBankAPI();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdditionalData, setShowAdditionalData] = useState(false);
  const [cpfSearching, setCpfSearching] = useState(false);

  // Step 1
  const [clientData, setClientData] = useState<ClientFormData>({ ...INITIAL_CLIENT_DATA });

  // IN100
  const [in100Loading, setIn100Loading] = useState(false);
  const [in100Result, setIn100Result] = useState<any>(null);

  // Step 2
  const [operationType, setOperationType] = useState(1);
  const [rules, setRules] = useState<any[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [term, setTerm] = useState(84);
  const [rate, setRate] = useState(1.66);
  const [installmentValue, setInstallmentValue] = useState(0);
  const [loanValue, setLoanValue] = useState(0);
  const [hasInsurance, setHasInsurance] = useState(false);
  // Origin contract
  const [originLenderCode, setOriginLenderCode] = useState('');
  const [originContractNumber, setOriginContractNumber] = useState('');
  const [originTerm, setOriginTerm] = useState(84);
  const [originInstallmentsRemaining, setOriginInstallmentsRemaining] = useState(0);
  const [originInstallmentValue, setOriginInstallmentValue] = useState(0);
  const [originDueBalance, setOriginDueBalance] = useState(0);
  // Refin extra
  const [refinTerm, setRefinTerm] = useState(84);
  const [refinRate, setRefinRate] = useState(1.66);
  const [refinInstallmentValue, setRefinInstallmentValue] = useState(0);
  const [calcResult, setCalcResult] = useState<any>(null);

  // Step 3
  const [docFrontFile, setDocFrontFile] = useState<File | null>(null);
  const [docBackFile, setDocBackFile] = useState<File | null>(null);

  // Step 4
  const [bank, setBankData] = useState<BankAccountData>({ bankCode: '', bankBranch: '', bankNumber: '', bankDigit: '' });

  const needsOriginContract = operationType >= 2;
  const isPortRefin = operationType === 4;

  // Load rules when operation type changes
  useEffect(() => {
    setSelectedRuleId('');
    setRules([]);
    api.listRules(operationType).then(data => {
      if (data?.items || Array.isArray(data)) {
        setRules(data?.items || data);
      }
    });
  }, [operationType]);

  const updateField = (field: keyof ClientFormData, value: any) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  };

  // CPF auto-search
  const handleCPFBlur = async () => {
    const cleanCpf = clientData.identity.replace(/\D/g, '');
    if (cleanCpf.length !== 11) return;
    setCpfSearching(true);
    try {
      const found = await searchClientByCPF(cleanCpf);
      if (found) {
        setClientData(prev => ({
          ...prev,
          name: found.nome || prev.name,
          benefit: found.nb || prev.benefit,
          benefitState: found.uf || prev.benefitState,
          benefitStartDate: formatDateForInput(found.ddb || found.dib) || prev.benefitStartDate,
          benefitPaymentMethod: found.meio_pagto === 'CC' || found.meio_pagto === '2' ? 2 : 1,
          benefitType: found.esp ? parseInt(found.esp) || 42 : prev.benefitType,
          birthDate: formatDateForInput(found.data_nascimento) || prev.birthDate,
          motherName: found.nome_mae || prev.motherName,
          sex: found.sexo === 'F' ? 'Feminino' : 'Masculino',
          income: found.mr || prev.income,
          phone: found.tel_cel_1 || prev.phone,
          email: found.email_1 || prev.email,
          street: found.endereco || found.logr_nome_1 || prev.street,
          number: found.logr_numero_1 || prev.number,
          complement: found.logr_complemento_1 || prev.complement,
          district: found.bairro || found.bairro_1 || prev.district,
          city: found.municipio || found.cidade_1 || prev.city,
          state: found.uf || found.uf_1 || prev.state,
          zipCode: found.cep || found.cep_1 || prev.zipCode,
          docIssuingState: found.uf || prev.docIssuingState,
        }));
        setBankData(prev => ({
          ...prev,
          bankCode: found.banco_pagto || prev.bankCode,
          bankBranch: found.agencia_pagto || prev.bankBranch,
          bankNumber: found.conta_corrente || prev.bankNumber,
        }));
        toast.success('Cliente encontrado na base!');
      }
    } finally {
      setCpfSearching(false);
    }
  };

  const handleIN100 = async () => {
    if (!clientData.identity || !clientData.benefit) {
      toast.error('CPF e Nº Benefício são obrigatórios');
      return;
    }
    setIn100Loading(true);
    try {
      const result = await api.queryIN100(clientData.identity, clientData.benefit);
      if (result) {
        setIn100Result(result);
        toast.success('IN100 consultado!');
      }
    } finally {
      setIn100Loading(false);
    }
  };

  const copyIN100Link = () => {
    const link = `https://app.ajin.io/auth/inss/${clientData.identity}/${clientData.benefit}`;
    navigator.clipboard.writeText(link);
    toast.success('Link IN100 copiado!');
  };

  const handleCalculate = async () => {
    const payload: any = { ruleId: selectedRuleId, hasInsurance, term, rate, referenceCode: null };
    if (installmentValue > 0) payload.installmentValue = installmentValue;
    if (loanValue > 0) payload.loanValue = loanValue;
    if (needsOriginContract) {
      payload.originContract = {
        lenderCode: parseInt(originLenderCode) || 0,
        contractNumber: originContractNumber,
        term: originTerm,
        installmentsRemaining: originInstallmentsRemaining,
        installmentValue: originInstallmentValue,
        dueBalanceValue: originDueBalance,
      };
    }
    if (isPortRefin) {
      payload.refinancing = { term: refinTerm, rate: refinRate, installmentValue: refinInstallmentValue };
    }
    const result = await api.calculate(payload);
    if (result) {
      setCalcResult(result);
      toast.success('Cálculo realizado!');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const borrower: any = {
        name: clientData.name,
        identity: clientData.identity,
        benefit: clientData.benefit,
        benefitState: clientData.benefitState,
        benefitStartDate: clientData.benefitStartDate || '1999-01-15',
        benefitPaymentMethod: clientData.benefitPaymentMethod,
        benefitType: clientData.benefitType,
        birthDate: clientData.birthDate || '1965-01-01',
        motherName: clientData.motherName,
        maritalStatus: clientData.maritalStatus,
        sex: clientData.sex,
        income: clientData.income,
        phone: clientData.phone,
        email: clientData.email,
        address: {
          street: clientData.street, number: clientData.number || 'S/N',
          complement: clientData.complement, district: clientData.district,
          city: clientData.city, state: clientData.state,
          zipCode: clientData.zipCode?.replace(/\D/g, ''),
        },
        document: {
          type: { code: 'RG', name: 'Registro Geral' },
          number: clientData.docNumber || '000000',
          issuingDate: clientData.docIssuingDate || '1990-01-01',
          issuingEntity: clientData.docIssuingEntity,
          issuingState: clientData.docIssuingState,
        },
      };

      const item: any = { ruleId: selectedRuleId, term, rate, hasInsurance, referenceCode: null };
      if (installmentValue > 0) item.installmentValue = installmentValue;
      if (loanValue > 0) item.loanValue = loanValue;
      if (needsOriginContract) {
        item.originContract = {
          lenderCode: parseInt(originLenderCode) || 0, contractNumber: originContractNumber,
          term: originTerm, installmentsRemaining: originInstallmentsRemaining,
          installmentValue: originInstallmentValue, dueBalanceValue: originDueBalance,
        };
      }
      if (isPortRefin) {
        item.refinancing = { term: refinTerm, rate: refinRate, installmentValue: refinInstallmentValue };
      }

      const requestPayload = {
        borrower, items: [item],
        creditBankAccount: { bank: bank.bankCode, branch: bank.bankBranch, number: bank.bankNumber, digit: bank.bankDigit },
        step: { code: 0, name: null }, note: null, brokerId: null, accessId: null,
      };

      const result = await api.createSimulation(requestPayload);
      if (result) {
        await api.saveProposal({
          client_cpf: clientData.identity,
          client_name: clientData.name,
          simulation_id: result.id || result.simulationId,
          operation_type: OPERATION_TYPES.find(o => o.code === operationType)?.label || 'Novo',
          status: 'enviada',
          api_response: result,
          request_payload: requestPayload,
        });
        toast.success('Proposta enviada com sucesso!');
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: return !!clientData.name && !!clientData.identity && !!clientData.benefit;
      case 1: return !!selectedRuleId && term > 0;
      case 2: return true;
      case 3: return true;
      default: return true;
    }
  }, [currentStep, clientData.name, clientData.identity, clientData.benefit, selectedRuleId, term]);

  const goNext = () => { if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1); else handleSubmit(); };
  const goBack = () => { if (currentStep === 0) onClose(); else setCurrentStep(s => s - 1); };

  // Input class for touch-friendly
  const inputCls = 'h-12 text-base';

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={goBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base truncate">Nova Digitação</h1>
          <p className="text-xs text-muted-foreground">{STEPS[currentStep].title}</p>
        </div>
        <Badge variant="secondary" className="text-[10px] shrink-0">API Bancária</Badge>
      </div>

      {/* Step Indicator */}
      <div className="py-3 px-4">
        <CompactStepIndicator currentStep={currentStep} totalSteps={STEPS.length} />
      </div>

      {/* Content — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-28">
        {/* ===== STEP 0: Dados do Cliente ===== */}
        {currentStep === 0 && (
          <div className="space-y-4">
            {/* IN100 Link */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Search className="w-4 h-4 text-primary" /> Autorize o IN100
                  </p>
                  <Button variant="outline" size="sm" onClick={copyIN100Link}
                    disabled={!clientData.identity || !clientData.benefit} className="gap-1 h-9">
                    <Copy className="w-3 h-3" /> Copiar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Envie o link ao cliente para autorizar.</p>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div>
                <Label>CPF *</Label>
                <div className="relative">
                  <Input className={inputCls} value={clientData.identity}
                    onChange={e => updateField('identity', e.target.value)}
                    onBlur={handleCPFBlur} placeholder="000.000.000-00" inputMode="numeric" />
                  {cpfSearching && <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
              <div>
                <Label>Nome Completo *</Label>
                <Input className={inputCls} value={clientData.name} onChange={e => updateField('name', e.target.value)} />
              </div>
              <div>
                <Label>Nº Benefício (NB) *</Label>
                <Input className={inputCls} value={clientData.benefit} onChange={e => updateField('benefit', e.target.value)} inputMode="numeric" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Celular</Label>
                  <Input className={inputCls} value={clientData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="(00) 00000-0000" inputMode="tel" />
                </div>
                <div>
                  <Label>Nascimento</Label>
                  <Input type="date" className={inputCls} value={clientData.birthDate} onChange={e => updateField('birthDate', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>DDB (Início Benef.)</Label>
                  <Input type="date" className={inputCls} value={clientData.benefitStartDate} onChange={e => updateField('benefitStartDate', e.target.value)} />
                </div>
                <div>
                  <Label>Espécie</Label>
                  <Input type="number" className={inputCls} value={clientData.benefitType} onChange={e => updateField('benefitType', parseInt(e.target.value) || 42)} inputMode="numeric" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Renda (R$)</Label>
                  <Input type="number" step="0.01" className={inputCls} value={clientData.income || ''} onChange={e => updateField('income', parseFloat(e.target.value) || 0)} inputMode="decimal" />
                </div>
                <div>
                  <Label>UF Benefício</Label>
                  <Select value={clientData.benefitState} onValueChange={v => updateField('benefitState', v)}>
                    <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                    <SelectContent>{UF_OPTIONS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* IN100 */}
              <Button onClick={handleIN100} disabled={in100Loading || !clientData.identity || !clientData.benefit}
                variant="outline" className="w-full gap-2 h-12">
                {in100Loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Consultar IN100
              </Button>

              {in100Result && (
                <Card className="bg-accent/50 border-primary/20">
                  <CardContent className="p-3">
                    <p className="text-sm font-semibold text-primary flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> IN100 Consultado
                    </p>
                    <pre className="text-xs mt-2 bg-background p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(in100Result, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Collapsible Additional Data */}
              <Collapsible open={showAdditionalData} onOpenChange={setShowAdditionalData}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-muted-foreground h-12" type="button">
                    <span className="flex items-center gap-2"><User className="w-4 h-4" /> Dados Adicionais</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform", showAdditionalData && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <div className="space-y-3">
                    <div>
                      <Label>Nome da Mãe</Label>
                      <Input className={inputCls} value={clientData.motherName} onChange={e => updateField('motherName', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Sexo</Label>
                        <Select value={clientData.sex} onValueChange={v => updateField('sex', v)}>
                          <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Masculino">Masculino</SelectItem>
                            <SelectItem value="Feminino">Feminino</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Estado Civil</Label>
                        <Select value={clientData.maritalStatus} onValueChange={v => updateField('maritalStatus', v)}>
                          <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Solteiro">Solteiro</SelectItem>
                            <SelectItem value="Casado">Casado</SelectItem>
                            <SelectItem value="Divorciado">Divorciado</SelectItem>
                            <SelectItem value="Viúvo">Viúvo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input className={inputCls} value={clientData.email} onChange={e => updateField('email', e.target.value)} type="email" />
                    </div>
                    <div>
                      <Label>Meio Pagamento</Label>
                      <Select value={String(clientData.benefitPaymentMethod)} onValueChange={v => updateField('benefitPaymentMethod', parseInt(v))}>
                        <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Cartão Magnético</SelectItem>
                          <SelectItem value="2">Conta Corrente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Separator />
                    <p className="text-xs font-semibold text-muted-foreground">Endereço</p>
                    <div>
                      <Label>Rua</Label>
                      <Input className={inputCls} value={clientData.street} onChange={e => updateField('street', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Número</Label><Input className={inputCls} value={clientData.number} onChange={e => updateField('number', e.target.value)} /></div>
                      <div><Label>Complemento</Label><Input className={inputCls} value={clientData.complement} onChange={e => updateField('complement', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Bairro</Label><Input className={inputCls} value={clientData.district} onChange={e => updateField('district', e.target.value)} /></div>
                      <div><Label>Cidade</Label><Input className={inputCls} value={clientData.city} onChange={e => updateField('city', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>UF</Label>
                        <Select value={clientData.state} onValueChange={v => updateField('state', v)}>
                          <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                          <SelectContent>{UF_OPTIONS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>CEP</Label><Input className={inputCls} value={clientData.zipCode} onChange={e => updateField('zipCode', e.target.value)} inputMode="numeric" /></div>
                    </div>
                    <Separator />
                    <p className="text-xs font-semibold text-muted-foreground">Documento (RG)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Número RG</Label><Input className={inputCls} value={clientData.docNumber} onChange={e => updateField('docNumber', e.target.value)} /></div>
                      <div><Label>Data Emissão</Label><Input type="date" className={inputCls} value={clientData.docIssuingDate} onChange={e => updateField('docIssuingDate', e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Órgão</Label><Input className={inputCls} value={clientData.docIssuingEntity} onChange={e => updateField('docIssuingEntity', e.target.value)} /></div>
                      <div>
                        <Label>UF Emissão</Label>
                        <Select value={clientData.docIssuingState} onValueChange={v => updateField('docIssuingState', v)}>
                          <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                          <SelectContent>{UF_OPTIONS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        )}

        {/* ===== STEP 1: Simulação ===== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label>Tipo de Operação</Label>
              <Select value={String(operationType)} onValueChange={v => setOperationType(parseInt(v))}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OPERATION_TYPES.map(op => (
                    <SelectItem key={op.code} value={String(op.code)}>{op.label} — {op.description}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tabela (Rule)</Label>
              {rules.length > 0 ? (
                <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
                  <SelectContent>
                    {rules.map((rule: any, idx: number) => (
                      <SelectItem key={rule.id || idx} value={rule.id || ''}>
                        {rule.name || rule.product?.name || `Tabela ${idx + 1}`} — {rule.lender?.name || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg mt-1">
                  {api.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                  {api.loading ? 'Carregando tabelas...' : 'Nenhuma tabela disponível'}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prazo (meses)</Label><Input type="number" className={inputCls} value={term} onChange={e => setTerm(parseInt(e.target.value) || 0)} inputMode="numeric" /></div>
              <div><Label>Taxa (%)</Label><Input type="number" step="0.01" className={inputCls} value={rate} onChange={e => setRate(parseFloat(e.target.value) || 0)} inputMode="decimal" /></div>
              <div><Label>Vl. Parcela (R$)</Label><Input type="number" step="0.01" className={inputCls} value={installmentValue || ''} onChange={e => setInstallmentValue(parseFloat(e.target.value) || 0)} placeholder="Opcional" inputMode="decimal" /></div>
              <div><Label>Vl. Empréstimo (R$)</Label><Input type="number" step="0.01" className={inputCls} value={loanValue || ''} onChange={e => setLoanValue(parseFloat(e.target.value) || 0)} placeholder="Opcional" inputMode="decimal" /></div>
            </div>

            <div className="flex items-center gap-2 py-1">
              <Switch checked={hasInsurance} onCheckedChange={setHasInsurance} />
              <Label>Incluir Seguro</Label>
            </div>

            {needsOriginContract && (
              <>
                <Separator />
                <p className="text-sm font-semibold text-muted-foreground">Contrato de Origem</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cód. Banco</Label><Input className={inputCls} value={originLenderCode} onChange={e => setOriginLenderCode(e.target.value)} inputMode="numeric" /></div>
                  <div><Label>Nº Contrato</Label><Input className={inputCls} value={originContractNumber} onChange={e => setOriginContractNumber(e.target.value)} /></div>
                  <div><Label>Prazo Orig.</Label><Input type="number" className={inputCls} value={originTerm} onChange={e => setOriginTerm(parseInt(e.target.value) || 0)} inputMode="numeric" /></div>
                  <div><Label>Parc. Rest.</Label><Input type="number" className={inputCls} value={originInstallmentsRemaining} onChange={e => setOriginInstallmentsRemaining(parseInt(e.target.value) || 0)} inputMode="numeric" /></div>
                  <div><Label>Vl. Parcela</Label><Input type="number" step="0.01" className={inputCls} value={originInstallmentValue} onChange={e => setOriginInstallmentValue(parseFloat(e.target.value) || 0)} inputMode="decimal" /></div>
                  <div><Label>Saldo Dev.</Label><Input type="number" step="0.01" className={inputCls} value={originDueBalance} onChange={e => setOriginDueBalance(parseFloat(e.target.value) || 0)} inputMode="decimal" /></div>
                </div>
              </>
            )}

            {isPortRefin && (
              <>
                <Separator />
                <p className="text-sm font-semibold text-muted-foreground">Refinanciamento</p>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Prazo Refin</Label><Input type="number" className={inputCls} value={refinTerm} onChange={e => setRefinTerm(parseInt(e.target.value) || 0)} inputMode="numeric" /></div>
                  <div><Label>Taxa Refin</Label><Input type="number" step="0.01" className={inputCls} value={refinRate} onChange={e => setRefinRate(parseFloat(e.target.value) || 0)} inputMode="decimal" /></div>
                  <div><Label>Parcela Refin</Label><Input type="number" step="0.01" className={inputCls} value={refinInstallmentValue} onChange={e => setRefinInstallmentValue(parseFloat(e.target.value) || 0)} inputMode="decimal" /></div>
                </div>
              </>
            )}

            <Separator />
            <Button onClick={handleCalculate} disabled={api.loading || !selectedRuleId} className="w-full gap-2 h-12">
              {api.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
              Simular
            </Button>

            {calcResult && (
              <Card className="bg-accent/50 border-primary/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Resultado</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {calcResult.installmentValue != null && (
                      <div><span className="text-muted-foreground text-xs">Parcela</span><p className="font-bold text-primary text-lg">R$ {Number(calcResult.installmentValue).toFixed(2)}</p></div>
                    )}
                    {calcResult.loanValue != null && (
                      <div><span className="text-muted-foreground text-xs">Liberado</span><p className="font-bold text-primary text-lg">R$ {Number(calcResult.loanValue).toFixed(2)}</p></div>
                    )}
                    {calcResult.iofValue != null && (
                      <div><span className="text-muted-foreground text-xs">IOF</span><p className="font-medium">R$ {Number(calcResult.iofValue).toFixed(2)}</p></div>
                    )}
                    {calcResult.changeValue != null && (
                      <div>
                        <span className="text-muted-foreground text-xs">Troco</span>
                        <p className={cn("font-bold text-lg", Number(calcResult.changeValue) > 0 ? 'text-primary' : 'text-destructive')}>
                          R$ {Number(calcResult.changeValue).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ===== STEP 2: Documentos ===== */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Envie frente e verso do documento. Formatos: PNG, JPEG, PDF.</p>
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="flex items-center gap-2 mb-2"><FileUp className="w-4 h-4" /> Frente do Documento</Label>
                  <Input type="file" accept="image/*,.pdf" className="h-12" onChange={e => setDocFrontFile(e.target.files?.[0] || null)} />
                  {docFrontFile && <p className="text-xs text-primary mt-1">✓ {docFrontFile.name}</p>}
                </div>
                <Separator />
                <div>
                  <Label className="flex items-center gap-2 mb-2"><FileUp className="w-4 h-4" /> Verso do Documento</Label>
                  <Input type="file" accept="image/*,.pdf" className="h-12" onChange={e => setDocBackFile(e.target.files?.[0] || null)} />
                  {docBackFile && <p className="text-xs text-primary mt-1">✓ {docBackFile.name}</p>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== STEP 3: Confirmação ===== */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold">Dados Bancários para Crédito</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cód. Banco</Label><Input className={inputCls} value={bank.bankCode} onChange={e => setBankData(p => ({...p, bankCode: e.target.value}))} inputMode="numeric" /></div>
              <div><Label>Agência</Label><Input className={inputCls} value={bank.bankBranch} onChange={e => setBankData(p => ({...p, bankBranch: e.target.value}))} /></div>
              <div><Label>Conta</Label><Input className={inputCls} value={bank.bankNumber} onChange={e => setBankData(p => ({...p, bankNumber: e.target.value}))} /></div>
              <div><Label>Dígito</Label><Input className={inputCls} value={bank.bankDigit} onChange={e => setBankData(p => ({...p, bankDigit: e.target.value}))} /></div>
            </div>

            <Separator />
            <p className="text-sm font-semibold">Resumo da Proposta</p>
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{clientData.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">CPF</span><span className="font-medium">{clientData.identity}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">NB</span><span className="font-medium">{clientData.benefit}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Operação</span><span className="font-medium">{OPERATION_TYPES.find(o => o.code === operationType)?.label}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Prazo</span><span className="font-medium">{term} meses</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Taxa</span><span className="font-medium">{rate}%</span></div>
                {calcResult?.loanValue && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Valor Liberado</span><span className="font-bold text-primary">R$ {Number(calcResult.loanValue).toFixed(2)}</span></div>
                )}
                {calcResult?.installmentValue && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Parcela</span><span className="font-bold text-primary">R$ {Number(calcResult.installmentValue).toFixed(2)}</span></div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Fixed bottom navigation */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-4 py-3 pb-safe flex gap-3">
        <Button variant="outline" className="flex-1 h-12" onClick={goBack} disabled={isSubmitting}>
          {currentStep === 0 ? 'Cancelar' : 'Voltar'}
        </Button>
        <Button className="flex-1 h-12" onClick={goNext} disabled={!canProceed || isSubmitting}>
          {isSubmitting ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Enviando...</>
          ) : currentStep === STEPS.length - 1 ? (
            <><Send className="h-4 w-4 mr-2" /> Enviar Proposta</>
          ) : (
            <>Próximo <ChevronRight className="h-4 w-4 ml-1" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
