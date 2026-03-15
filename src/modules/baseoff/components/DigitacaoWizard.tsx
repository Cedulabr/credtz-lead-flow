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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Loader2, Send, Calculator, CheckCircle2, AlertCircle, 
  ChevronDown, Copy, FileUp, Search, User, FileText, CreditCard
} from 'lucide-react';
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

// Convert date from DD/MM/YYYY or ISO to YYYY-MM-DD for input[type=date]
const formatDateForInput = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.substring(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [d, m, y] = dateStr.split('/');
    return `${y}-${m}-${d}`;
  }
  return dateStr;
};

export function DigitacaoWizard({ isOpen, onClose, client, contracts }: DigitacaoWizardProps) {
  const api = useJoinBankAPI();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAdditionalData, setShowAdditionalData] = useState(false);

  // Step 1: IN100 + Client basic data
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

  // IN100
  const [in100Loading, setIn100Loading] = useState(false);
  const [in100Result, setIn100Result] = useState<any>(null);

  // Step 2: Simulation
  const [operationType, setOperationType] = useState(1);
  const [rules, setRules] = useState<any[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState('');
  const [term, setTerm] = useState(84);
  const [rate, setRate] = useState(1.66);
  const [installmentValue, setInstallmentValue] = useState(0);
  const [loanValue, setLoanValue] = useState(0);
  const [hasInsurance, setHasInsurance] = useState(false);
  // Port/Refin
  const [selectedContractId, setSelectedContractId] = useState('');
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
  // Calc result
  const [calcResult, setCalcResult] = useState<any>(null);

  // Step 3: Documents
  const [docFrontFile, setDocFrontFile] = useState<File | null>(null);
  const [docBackFile, setDocBackFile] = useState<File | null>(null);

  // Step 4: Bank account
  const [bankCode, setBankCode] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [bankDigit, setBankDigit] = useState('');

  // Pre-fill client data
  useEffect(() => {
    if (client && isOpen) {
      setClientData({
        name: client.nome || '',
        identity: client.cpf || '',
        benefit: client.nb || '',
        benefitState: client.uf || 'SP',
        benefitStartDate: formatDateForInput(client.ddb || client.dib),
        benefitPaymentMethod: client.meio_pagto === 'CC' || client.meio_pagto === '2' ? 2 : 1,
        benefitType: client.esp ? parseInt(client.esp) || 42 : 42,
        birthDate: formatDateForInput(client.data_nascimento),
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
      setCurrentStep(0);
      setCalcResult(null);
      setIn100Result(null);
    }
  }, [client, isOpen]);

  // Load rules when operation type changes
  useEffect(() => {
    if (isOpen && operationType) {
      setSelectedRuleId('');
      setRules([]);
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
  const isPortRefin = operationType === 4;

  const handleIN100 = async () => {
    if (!clientData.identity || !clientData.benefit) {
      toast.error('CPF e Nº Benefício são obrigatórios para consulta IN100');
      return;
    }
    setIn100Loading(true);
    try {
      const result = await api.queryIN100(clientData.identity, clientData.benefit);
      if (result) {
        setIn100Result(result);
        toast.success('Consulta IN100 realizada com sucesso!');
      }
    } finally {
      setIn100Loading(false);
    }
  };

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

    if (isPortRefin) {
      payload.refinancing = {
        term: refinTerm,
        rate: refinRate,
        installmentValue: refinInstallmentValue,
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

      if (isPortRefin) {
        item.refinancing = {
          term: refinTerm,
          rate: refinRate,
          installmentValue: refinInstallmentValue,
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

  const copyIN100Link = () => {
    const link = `https://app.ajin.io/auth/inss/${clientData.identity}/${clientData.benefit}`;
    navigator.clipboard.writeText(link);
    toast.success('Link IN100 copiado!');
  };

  const steps = [
    { id: 'in100', title: 'IN100', icon: Search },
    { id: 'simulation', title: 'Simulação', icon: Calculator },
    { id: 'documents', title: 'Documentos', icon: FileText },
    { id: 'confirm', title: 'Enviar', icon: Send },
  ];

  const canProceed = useMemo(() => {
    switch (currentStep) {
      case 0: return !!clientData.name && !!clientData.identity && !!clientData.benefit;
      case 1: return !!selectedRuleId && term > 0;
      case 2: return true; // documents optional
      case 3: return true;
      default: return true;
    }
  }, [currentStep, clientData, selectedRuleId, term]);

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
          >
            {/* ===== STEP 1: IN100 + Dados do Cliente ===== */}
            <StepContent>
              <div className="space-y-4">
                {/* IN100 Link */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Search className="w-4 h-4 text-primary" />
                        Autorize o IN100
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyIN100Link}
                        disabled={!clientData.identity || !clientData.benefit}
                        className="gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copiar Link
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Envie o link ao cliente para autorizar a consulta IN100 antes de simular.
                    </p>
                  </CardContent>
                </Card>

                {/* Main fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Label>Nome Completo</Label>
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
                    <Label>Celular</Label>
                    <Input value={clientData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <Label>Data Nascimento</Label>
                    <Input type="date" value={clientData.birthDate} onChange={e => updateField('birthDate', e.target.value)} />
                  </div>
                  <div>
                    <Label>Início Benefício (DDB)</Label>
                    <Input type="date" value={clientData.benefitStartDate} onChange={e => updateField('benefitStartDate', e.target.value)} />
                  </div>
                  <div>
                    <Label>Espécie</Label>
                    <Input type="number" value={clientData.benefitType} onChange={e => updateField('benefitType', parseInt(e.target.value) || 42)} />
                  </div>
                  <div>
                    <Label>Renda (R$)</Label>
                    <Input type="number" step="0.01" value={clientData.income} onChange={e => updateField('income', parseFloat(e.target.value) || 0)} />
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
                </div>

                {/* IN100 Query Button */}
                <Button
                  onClick={handleIN100}
                  disabled={in100Loading || !clientData.identity || !clientData.benefit}
                  variant="outline"
                  className="w-full gap-2"
                >
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

                {/* Collapsible: Additional Data */}
                <Collapsible open={showAdditionalData} onOpenChange={setShowAdditionalData}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between text-muted-foreground" type="button">
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Dados Adicionais (endereço, RG, etc.)
                      </span>
                      <ChevronDown className={cn("w-4 h-4 transition-transform", showAdditionalData && "rotate-180")} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                        <Label>Email</Label>
                        <Input value={clientData.email} onChange={e => updateField('email', e.target.value)} />
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

                      <Separator className="sm:col-span-2 my-1" />
                      <p className="sm:col-span-2 text-xs font-semibold text-muted-foreground">Endereço</p>
                      
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

                      <Separator className="sm:col-span-2 my-1" />
                      <p className="sm:col-span-2 text-xs font-semibold text-muted-foreground">Documento (RG)</p>

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
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </StepContent>

            {/* ===== STEP 2: Simulação ===== */}
            <StepContent>
              <div className="space-y-4">
                {/* Operation Type */}
                <div>
                  <Label>Tipo de Operação</Label>
                  <Select value={String(operationType)} onValueChange={v => setOperationType(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OPERATION_TYPES.map(op => (
                        <SelectItem key={op.code} value={String(op.code)}>
                          {op.label} — {op.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rule / Table */}
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

                {/* Loan params */}
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

                {/* Origin Contract (Port/Refin) */}
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

                {/* Refinancing extra fields (Port+Refin) */}
                {isPortRefin && (
                  <>
                    <Separator />
                    <p className="text-sm font-semibold text-muted-foreground">Dados do Refinanciamento</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Prazo Refin (meses)</Label>
                        <Input type="number" value={refinTerm} onChange={e => setRefinTerm(parseInt(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label>Taxa Refin (%)</Label>
                        <Input type="number" step="0.01" value={refinRate} onChange={e => setRefinRate(parseFloat(e.target.value) || 0)} />
                      </div>
                      <div>
                        <Label>Parcela Refin (R$)</Label>
                        <Input type="number" step="0.01" value={refinInstallmentValue} onChange={e => setRefinInstallmentValue(parseFloat(e.target.value) || 0)} />
                      </div>
                    </div>
                  </>
                )}

                {/* Calculate */}
                <Separator />
                <Button onClick={handleCalculate} disabled={api.loading || !selectedRuleId} className="w-full gap-2">
                  {api.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
                  Simular
                </Button>

                {calcResult && (
                  <Card className="bg-accent/50 border-primary/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        Resultado da Simulação
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {calcResult.installmentValue && (
                          <div>
                            <span className="text-muted-foreground">Parcela:</span>
                            <p className="font-bold text-primary">R$ {Number(calcResult.installmentValue).toFixed(2)}</p>
                          </div>
                        )}
                        {calcResult.loanValue && (
                          <div>
                            <span className="text-muted-foreground">Valor Liberado:</span>
                            <p className="font-bold text-primary">R$ {Number(calcResult.loanValue).toFixed(2)}</p>
                          </div>
                        )}
                        {calcResult.iofValue != null && (
                          <div>
                            <span className="text-muted-foreground">IOF:</span>
                            <p className="font-medium">R$ {Number(calcResult.iofValue).toFixed(2)}</p>
                          </div>
                        )}
                        {calcResult.changeValue != null && (
                          <div>
                            <span className="text-muted-foreground">Troco:</span>
                            <p className="font-bold text-primary">R$ {Number(calcResult.changeValue).toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer">Ver detalhes completos</summary>
                        <pre className="text-xs bg-background p-2 rounded mt-1 overflow-auto max-h-40">
                          {JSON.stringify(calcResult, null, 2)}
                        </pre>
                      </details>
                    </CardContent>
                  </Card>
                )}
              </div>
            </StepContent>

            {/* ===== STEP 3: Documentos ===== */}
            <StepContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Envie a frente e o verso do documento de identidade. Formatos aceitos: PNG, JPEG, PDF, HEIC.
                </p>

                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <FileUp className="w-4 h-4" /> Frente do Documento
                      </Label>
                      <Input
                        type="file"
                        accept="image/*,.pdf,.heic"
                        onChange={e => setDocFrontFile(e.target.files?.[0] || null)}
                      />
                      {docFrontFile && (
                        <p className="text-xs text-green-600 mt-1">✓ {docFrontFile.name}</p>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <FileUp className="w-4 h-4" /> Verso do Documento
                      </Label>
                      <Input
                        type="file"
                        accept="image/*,.pdf,.heic"
                        onChange={e => setDocBackFile(e.target.files?.[0] || null)}
                      />
                      {docBackFile && (
                        <p className="text-xs text-green-600 mt-1">✓ {docBackFile.name}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <p className="text-xs text-muted-foreground text-center">
                  Os documentos são opcionais neste momento e podem ser enviados depois.
                </p>
              </div>
            </StepContent>

            {/* ===== STEP 4: Confirmação + Conta Bancária ===== */}
            <StepContent>
              <div className="space-y-4">
                {/* Summary */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4" /> Resumo da Proposta
                    </CardTitle>
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
                      {calcResult?.loanValue && (
                        <div>
                          <span className="text-muted-foreground">Valor Liberado:</span>
                          <p className="font-bold text-primary">R$ {Number(calcResult.loanValue).toFixed(2)}</p>
                        </div>
                      )}
                      {calcResult?.changeValue != null && Number(calcResult.changeValue) > 0 && (
                        <div>
                          <span className="text-muted-foreground">Troco:</span>
                          <p className="font-bold text-primary">R$ {Number(calcResult.changeValue).toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Bank Account */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Conta Bancária para Crédito
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>

                {/* Submit */}
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
              </div>
            </StepContent>
          </FormWizard>
        </div>
      </SheetContent>
    </Sheet>
  );
}
