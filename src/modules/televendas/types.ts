// Types for the Televendas module

export interface User {
  id: string;
  name: string;
}

export interface Televenda {
  id: string;
  nome: string;
  cpf: string;
  data_venda: string;
  telefone: string;
  banco: string;
  parcela: number;
  troco: number | null;
  saldo_devedor: number | null;
  tipo_operacao: string;
  observacao: string | null;
  status: string;
  created_at: string;
  company_id: string | null;
  user_id: string;
  user?: { name: string } | null;
}

export interface StatusHistoryItem {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by: string;
  changed_by_name?: string;
}

export interface TelevendasFilters {
  search: string;
  status: string;
  userId: string;
  period: string;
  month: string;
  product: string;
}

// Status Workflow Configuration
export const OPERATOR_STATUSES = [
  "digitada",
  "enviada",
  "em_analise",
  "pendente",
  "pago_aguardando",
  "cancelado_aguardando",
] as const;

export const MANAGER_STATUSES = [
  "pago_aprovado",
  "cancelado_confirmado",
  "devolvido",
] as const;

export const ALL_STATUSES = [...OPERATOR_STATUSES, ...MANAGER_STATUSES] as const;

// Legacy status mapping for backwards compatibility
export const LEGACY_STATUS_MAP: Record<string, string> = {
  "proposta_digitada": "digitada",
  "solicitado_digitacao": "digitada",
  "pago": "pago_aprovado",
  "cancelado": "cancelado_confirmado",
};

// Status display configuration
export const STATUS_CONFIG: Record<string, {
  label: string;
  shortLabel: string;
  emoji: string;
  color: string;
  bgColor: string;
  isOperational: boolean;
  isFinal: boolean;
}> = {
  // Operacionais
  digitada: {
    label: "Digitada",
    shortLabel: "Digitada",
    emoji: "📝",
    color: "text-purple-600",
    bgColor: "bg-purple-500/10 border-purple-300",
    isOperational: true,
    isFinal: false,
  },
  enviada: {
    label: "Enviada",
    shortLabel: "Enviada",
    emoji: "📤",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 border-blue-300",
    isOperational: true,
    isFinal: false,
  },
  em_analise: {
    label: "Em Análise",
    shortLabel: "Análise",
    emoji: "⏳",
    color: "text-cyan-600",
    bgColor: "bg-cyan-500/10 border-cyan-300",
    isOperational: true,
    isFinal: false,
  },
  pendente: {
    label: "Pendente",
    shortLabel: "Pendente",
    emoji: "⚠️",
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10 border-yellow-300",
    isOperational: true,
    isFinal: false,
  },
  // Aguardando Gestão
  pago_aguardando: {
    label: "Pago (Aguardando)",
    shortLabel: "Aguardando",
    emoji: "💰",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10 border-amber-300",
    isOperational: true,
    isFinal: false,
  },
  cancelado_aguardando: {
    label: "Cancelado (Aguardando)",
    shortLabel: "Cancel. Aguard.",
    emoji: "❌",
    color: "text-orange-600",
    bgColor: "bg-orange-500/10 border-orange-300",
    isOperational: true,
    isFinal: false,
  },
  // Finais (Gestor only)
  pago_aprovado: {
    label: "Pago Aprovado",
    shortLabel: "Aprovado",
    emoji: "✅",
    color: "text-green-600",
    bgColor: "bg-green-500/10 border-green-300",
    isOperational: false,
    isFinal: true,
  },
  cancelado_confirmado: {
    label: "Cancelamento Confirmado",
    shortLabel: "Cancelado",
    emoji: "⛔",
    color: "text-red-600",
    bgColor: "bg-red-500/10 border-red-300",
    isOperational: false,
    isFinal: true,
  },
  devolvido: {
    label: "Devolvido para Operador",
    shortLabel: "Devolvido",
    emoji: "🔄",
    color: "text-sky-600",
    bgColor: "bg-sky-500/10 border-sky-300",
    isOperational: false,
    isFinal: false,
  },
};

export const PRODUCT_OPTIONS = [
  { value: "all", label: "Todos", icon: "📦" },
  { value: "Portabilidade", label: "Portabilidade", icon: "🔄" },
  { value: "Novo empréstimo", label: "Novo Empréstimo", icon: "💰" },
  { value: "Refinanciamento", label: "Refinanciamento", icon: "🔁" },
  { value: "Cartão", label: "Cartão", icon: "💳" },
];

export const PERIOD_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "today", label: "Hoje" },
  { value: "yesterday", label: "Ontem" },
  { value: "7days", label: "7 dias" },
  { value: "30days", label: "30 dias" },
];
