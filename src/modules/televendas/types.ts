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
  data_pagamento?: string | null;
  data_cancelamento?: string | null;
  edit_count?: number;
  status_proposta?: string | null;
  status_proposta_updated_at?: string | null;
  motivo_pendencia?: string | null;
  motivo_pendencia_descricao?: string | null;
  previsao_saldo?: string | null;
  status_bancario?: string | null;
  last_sync_at?: string | null;
  last_sync_by?: string | null;
  prioridade_operacional?: string;
  updated_at?: string;
}

export interface EditHistoryItem {
  id: string;
  televendas_id: string;
  edited_by: string;
  edited_at: string;
  original_data: {
    banco?: string;
    parcela?: number;
    troco?: number | null;
    saldo_devedor?: number | null;
  };
  new_data: {
    banco?: string;
    parcela?: number;
    troco?: number | null;
    saldo_devedor?: number | null;
  };
  fields_changed: string[];
  edited_by_name?: string;
}

export interface StatusHistoryItem {
  id: string;
  from_status: string | null;
  to_status: string;
  changed_at: string;
  changed_by: string;
  changed_by_name?: string;
}

export type DateMode = "criacao" | "pagamento";

export interface TelevendasFilters {
  search: string;
  status: string;
  userId: string;
  period: string;
  month: string;
  product: string;
  bank: string;
  dateMode: DateMode;
  companyId: string;
}

// ===========================================
// STATUS WORKFLOW CONFIGURATION
// ===========================================

// Status que o OPERADOR pode definir
export const OPERATOR_STATUSES = [
  "solicitar_digitacao",    // Solicitar Digitação
  "bloqueado",              // Benefício Bloqueado
  "em_andamento",           // Em Andamento
  "pago_aguardando",        // Pago Aguardando Gestor
  "cancelado_aguardando",   // Solicitar Cancelamento (Aguardando Gestor)
] as const;

// Status que apenas o GESTOR pode definir (finais)
export const MANAGER_STATUSES = [
  "proposta_paga",          // Proposta Paga (aprovado pelo gestor)
  "proposta_cancelada",     // Proposta Cancelada
  "exclusao_aprovada",      // Exclusão aprovada pelo gestor
  "exclusao_rejeitada",     // Exclusão rejeitada pelo gestor
  "devolvido",              // Devolvido para operador revisar
] as const;

export const ALL_STATUSES = [...OPERATOR_STATUSES, ...MANAGER_STATUSES] as const;

// Legacy status mapping for backwards compatibility
export const LEGACY_STATUS_MAP: Record<string, string> = {
  "proposta_digitada": "em_andamento",
  "proposta_digitada_old": "em_andamento",
  "solicitado_digitacao": "solicitar_digitacao",
  "pago": "proposta_paga",
  "pago_aprovado": "proposta_paga",
  "cancelado": "proposta_cancelada",
  "cancelado_confirmado": "proposta_cancelada",
  "digitada": "em_andamento",
  "enviada": "em_andamento",
  "em_analise": "proposta_pendente",
  "pendente": "proposta_pendente",
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
  // ===========================================
  // STATUS OPERACIONAIS (Usuário comum)
  // ===========================================
  solicitar_digitacao: {
    label: "Solicitar Digitação",
    shortLabel: "Sol. Digitação",
    emoji: "📝",
    color: "text-purple-600",
    bgColor: "bg-purple-500/10 border-purple-300",
    isOperational: true,
    isFinal: false,
  },
  bloqueado: {
    label: "Benefício Bloqueado",
    shortLabel: "Bloqueado",
    emoji: "🔒",
    color: "text-red-700",
    bgColor: "bg-red-500/10 border-red-300",
    isOperational: true,
    isFinal: false,
  },
  em_andamento: {
    label: "Em Andamento",
    shortLabel: "Em Andamento",
    emoji: "⏳",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 border-blue-300",
    isOperational: true,
    isFinal: false,
  },
  pago_aguardando: {
    label: "Pago Aguardando Gestor",
    shortLabel: "Aguard. Gestor",
    emoji: "💰",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10 border-amber-300",
    isOperational: true,
    isFinal: false,
  },
  cancelado_aguardando: {
    label: "Cancelamento Aguardando Gestor",
    shortLabel: "Aguard. Cancel.",
    emoji: "❌",
    color: "text-red-500",
    bgColor: "bg-red-500/10 border-red-300",
    isOperational: true,
    isFinal: false,
  },
  solicitar_exclusao: {
    label: "Solicitar Exclusão",
    shortLabel: "Sol. Exclusão",
    emoji: "🗑️",
    color: "text-orange-600",
    bgColor: "bg-orange-500/10 border-orange-300",
    isOperational: true,
    isFinal: false,
  },
  proposta_pendente: {
    label: "Proposta Pendente",
    shortLabel: "Pendente",
    emoji: "⏳",
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10 border-yellow-300",
    isOperational: true,
    isFinal: false,
  },

  // ===========================================
  // STATUS DO GESTOR (Finais)
  // ===========================================
  proposta_paga: {
    label: "Proposta Paga",
    shortLabel: "Paga",
    emoji: "✅",
    color: "text-green-600",
    bgColor: "bg-green-500/10 border-green-300",
    isOperational: false,
    isFinal: true,
  },
  proposta_cancelada: {
    label: "Proposta Cancelada",
    shortLabel: "Cancelada",
    emoji: "❌",
    color: "text-red-600",
    bgColor: "bg-red-500/10 border-red-300",
    isOperational: false,
    isFinal: true,
  },
  exclusao_aprovada: {
    label: "Exclusão Aprovada",
    shortLabel: "Excluído",
    emoji: "🗑️",
    color: "text-red-700",
    bgColor: "bg-red-600/10 border-red-400",
    isOperational: false,
    isFinal: true,
  },
  exclusao_rejeitada: {
    label: "Exclusão Rejeitada",
    shortLabel: "Exclusão Neg.",
    emoji: "🚫",
    color: "text-gray-600",
    bgColor: "bg-gray-500/10 border-gray-300",
    isOperational: false,
    isFinal: false,
  },
  devolvido: {
    label: "Devolvido para Revisão",
    shortLabel: "Devolvido",
    emoji: "🔄",
    color: "text-sky-600",
    bgColor: "bg-sky-500/10 border-sky-300",
    isOperational: false,
    isFinal: false,
  },
};

// ===========================================
// STATUS DA PROPOSTA (novo campo separado do workflow)
// ===========================================
export const STATUS_PROPOSTA_OPTIONS = [
  { value: "digitada", label: "Digitada", emoji: "✍️", color: "text-blue-600", bgColor: "bg-blue-500/10 border-blue-300" },
  { value: "aguardando_saldo", label: "Aguardando Saldo", emoji: "💰", color: "text-amber-600", bgColor: "bg-amber-500/10 border-amber-300" },
  { value: "aguardando_aprovacao", label: "Aguardando Aprovação", emoji: "⏳", color: "text-orange-600", bgColor: "bg-orange-500/10 border-orange-300" },
  { value: "aguardando_analise_credito", label: "Aguardando Análise de Crédito", emoji: "🔍", color: "text-purple-600", bgColor: "bg-purple-500/10 border-purple-300" },
  { value: "pendente", label: "Pendente", emoji: "⚠️", color: "text-yellow-600", bgColor: "bg-yellow-500/10 border-yellow-300" },
  { value: "aprovada", label: "Aprovada", emoji: "✅", color: "text-green-600", bgColor: "bg-green-500/10 border-green-300" },
  { value: "cancelada", label: "Cancelada", emoji: "❌", color: "text-red-600", bgColor: "bg-red-500/10 border-red-300" },
] as const;

export const MOTIVO_PENDENCIA_OPTIONS = [
  { value: "nova_selfie", label: "Nova selfie solicitada" },
  { value: "confirmacao_video", label: "Confirmação via vídeo" },
  { value: "documento_ilegivel", label: "Documento ilegível" },
  { value: "dados_divergentes", label: "Dados divergentes" },
  { value: "outros", label: "Outros" },
] as const;

export interface StatusPropostaHistoryItem {
  id: string;
  televendas_id: string;
  from_status: string | null;
  to_status: string;
  changed_by: string;
  changed_at: string;
  reason: string | null;
  changed_by_name?: string;
}

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
