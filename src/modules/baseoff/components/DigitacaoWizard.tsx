import React, { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Loader2, Send, Calculator, CheckCircle2, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { FormWizard, StepContent } from '@/components/ui/form-wizard';
import { BaseOffClient, BaseOffContract } from '../types';
import { useJoinBankAPI } from '../hooks/useJoinBankAPI';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DigitacaoWizardProps {
  isOpen: boolean;
  onClose: () => void;
  client: BaseOffClient;
  contracts: BaseOffContract[];
}

const OPERATION_TYPES = [
  { code: 1, label: 'Novo', description: 'Empréstimo novo consignado' },
  { code: 2, label: 'Refinanciamento', description: 'Refinanciar contrato existente' },
  { code: 3, label: 'Portabilidade', description: 'Trazer contrato de outro banco' },
  { code: 4, label: 'Port + Refin', description: 'Portabilidade com refinanciamento' },
];

const UF_OPTIONS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export function DigitacaoWizard({ isOpen, onClose, client, contracts }: DigitacaoWizardProps) {
  const api = useJoinBankAPI();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Operation type
  const [operationType, setOperationType] = useState(1);

  // Step 2: Client data (pre-filled, all editable)
  const [clientData, setClientData] = useState({
    name: '',
    identity: '',
    benefit: '',
    benefitState: '',
    benefitStartDate: '',
    benefitPaymentMethod: 1,
    benefitType: 42,
    birthDate: '',
    motherName: '',
    maritalStatus: 'Solteiro',
    sex: 'Masculino',
    income: 0,
    phone: '',
    email: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    zipCode: '',
    docNumber: '',
    docIssuingDate: '',
    docIssuingEntity: 'SSP',
    docIssuingState: '',
  });

  // Step 3: Operation data
  const [rules, setRules] = useState<any[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [term, setTerm] = useState(84);
  const [rate, setRate] = useState(1.66);
  const [installmentValue, setInstallmentValue] = useState(0);
  const [loanValue, setLoanValue] = useState(0);
  const [hasInsurance, setHasInsurance] = useState(false);
  // Portability/Refin fields
  const [selectedContractId, setSelectedContractId] = useState('');
  const [originLenderCode, setOriginLenderCode] = useState('');
  const [originContractNumber, setOriginContractNumber] = useState('');
  const [originTerm, setOriginTerm] = useState(84);
  const [originInstallmentsRemaining, setOriginInstallmentsRemaining] = useState(0);
  const [originInstallmentValue, setOriginInstallmentValue] = useState(0);
  const [originDueBalance, setOriginDueBalance] = useState(0);
  // Bank account
  const [bankCode, setBankCode] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [bankDigit, setBankDigit] = useState('');

  // Step 4: Calculation result
  const [calcResult, setCalcResult] = useState<any>(null);

  // Pre-fill client data
  useEffect(() => {
    if (client && isOpen) {
      setClientData({
        name: client.nome || '',
        identity: client.cpf || '',
        benefit: client.nb || '',
        benefitState: client.uf || 'SP',
        benefitStartDate: client.dib || '',
        benefitPaymentMethod: client.meio_pagto === 'CC' || client.meio_pagto === '2' ? 2 : 1,
        benefitType: client.esp ? parseInt(client.esp) || 42 : 42,
        birthDate: client.data_nascimento || '',
        motherName: client.nome_mae || '',
        maritalStatus: 'Solteiro',
        sex: client.sexo === 'F' ? 'Feminino' : 'Masculino',
        income: client.mr || 0,
        phone: client.tel_cel_1 || '',
        email: client.email_1 || '',
        street: client.endereco || client.logr_nome_1 || '',
        number: client.logr_numero_1 || '',
        complement: client.logr_complemento_1 || '',
        district: client.bairro || client.bairro_1 || '',
        city: client.municipio || client.cidade_1 || '',
        state: client.uf || client.uf_1 || '',
        zipCode: client.cep || client.cep_1 || '',
        docNumber: '',
        docIssuingDate: '',
        docIssuingEntity: 'SSP',
        docIssuingState: client.uf || 'SP',
      });
      setBankCode(client.banco_pagto || '');
      setBankBranch(client.agencia_pagto || '');
      setBankNumber(client.conta_corrente || '');
    }
  }, [client, isOpen]);

  // Load rules when operation type changes
  useEffect(() => {
    if (isOpen && operationType) {
      api.listRules(operationType).then(data => {
        if (data?.items || Array.isArray(data)) {
          setRules(data?.items || data);
        }
      });
    }
  }, [operationType, isOpen]);

  // Auto-fill origin contract
  useEffect(() => {
    if (selectedContractId && contracts.length > 0) {
      const contract = contracts.find(c => c.id === selectedContractId);
      if (contract) {
        setOriginLenderCode(contract.banco_emprestimo || '');
        setOriginContractNumber(contract.contrato || '');
        setOriginTerm(contract.prazo || 84);
        setOriginInstallmentsRemaining(contract.prazo || 0);
        setOriginInstallmentValue(contract.vl_parcela || 0);
        setOriginDueBalance(contract.saldo || 0);
      }
    }
  }, [selectedContractId, contracts]);

  const needsOriginContract = operationType >= 2;

  const handleCalculate = async () => {
    const payload: any = {
      ruleId: selectedRuleId,
      hasInsurance,
      term,
      rate,
      referenceCode: null,
    };
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

    const result = await api.calculate(payload);
    if (result) {
      setCalcResult(result);
      toast.success('Cálculo realizado com sucesso!');
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
          street: clientData.street,
          number: clientData.number || 'S/N',
          complement: clientData.complement,
          district: clientData.district,
          city: clientData.city,
          state: clientData.state,
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
        ruleId: selectedRuleId,
        term,
        rate,
        hasInsurance,
        referenceCode: null,
      };
      if (installmentValue > 0) item.installmentValue = installmentValue;
      if (loanValue > 0) item.loanValue = loanValue;

      if (needsOriginContract) {
        item.originContract = {
          lenderCode: parseInt(originLenderCode) || 0,
          contractNumber: originContractNumber,
          term: originTerm,
          installmentsRemaining: originInstallmentsRemaining,
          installmentValue: originInstallmentValue,
          dueBalanceValue: originDueBalance,
        };
      }

      const requestPayload = {
        borrower,
        items: [item],
        creditBankAccount: {
          bank: bankCode,
          branch: bankBranch,
          number: bankNumber,
          digit: bankDigit,
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
          operation_type: OPERATION_TYPES.find(o => o.code === operationType)?.label || 'Novo',
          status: 'enviada',
          api_response: result,
          request_payload: requestPayload,
        });

        toast.success('Proposta enviada com sucesso!');
        onClose();
      }
    } catch (err: any) {
      toast.error('Erro ao enviar proposta: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setClientData(prev => ({ ...prev, [field]: value }));
  };

  const steps = [
    { id: 'operation', title: 'Operação' },
    { id: 'client', title: 'Cliente' },
    { id: 'operation-data', title: 'Dados' },
    { id: 'calculator', title: 'Cálculo' },
    { id: 'confirm', title: 'Enviar' },
  ];

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: return !!operationType;
      case 1: return !!clientData.name && !!clientData.identity && !!clientData.benefit;
      case 2: return !!selectedRuleId && term > 0;
      case 3: return true;
      case 4: return true;
      default: return true;
    }
  }, [currentStep, operationType, clientData, selectedRuleId, term]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Digitação de Contrato
            <Badge variant="secondary" className="text-xs">API Bancária</Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6">
          <FormWizard
            steps={steps}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            onComplete={handleSubmit}
            isSubmitting={isSubmitting}
            canProceed={canProceed}
            completeText="Enviar Proposta"
            showNavigation={currentStep < 4}
          >
            {/* Step 1: Operation Type */}
            <StepContent>
              <p className="text-sm text-muted-foreground mb-4">Selecione o tipo de operação INSS:</p>
              <div className="grid gap-3">
                {OPERATION_TYPES.map(op => (
                  <Card
                    key={op.code}
                    className={cn(
                      'cursor-pointer transition-all',
                      operationType === op.code ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'
                    )}
                    onClick={() => setOperationType(op.code)}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                        operationType === op.code ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}>
                        {op.code}
                      </div>
                      <div>
                        <p className="font-semibold">{op.label}</p>
                        <p className="text-xs text-muted-foreground">{op.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </StepContent>

            {/* Step 2: Client Data */}
            <StepContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label>Nome</Label>
                  <Input value={clientData.name} onChange={e => updateField('name', e.target.value)} />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input value={clientData.identity} onChange={e => updateField('identity', e.target.value)} />
                </div>
                <div>
                  <Label>Nº Benefício (NB)</Label>
                  <Input value={clientData.benefit} onChange={e => updateField('benefit', e.target.value)} />
                </div>
                <div>
                  <Label>Data Nascimento</Label>
                  <Input type="date" value={clientData.birthDate} onChange={e => updateField('birthDate', e.target.value)} />
                </div>
                <div>
                  <Label>Nome da Mãe</Label>
                  <Input value={clientData.motherName} onChange={e => updateField('motherName', e.target.value)} />
                </div>
                <div>
                  <Label>Sexo</Label>
                  <Select value={clientData.sex} onValueChange={v => updateField('sex', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estado Civil</Label>
                  <Select value={clientData.maritalStatus} onValueChange={v => updateField('maritalStatus', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solteiro">Solteiro</SelectItem>
                      <SelectItem value="Casado">Casado</SelectItem>
                      <SelectItem value="Divorciado">Divorciado</SelectItem>
                      <SelectItem value="Viúvo">Viúvo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Renda (R$)</Label>
                  <Input type="number" step="0.01" value={clientData.income} onChange={e => updateField('income', parseFloat(e.target.value) || 0)} />
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input value={clientData.phone} onChange={e => updateField('phone', e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={clientData.email} onChange={e => updateField('email', e.target.value)} />
                </div>
                <div>
                  <Label>Espécie Benefício</Label>
                  <Input type="number" value={clientData.benefitType} onChange={e => updateField('benefitType', parseInt(e.target.value) || 42)} />
                </div>
                <div>
                  <Label>UF Benefício</Label>
                  <Select value={clientData.benefitState} onValueChange={v => updateField('benefitState', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UF_OPTIONS.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Início Benefício</Label>
                  <Input type="date" value={clientData.benefitStartDate} onChange={e => updateField('benefitStartDate', e.target.value)} />
                </div>
                <div>
                  <Label>Meio Pagamento</Label>
                  <Select value={String(clientData.benefitPaymentMethod)} onValueChange={v => updateField('benefitPaymentMethod', parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Cartão Magnético</SelectItem>
                      <SelectItem value="2">Conta Corrente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="sm:col-span-2 my-2" />
                <p className="sm:col-span-2 text-sm font-semibold text-muted-foreground">Endereço</p>
                
                <div className="sm:col-span-2">
                  <Label>Rua</Label>
                  <Input value={clientData.street} onChange={e => updateField('street', e.target.value)} />
                </div>
                <div>
                  <Label>Número</Label>
                  <Input value={clientData.number} onChange={e => updateField('number', e.target.value)} />
                </div>
                <div>
                  <Label>Complemento</Label>
                  <Input value={clientData.complement} onChange={e => updateField('complement', e.target.value)} />
                </div>
                <div>
                  <Label>Bairro</Label>
                  <Input value={clientData.district} onChange={e => updateField('district', e.target.value)} />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={clientData.city} onChange={e => updateField('city', e.target.value)} />
                </div>
                <div>
                  <Label>UF</Label>
                  <Select value={clientData.state} onValueChange={v => updateField('state', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UF_OPTIONS.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>CEP</Label>
                  <Input value={clientData.zipCode} onChange={e => updateField('zipCode', e.target.value)} />
                </div>

                <Separator className="sm:col-span-2 my-2" />
                <p className="sm:col-span-2 text-sm font-semibold text-muted-foreground">Documento (RG)</p>

                <div>
                  <Label>Número RG</Label>
                  <Input value={clientData.docNumber} onChange={e => updateField('docNumber', e.target.value)} />
                </div>
                <div>
                  <Label>Data Emissão</Label>
                  <Input type="date" value={clientData.docIssuingDate} onChange={e => updateField('docIssuingDate', e.target.value)} />
                </div>
                <div>
                  <Label>Órgão Emissor</Label>
                  <Input value={clientData.docIssuingEntity} onChange={e => updateField('docIssuingEntity', e.target.value)} />
                </div>
                <div>
                  <Label>UF Emissão</Label>
                  <Select value={clientData.docIssuingState} onValueChange={v => updateField('docIssuingState', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UF_OPTIONS.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </StepContent>

            {/* Step 3: Operation Data */}
            <StepContent>
              <div className="space-y-4">
                <div>
                  <Label>Tabela (Rule ID)</Label>
                  {rules.length > 0 ? (
                    <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
                      <SelectTrigger><SelectValue placeholder="Selecione a tabela" /></SelectTrigger>
                      <SelectContent>
                        {rules.map((rule: any, idx: number) => (
                          <SelectItem key={rule.id || idx} value={rule.id || ''}>
                            {rule.name || rule.product?.name || `Tabela ${idx + 1}`} — {rule.lender?.name || ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                      {api.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                      {api.loading ? 'Carregando tabelas...' : 'Nenhuma tabela disponível para esta operação'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Prazo (meses)</Label>
                    <Input type="number" value={term} onChange={e => setTerm(parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label>Taxa (%)</Label>
                    <Input type="number" step="0.01" value={rate} onChange={e => setRate(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label>Valor Parcela (R$)</Label>
                    <Input type="number" step="0.01" value={installmentValue || ''} onChange={e => setInstallmentValue(parseFloat(e.target.value) || 0)} placeholder="Opcional" />
                  </div>
                  <div>
                    <Label>Valor Empréstimo (R$)</Label>
                    <Input type="number" step="0.01" value={loanValue || ''} onChange={e => setLoanValue(parseFloat(e.target.value) || 0)} placeholder="Opcional" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={hasInsurance} onCheckedChange={setHasInsurance} />
                  <Label>Incluir Seguro</Label>
                </div>

                {needsOriginContract && (
                  <>
                    <Separator />
                    <p className="text-sm font-semibold text-muted-foreground">Contrato de Origem</p>

                    {contracts.length > 0 && (
                      <div>
                        <Label>Selecionar contrato existente</Label>
                        <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                          <SelectTrigger><SelectValue placeholder="Preencher manualmente ou selecionar" /></SelectTrigger>
                          <SelectContent>
                            {contracts.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.banco_emprestimo} — {c.contrato} — R${c.vl_parcela?.toFixed(2)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Cód. Banco Origem</Label>
                        <Input value={originLenderCode} onChange={e => setOriginLenderCode(e.target.value)} />
                      </div>
                      <div>
                        <Label>Nº Contrato</Label>
                        <Input value={originContractNumber} onChange={e => setOriginContractNumber(e.target.value)} />
                      </div>
                      <div>
                        <Label>Prazo Original</Label>
                        <Input type="number" value={originTerm} onChange={e => setOriginTerm(parseInt(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label>Parcelas Restantes</Label>
                        <Input type="number" value={originInstallmentsRemaining} onChange={e => setOriginInstallmentsRemaining(parseInt(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label>Valor Parcela (R$)</Label>
                        <Input type="number" step="0.01" value={originInstallmentValue} onChange={e => setOriginInstallmentValue(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label>Saldo Devedor (R$)</Label>
                        <Input type="number" step="0.01" value={originDueBalance} onChange={e => setOriginDueBalance(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                <p className="text-sm font-semibold text-muted-foreground">Conta Bancária para Crédito</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Banco</Label>
                    <Input value={bankCode} onChange={e => setBankCode(e.target.value)} placeholder="001" />
                  </div>
                  <div>
                    <Label>Agência</Label>
                    <Input value={bankBranch} onChange={e => setBankBranch(e.target.value)} />
                  </div>
                  <div>
                    <Label>Conta</Label>
                    <Input value={bankNumber} onChange={e => setBankNumber(e.target.value)} />
                  </div>
                  <div>
                    <Label>Dígito</Label>
                    <Input value={bankDigit} onChange={e => setBankDigit(e.target.value)} maxLength={1} />
                  </div>
                </div>
              </div>
            </StepContent>

            {/* Step 4: Calculator */}
            <StepContent>
              <div className="space-y-4">
                <Button onClick={handleCalculate} disabled={api.loading || !selectedRuleId} className="w-full gap-2">
                  {api.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                  Calcular Simulação
                </Button>

                {calcResult && (
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        Resultado da Simulação
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-background p-3 rounded-lg overflow-auto max-h-60">
                        {JSON.stringify(calcResult, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}

                {!calcResult && !api.loading && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    <Calculator className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>Clique em "Calcular" para ver a simulação</p>
                    <p className="text-xs mt-1">Este passo é opcional — você pode enviar direto</p>
                  </div>
                )}
              </div>
            </StepContent>

            {/* Step 5: Confirmation */}
            <StepContent>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Resumo da Proposta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Cliente:</span>
                      <p className="font-medium">{clientData.name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CPF:</span>
                      <p className="font-medium">{clientData.identity}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Operação:</span>
                      <p className="font-medium">{OPERATION_TYPES.find(o => o.code === operationType)?.label}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Prazo:</span>
                      <p className="font-medium">{term} meses</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Taxa:</span>
                      <p className="font-medium">{rate}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Seguro:</span>
                      <p className="font-medium">{hasInsurance ? 'Sim' : 'Não'}</p>
                    </div>
                    {installmentValue > 0 && (
                      <div>
                        <span className="text-muted-foreground">Parcela:</span>
                        <p className="font-medium">R$ {installmentValue.toFixed(2)}</p>
                      </div>
                    )}
                    {loanValue > 0 && (
                      <div>
                        <span className="text-muted-foreground">Valor:</span>
                        <p className="font-medium">R$ {loanValue.toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Enviar Proposta para o Banco</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </StepContent>
          </FormWizard>
        </div>
      </SheetContent>
    </Sheet>
  );
}
