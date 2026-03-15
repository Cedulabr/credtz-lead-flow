import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2, Send, CheckCircle2, Copy, FileUp, Search, ArrowLeft, ChevronRight, ChevronLeft,
  Plus, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import { useJoinBankAPI } from '@/modules/baseoff/hooks/useJoinBankAPI';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ClientFormData, BankAccountData, SimulationItem,
  INITIAL_CLIENT_DATA, INITIAL_BANK_DATA,
  OPERATION_TYPES, UF_OPTIONS, BENEFIT_TYPES
} from '../types';
import { SimulationModal } from './SimulationModal';
import { SimulationCard } from './SimulationCard';

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
  { id: 'in100', title: 'Consulta IN100' },
  { id: 'simulations', title: 'Simulações' },
  { id: 'data', title: 'Dados' },
  { id: 'documents', title: 'Documentos' },
  { id: 'formalization', title: 'Formalização' },
];

export function DigitacaoForm({ onClose, onSuccess, searchClientByCPF }: DigitacaoFormProps) {
  const api = useJoinBankAPI();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cpfSearching, setCpfSearching] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  // Step 1 — IN100
  const [clientData, setClientData] = useState<ClientFormData>({ ...INITIAL_CLIENT_DATA });
  const [in100Link, setIn100Link] = useState('');

  // Step 2 — Simulações
  const [simulations, setSimulations] = useState<SimulationItem[]>([]);
  const [showSimModal, setShowSimModal] = useState(false);

  // Step 3 — Dados
  const [bankData, setBankData] = useState<BankAccountData>({ ...INITIAL_BANK_DATA });

  // Step 4 — Docs
  const [docFrontFile, setDocFrontFile] = useState<File | null>(null);
  const [docBackFile, setDocBackFile] = useState<File | null>(null);
  const [clientSentDocs, setClientSentDocs] = useState(false);

  const inputCls = 'h-11 text-sm';

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

  // Generate IN100 link
  useEffect(() => {
    if (clientData.identity && clientData.benefit) {
      const cpf = clientData.identity.replace(/\D/g, '');
      setIn100Link(`https://app.ajin.io/auth/inss/${cpf}/${clientData.benefit}`);
    } else {
      setIn100Link('');
    }
  }, [clientData.identity, clientData.benefit]);

  const copyIN100Link = () => {
    if (!in100Link) return;
    navigator.clipboard.writeText(in100Link);
    toast.success('Link IN100 copiado!');
  };

  const addSimulation = (sim: SimulationItem) => {
    setSimulations(prev => [...prev, sim]);
  };

  const removeSimulation = (id: string) => {
    setSimulations(prev => prev.filter(s => s.id !== id));
  };

  const handleSubmit = async () => {
    if (simulations.length === 0) { toast.error('Adicione pelo menos uma simulação'); return; }
    setIsSubmitting(true);
    try {
      const sim = simulations[0];
      const borrower: any = {
        name: clientData.name,
        identity: clientData.identity.replace(/\D/g, ''),
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

      const item: any = {
        ruleId: sim.ruleId,
        term: sim.refinTerm || sim.originTerm,
        rate: sim.refinRate || sim.originRate,
        hasInsurance: sim.hasInsurance,
        referenceCode: null,
      };
      if (sim.refinInstallmentValue > 0) item.installmentValue = sim.refinInstallmentValue;
      if (sim.operationType >= 3) {
        item.originContract = {
          lenderCode: parseInt(sim.originLenderCode) || 0,
          contractNumber: sim.originContractNumber,
          term: sim.originTerm,
          installmentsRemaining: sim.originInstallmentsRemaining,
          installmentValue: sim.originInstallmentValue,
          dueBalanceValue: sim.originDueBalance,
        };
      }
      if (sim.operationType === 4 || sim.operationType === 2) {
        item.refinancing = {
          term: sim.refinTerm,
          rate: sim.refinRate,
          installmentValue: sim.refinInstallmentValue,
        };
      }

      const requestPayload = {
        borrower,
        items: [item],
        creditBankAccount: {
          bank: bankData.bankCode,
          branch: bankData.bankBranch,
          number: bankData.bankNumber,
          digit: bankData.bankDigit,
        },
        step: { code: 0, name: null },
        note: null,
        brokerId: null,
        accessId: null,
      };

      const result = await api.createSimulation(requestPayload);
      if (result) {
        await api.saveProposal({
          client_cpf: clientData.identity,
          client_name: clientData.name,
          simulation_id: result.id || result.simulationId,
          operation_type: OPERATION_TYPES.find(o => o.code === sim.operationType)?.label || 'Novo',
          status: 'enviada',
          api_response: result,
          request_payload: requestPayload,
        });
        setSubmissionResult(result);
        setSubmitted(true);
        setCurrentStep(4); // Go to formalization
        toast.success('Proposta enviada com sucesso!');
        onSuccess();
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
      case 1: return simulations.length > 0;
      case 2: return true;
      case 3: return true;
      default: return true;
    }
  }, [currentStep, clientData.name, clientData.identity, clientData.benefit, simulations.length]);

  const goNext = () => {
    if (currentStep === 3) {
      handleSubmit();
    } else if (currentStep < 4) {
      setCurrentStep(s => s + 1);
    }
  };
  const goBack = () => {
    if (currentStep === 0) onClose();
    else if (currentStep === 4 && submitted) onClose();
    else setCurrentStep(s => s - 1);
  };

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
        <Badge variant="secondary" className="text-[10px] shrink-0">{currentStep + 1}/{STEPS.length}</Badge>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">

        {/* ===== STEP 0: Consulta IN100 ===== */}
        {currentStep === 0 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold mb-1">Consulta <span className="text-primary">IN100</span></h2>
              <p className="text-xs text-muted-foreground">Dados do Beneficiário</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">CPF</Label>
                <div className="relative">
                  <Input className={inputCls} value={clientData.identity}
                    onChange={e => updateField('identity', e.target.value)}
                    onBlur={handleCPFBlur} placeholder="000.000.000-00" inputMode="numeric" />
                  {cpfSearching && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <Input className={inputCls} value={clientData.name} onChange={e => updateField('name', e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Número do Benefício</Label>
                <Input className={inputCls} value={clientData.benefit} onChange={e => updateField('benefit', e.target.value)} inputMode="numeric" />
              </div>
            </div>

            <div className="max-w-xs">
              <Label className="text-xs text-muted-foreground">Celular</Label>
              <Input className={inputCls} value={clientData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="(00) 00000-0000" inputMode="tel" />
            </div>

            <Separator />

            <div>
              <h3 className="text-sm font-bold mb-1">Autorize o <span className="text-primary">IN100</span></h3>
              <p className="text-xs text-muted-foreground mb-3">Copie o link abaixo e envie ao seu cliente para que ele possa autorizar a consulta do IN100</p>
              <div className="flex gap-2">
                <Input
                  className="flex-1 text-xs h-11 bg-muted"
                  value={in100Link || 'Preencha CPF e NB para gerar o link'}
                  readOnly
                />
                <Button onClick={copyIN100Link} disabled={!in100Link} className="h-11 px-5 shrink-0">
                  Copiar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 1: Simulações ===== */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Simulações</h2>
              <Button onClick={() => setShowSimModal(true)} className="gap-1.5 h-10">
                <Plus className="w-4 h-4" /> Adicionar Simulação
              </Button>
            </div>

            {/* Info banner */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                ⓘ Já incluiu sua proposta de aumento salarial? Saiba que é possível incluir este produto nesta mesma digitação! Basta adicionar uma nova simulação!
              </p>
            </div>

            {/* Simulation list */}
            {simulations.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-sm">Nenhuma simulação adicionada</p>
                <p className="text-xs mt-1">Toque em "Adicionar Simulação" para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {simulations.map(sim => (
                  <SimulationCard
                    key={sim.id}
                    simulation={sim}
                    onRemove={() => removeSimulation(sim.id)}
                  />
                ))}
              </div>
            )}

            <SimulationModal
              open={showSimModal}
              onClose={() => setShowSimModal(false)}
              onAdd={addSimulation}
            />
          </div>
        )}

        {/* ===== STEP 2: Dados Pessoais + Benefício + Endereço + Bancários ===== */}
        {currentStep === 2 && (
          <div className="space-y-5">
            {/* Dados Pessoais */}
            <div>
              <h3 className="text-sm font-bold mb-3">Dados <span className="font-bold">Pessoais</span></h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de Documento</Label>
                  <Select defaultValue="RG">
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RG">RG</SelectItem>
                      <SelectItem value="CNH">CNH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Número do Documento</Label>
                  <Input className={inputCls} value={clientData.docNumber} onChange={e => updateField('docNumber', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">UF do Documento</Label>
                  <Select value={clientData.docIssuingState} onValueChange={v => updateField('docIssuingState', v)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{UF_OPTIONS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Órgão Expedidor</Label>
                  <Input className={inputCls} value={clientData.docIssuingEntity} onChange={e => updateField('docIssuingEntity', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data de Emissão</Label>
                  <Input type="date" className={inputCls} value={clientData.docIssuingDate} onChange={e => updateField('docIssuingDate', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Data de Nascimento</Label>
                  <Input type="date" className={inputCls} value={clientData.birthDate} onChange={e => updateField('birthDate', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Sexo</Label>
                  <Select value={clientData.sex} onValueChange={v => updateField('sex', v)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Estado Civil</Label>
                  <Select value={clientData.maritalStatus} onValueChange={v => updateField('maritalStatus', v)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solteiro">Solteiro</SelectItem>
                      <SelectItem value="Casado">Casado</SelectItem>
                      <SelectItem value="Divorciado">Divorciado</SelectItem>
                      <SelectItem value="Viúvo">Viúvo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                <div>
                  <Label className="text-xs text-muted-foreground">E-mail</Label>
                  <Input className={inputCls} type="email" value={clientData.email} onChange={e => updateField('email', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Nome da Mãe</Label>
                  <Input className={inputCls} value={clientData.motherName} onChange={e => updateField('motherName', e.target.value)} />
                </div>
              </div>
            </div>

            <Separator />

            {/* Dados do Benefício */}
            <div>
              <h3 className="text-sm font-bold mb-3">Dados do <span className="font-bold">Benefício</span></h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de Benefício</Label>
                  <Select value={String(clientData.benefitType)} onValueChange={v => updateField('benefitType', parseInt(v))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BENEFIT_TYPES.map(b => (
                        <SelectItem key={b.code} value={String(b.code)}>{b.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Data Despacho (DDB)</Label>
                    <Input type="date" className={inputCls} value={clientData.benefitStartDate} onChange={e => updateField('benefitStartDate', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">UF do Benefício</Label>
                    <Select value={clientData.benefitState} onValueChange={v => updateField('benefitState', v)}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>{UF_OPTIONS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Forma de Pagamento</Label>
                    <Select value={String(clientData.benefitPaymentMethod)} onValueChange={v => updateField('benefitPaymentMethod', parseInt(v))}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Cartão Magnético</SelectItem>
                        <SelectItem value="2">Conta Corrente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dados do Endereço */}
            <div>
              <h3 className="text-sm font-bold mb-3">Dados do <span className="font-bold">Endereço</span></h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">CEP</Label>
                  <Input className={inputCls} value={clientData.zipCode} onChange={e => updateField('zipCode', e.target.value)} inputMode="numeric" />
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Endereço</Label>
                  <Input className={inputCls} value={clientData.street} onChange={e => updateField('street', e.target.value)} placeholder="(rua, avenida, praça, etc.)" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Número</Label>
                    <Input className={inputCls} value={clientData.number} onChange={e => updateField('number', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Compl.</Label>
                    <Input className={inputCls} value={clientData.complement} onChange={e => updateField('complement', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Bairro</Label>
                  <Input className={inputCls} value={clientData.district} onChange={e => updateField('district', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cidade</Label>
                  <Input className={inputCls} value={clientData.city} onChange={e => updateField('city', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">UF</Label>
                  <Select value={clientData.state} onValueChange={v => updateField('state', v)}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>{UF_OPTIONS.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Dados Bancários */}
            <div>
              <h3 className="text-sm font-bold mb-3">Dados <span className="font-bold">Bancários</span></h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de Conta</Label>
                  <Select value={bankData.accountType} onValueChange={v => setBankData(p => ({ ...p, accountType: v }))}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">Conta Corrente</SelectItem>
                      <SelectItem value="CP">Conta Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Código do Banco</Label>
                  <Input className={inputCls} value={bankData.bankCode} onChange={e => setBankData(p => ({ ...p, bankCode: e.target.value }))} inputMode="numeric" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Agência</Label>
                  <Input className={inputCls} value={bankData.bankBranch} onChange={e => setBankData(p => ({ ...p, bankBranch: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Número da Conta</Label>
                  <Input className={inputCls} value={bankData.bankNumber} onChange={e => setBankData(p => ({ ...p, bankNumber: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Dígito</Label>
                  <Input className={inputCls} value={bankData.bankDigit} onChange={e => setBankData(p => ({ ...p, bankDigit: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 3: Documentos ===== */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={clientSentDocs}
                onCheckedChange={(v) => setClientSentDocs(v === true)}
              />
              <span className="text-sm">Documentos enviados pelo próprio cliente durante a formalização</span>
            </div>

            <div>
              <h3 className="text-sm font-bold mb-3">Anexo de <span className="font-bold">Documentos</span></h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Frente */}
                <label className="cursor-pointer">
                  <Card className={cn(
                    "border-2 border-dashed hover:border-primary/50 transition-colors",
                    docFrontFile && "border-primary/40 bg-primary/5"
                  )}>
                    <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-semibold">Frente do Documento</p>
                      <p className="text-[10px] text-muted-foreground">Tamanho mínimo: 250×250px</p>
                      <p className="text-[10px] text-muted-foreground">Formatos aceitos: PNG, JPEG, PDF, HEIC</p>
                      {docFrontFile ? (
                        <p className="text-xs text-primary font-medium mt-1">✓ {docFrontFile.name}</p>
                      ) : (
                        <Button variant="default" size="sm" className="mt-2" type="button">
                          Selecionar
                        </Button>
                      )}
                      <input type="file" accept="image/*,.pdf,.heic" className="hidden"
                        onChange={e => setDocFrontFile(e.target.files?.[0] || null)} />
                    </CardContent>
                  </Card>
                </label>

                {/* Verso */}
                <label className="cursor-pointer">
                  <Card className={cn(
                    "border-2 border-dashed hover:border-primary/50 transition-colors",
                    docBackFile && "border-primary/40 bg-primary/5"
                  )}>
                    <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-semibold">Verso do Documento</p>
                      <p className="text-[10px] text-muted-foreground">Tamanho mínimo: 250×250px</p>
                      <p className="text-[10px] text-muted-foreground">Formatos aceitos: PNG, JPEG, PDF, HEIC</p>
                      {docBackFile ? (
                        <p className="text-xs text-primary font-medium mt-1">✓ {docBackFile.name}</p>
                      ) : (
                        <Button variant="default" size="sm" className="mt-2" type="button">
                          Selecionar
                        </Button>
                      )}
                      <input type="file" accept="image/*,.pdf,.heic" className="hidden"
                        onChange={e => setDocBackFile(e.target.files?.[0] || null)} />
                    </CardContent>
                  </Card>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP 4: Formalização ===== */}
        {currentStep === 4 && (
          <div className="space-y-5 text-center">
            <div className="py-4">
              <h2 className="text-lg font-bold">Falta muito pouco, faça a formalização!</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Sua proposta foi cadastrada com sucesso, agora basta fazer a formalização digital com o cliente e acompanhar o andamento do seu contrato!
              </p>
            </div>

            <div className="text-left space-y-2">
              <div className="flex gap-8">
                <div>
                  <span className="text-xs text-muted-foreground">Status</span>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    Assinado
                  </p>
                  <p className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Tipo</span>
                  <p className="text-sm font-medium">Biometria com documento</p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="text-left">
              <Label className="text-xs text-muted-foreground">Link da Formalização</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  className="flex-1 text-xs h-11 bg-muted"
                  value={submissionResult?.authTermUrl || submissionResult?.formalizationLink || `https://signer.ajin.io/${submissionResult?.id || ''}`}
                  readOnly
                />
                <Button
                  className="h-11 px-5 shrink-0"
                  onClick={() => {
                    const link = submissionResult?.authTermUrl || submissionResult?.formalizationLink || `https://signer.ajin.io/${submissionResult?.id || ''}`;
                    navigator.clipboard.writeText(link);
                    toast.success('Link copiado!');
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <Button variant="default" className="gap-2 h-11" onClick={() => {
              window.open(`https://signer.ajin.io/${submissionResult?.id || ''}`, '_blank');
            }}>
              <ExternalLink className="w-4 h-4" /> Visualizar CCB
            </Button>
          </div>
        )}
      </div>

      {/* Fixed bottom navigation */}
      {currentStep < 4 && (
        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-4 py-3 pb-safe flex items-center justify-between gap-3">
          <Button variant="outline" className="h-11 gap-1.5" onClick={goBack} disabled={isSubmitting}>
            <ChevronLeft className="h-4 w-4" />
            {currentStep === 0 ? 'Cancelar' : 'Voltar'}
          </Button>
          <span className="text-xs text-muted-foreground font-medium">{currentStep + 1} / {STEPS.length - 1}</span>
          <Button className="h-11 gap-1.5" onClick={goNext} disabled={!canProceed || isSubmitting}>
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
            ) : currentStep === 3 ? (
              <><Send className="h-4 w-4" /> Enviar</>
            ) : (
              <>Próximo <ChevronRight className="h-4 w-4" /></>
            )}
          </Button>
        </div>
      )}

      {/* Formalization bottom */}
      {currentStep === 4 && (
        <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur px-4 py-3 pb-safe">
          <Button className="w-full h-11" onClick={onClose}>
            <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir
          </Button>
        </div>
      )}
    </div>
  );
}
