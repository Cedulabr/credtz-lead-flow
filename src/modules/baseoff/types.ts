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

export interface BaseOffClient {
  id: string;
  nb: string;
  cpf: string;
  nome: string;
  data_nascimento: string | null;
  sexo: string | null;
  nome_mae: string | null;
  esp: string | null;
  mr: number | null;
  banco_pagto: string | null;
  status_beneficio: string | null;
  municipio: string | null;
  uf: string | null;
  tel_cel_1: string | null;
  tel_cel_2: string | null;
  tel_fixo_1: string | null;
  email_1: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  total_contracts?: number;
  status?: ClientStatus;
  last_action?: string;
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
