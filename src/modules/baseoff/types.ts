// Types for BaseOff Module

export type ClientStatus = 'simulado' | 'em_analise' | 'ativo' | 'finalizado' | 'vencendo';

export const STATUS_CONFIG: Record<ClientStatus, { label: string; emoji: string; color: string }> = {
  simulado: { label: 'Simulado', emoji: '🟡', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  em_analise: { label: 'Em Análise', emoji: '🔵', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  ativo: { label: 'Ativo', emoji: '🟢', color: 'bg-green-100 text-green-800 border-green-200' },
  finalizado: { label: 'Finalizado', emoji: '🔴', color: 'bg-red-100 text-red-800 border-red-200' },
  vencendo: { label: 'Vencendo', emoji: '⚠️', color: 'bg-violet-100 text-violet-800 border-violet-200' },
};

export type ImportType = 'contratos' | 'simulacoes' | 'ativos';

export const IMPORT_TYPE_CONFIG: Record<ImportType, { label: string; emoji: string }> = {
  contratos: { label: 'Contratos', emoji: '📄' },
  simulacoes: { label: 'Simulações', emoji: '📊' },
  ativos: { label: 'Ativos', emoji: '🔄' },
};

export type ImportStatus = 'uploaded' | 'processing' | 'paused' | 'completed' | 'failed' | 'chunk_completed';

export interface ImportJob {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string | null;
  file_size_bytes: number;
  module: string;
  status: ImportStatus;
  total_rows: number | null;
  processed_rows: number | null;
  success_count: number | null;
  error_count: number | null;
  duplicate_count: number | null;
  current_chunk: number | null;
  error_log: any;
  metadata: any;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  last_processed_offset: number | null;
  chunk_metadata: any;
  processing_started_at: string | null;
  processing_ended_at: string | null;
}

// Inline contract returned by external API
export interface BaseOffInlineContract {
  banco_emprestimo?: string;
  contrato: string;
  vl_emprestimo?: number | null;
  inicio_desconto?: string | null;
  prazo?: number | string | null;
  vl_parcela?: number | string | null;
  valor_parcela?: number | string | null;
  tipo_emprestimo?: string | null;
  data_averbacao?: string | null;
  situacao_emprestimo?: string | null;
  competencia?: string | null;
  competencia_final?: string | null;
  taxa?: number | string | null;
  saldo?: number | string | null;
}

// Credit opportunities calculated by external API
export interface BaseOffCreditOpportunities {
  margem_livre: number | null;
  margem_35: number | null;
  margem_cartao: number | null;
  cartao_beneficio: number | null;
  total_parcelas: number | null;
  total_saldo: number | null;
  contratos_ativos: number | null;
}

export interface BaseOffClient {
  id: string;
  nb: string;
  cpf: string;
  nome: string;
  // Dados pessoais
  data_nascimento: string | null;
  sexo: string | null;
  nome_mae: string | null;
  nome_pai: string | null;
  naturalidade: string | null;
  // Benefício
  esp: string | null;
  dib: string | null;
  ddb: string | null;
  mr: number | null;
  status_beneficio: string | null;
  bloqueio: string | null;
  pensao_alimenticia: string | null;
  representante: string | null;
  // Dados bancários
  banco_pagto: string | null;
  agencia_pagto: string | null;
  orgao_pagador: string | null;
  conta_corrente: string | null;
  meio_pagto: string | null;
  // RMC / RCC
  banco_rmc: string | null;
  valor_rmc: number | null;
  banco_rcc: string | null;
  valor_rcc: number | null;
  // Endereço principal
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  endereco: string | null;
  // Endereço secundário
  logr_tipo_1: string | null;
  logr_titulo_1: string | null;
  logr_nome_1: string | null;
  logr_numero_1: string | null;
  logr_complemento_1: string | null;
  bairro_1: string | null;
  cidade_1: string | null;
  uf_1: string | null;
  cep_1: string | null;
  // Telefones
  tel_cel_1: string | null;
  tel_cel_2: string | null;
  tel_cel_3: string | null;
  tel_fixo_1: string | null;
  tel_fixo_2: string | null;
  tel_fixo_3: string | null;
  // Emails
  email_1: string | null;
  email_2: string | null;
  email_3: string | null;
  // Timestamps
  created_at: string;
  updated_at: string;
  // Computed / inline fields
  total_contracts?: number;
  status?: ClientStatus;
  last_action?: string;
  contracts?: BaseOffInlineContract[];
  credit_opportunities?: BaseOffCreditOpportunities | null;
}

export interface BaseOffContract {
  id: string;
  client_id: string;
  cpf: string;
  banco_emprestimo: string;
  contrato: string;
  vl_emprestimo: number | null;
  inicio_desconto: string | null;
  prazo: number | null;
  vl_parcela: number | null;
  tipo_emprestimo: string | null;
  data_averbacao: string | null;
  situacao_emprestimo: string | null;
  competencia: string | null;
  competencia_final: string | null;
  taxa: number | null;
  saldo: number | null;
  created_at: string;
  updated_at: string;
}

export interface TimelineEvent {
  id: string;
  type: 'contrato' | 'simulacao' | 'refinanciamento' | 'contato' | 'vencimento';
  title: string;
  description: string;
  date: string;
  metadata?: Record<string, any>;
}

export interface BaseOffFilters {
  period: string;
  month: string;
  status: string;
  cliente: string;
  tipo: string;
  telefone: string;
  uf: string;
  banco: string;
}

export const DEFAULT_FILTERS: BaseOffFilters = {
  period: 'all',
  month: 'all',
  status: 'all',
  cliente: '',
  tipo: 'all',
  telefone: '',
  uf: 'all',
  banco: 'all',
};

export interface DashboardStats {
  totalClientes: number;
  ativos: number;
  simulados: number;
  vencendo: number;
}
