// Types for the Sales Wizard module

export interface SalesWizardData {
  // Step 1: Client Data
  cpf: string;
  nome: string;
  telefone: string;
  
  // Step 2: Product
  tipo_operacao: "Portabilidade" | "Novo empréstimo" | "Refinanciamento" | "Cartão";
  
  // Step 3: Values (for non-portability products)
  banco: string;
  parcela: number;
  troco?: number;
  saldo_devedor?: number;
  
  // Step 3b: Portabilidade - Contrato Atual (Credora Original)
  credora_original?: string;        // Campo aberto - texto livre
  parcela_atual?: number;
  saldo_devedor_atual?: number;
  prazo_restante?: number;
  
  // Step 3b: Portabilidade - Novo Banco (Proponente)
  banco_proponente?: string;        // Select do banco de dados
  
  // Step 4: Confirmation
  observacao?: string;
  data_venda: string;
}

export interface ClientSearchResult {
  found: boolean;
  nome?: string;
  telefone?: string;
  lastOperation?: {
    banco: string;
    tipo_operacao: string;
    data: string;
  };
}

export interface ProductOption {
  value: string;
  label: string;
  icon: string;
  description: string;
  requiresSaldoDevedor: boolean;
  color: string;
}

export const PRODUCT_OPTIONS: ProductOption[] = [
  {
    value: "Novo empréstimo",
    label: "Novo Empréstimo",
    icon: "💰",
    description: "Cliente quer um novo empréstimo consignado",
    requiresSaldoDevedor: false,
    color: "bg-green-500/10 border-green-300 text-green-700"
  },
  {
    value: "Portabilidade",
    label: "Portabilidade",
    icon: "🔄",
    description: "Trazer contrato de outro banco",
    requiresSaldoDevedor: true,
    color: "bg-blue-500/10 border-blue-300 text-blue-700"
  },
  {
    value: "Refinanciamento",
    label: "Refinanciamento",
    icon: "🔁",
    description: "Renegociar contrato existente",
    requiresSaldoDevedor: true,
    color: "bg-orange-500/10 border-orange-300 text-orange-700"
  },
  {
    value: "Cartão",
    label: "Cartão Consignado",
    icon: "💳",
    description: "Cartão com desconto em folha",
    requiresSaldoDevedor: false,
    color: "bg-purple-500/10 border-purple-300 text-purple-700"
  }
];

export interface WizardStepProps {
  data: Partial<SalesWizardData>;
  onUpdate: (updates: Partial<SalesWizardData>) => void;
  onValidChange: (isValid: boolean) => void;
  moduloOrigem?: string;
}

export interface TelevendasBank {
  id: string;
  name: string;
  code?: string;
}
