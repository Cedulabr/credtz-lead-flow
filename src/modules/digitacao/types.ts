export interface ClientFormData {
  name: string;
  identity: string;
  benefit: string;
  benefitState: string;
  benefitStartDate: string;
  benefitPaymentMethod: number;
  benefitType: number;
  birthDate: string;
  motherName: string;
  maritalStatus: string;
  sex: string;
  income: number;
  phone: string;
  email: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  zipCode: string;
  docNumber: string;
  docIssuingDate: string;
  docIssuingEntity: string;
  docIssuingState: string;
}

export interface BankAccountData {
  accountType: string;
  bankCode: string;
  bankBranch: string;
  bankNumber: string;
  bankDigit: string;
}

export interface SimulationItem {
  id: string;
  product: string;
  ruleId: string;
  ruleName: string;
  operationType: number;
  // Portabilidade
  originLenderCode: string;
  originLenderName: string;
  originContractNumber: string;
  originRate: number;
  originTerm: number;
  originInstallmentsRemaining: number;
  originInstallmentValue: number;
  originDueBalance: number;
  // Refinanciamento
  refinRate: number;
  refinTerm: number;
  refinInstallmentValue: number;
  refinContractValue: number;
  // Resultado
  changeValue: number;
  iofValue: number;
  firstDueDate: string;
  lastDueDate: string;
  calcResult: any;
  hasInsurance: boolean;
}

export interface Proposal {
  id: string;
  user_id: string;
  client_cpf: string;
  client_name: string;
  simulation_id?: string;
  operation_type: string;
  status: string;
  api_response?: any;
  request_payload?: any;
  company_id?: string;
  created_at: string;
}

export const INITIAL_CLIENT_DATA: ClientFormData = {
  name: '',
  identity: '',
  benefit: '',
  benefitState: 'SP',
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
  docIssuingState: 'SP',
};

export const INITIAL_BANK_DATA: BankAccountData = {
  accountType: 'CC',
  bankCode: '',
  bankBranch: '',
  bankNumber: '',
  bankDigit: '',
};

export const OPERATION_TYPES = [
  { code: 1, label: 'Novo', description: 'Empréstimo novo consignado' },
  { code: 2, label: 'Refinanciamento', description: 'Refinanciar contrato existente' },
  { code: 3, label: 'Portabilidade', description: 'Trazer contrato de outro banco' },
  { code: 4, label: 'Port + Refin', description: 'Portabilidade com refinanciamento' },
];

export const PRODUCT_OPTIONS = [
  { code: 'inss_novo', label: 'INSS - Novo' },
  { code: 'inss_refin', label: 'INSS - Refinanciamento' },
  { code: 'inss_port', label: 'INSS - Portabilidade' },
  { code: 'inss_port_refin', label: 'INSS - Portabilidade + Refinanciamento' },
];

export const UF_OPTIONS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

export const BENEFIT_TYPES = [
  { code: 1, label: 'Aposentadoria por Idade' },
  { code: 4, label: 'Aposentadoria por Invalidez' },
  { code: 21, label: 'Pensão por Morte' },
  { code: 32, label: 'Aposentadoria por Tempo de Contribuição' },
  { code: 41, label: 'Aposentadoria por Idade' },
  { code: 42, label: 'Aposentadoria por Tempo de Contribuição' },
  { code: 87, label: 'Amparo Social ao Idoso' },
  { code: 88, label: 'Amparo Social ao Deficiente' },
];

export const STATUS_MAP: Record<string, { label: string; color: string }> = {
  enviada: { label: 'Enviada', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  pendente: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  aprovada: { label: 'Aprovada', color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  recusada: { label: 'Recusada', color: 'bg-red-500/10 text-red-700 border-red-500/20' },
  cancelada: { label: 'Cancelada', color: 'bg-muted text-muted-foreground border-muted' },
  aguardando_cip: { label: 'Aguardando CIP', color: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
  assinada: { label: 'Assinada', color: 'bg-green-500/10 text-green-700 border-green-500/20' },
};
