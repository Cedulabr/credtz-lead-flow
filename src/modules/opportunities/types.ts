// Types for Opportunities Panel Module

export interface OpportunityContract {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  banco: string;
  tipo_operacao: 'Portabilidade' | 'Refinanciamento' | 'Novo empréstimo';
  status: string;
  data_pagamento: string | null;
  data_venda: string | null;
  parcela: number | null;
  troco: number | null;
  saldo_devedor: number | null;
  user_id: string;
  company_id: string | null;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankReuseRule {
  id: string;
  bank_name: string;
  reuse_months: number;
  is_active: boolean;
}

export interface OpportunityStats {
  totalMonitored: number;
  eligibleNow: number;
  eligibleToday: number;
  eligibleIn3Days: number;
  eligibleIn5Days: number;
  portabilityEligible: number;
  refinancingEligible: number;
}

export interface OpportunityByBank {
  bankName: string;
  ruleMonths: number;
  totalContracts: number;
  eligibleNow: number;
  eligibleSoon: number;
  potentialValue: number;
}

export interface PortabilityBreakdown {
  parcelas9: number;
  parcelas10: number;
  parcelas11: number;
  parcelas12Plus: number;
  reachingIn5Days: number;
}

export type OpportunityPriority = 'high' | 'medium' | 'low';
export type OpportunityType = 'portability' | 'refinancing';

export interface OpportunityClient {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  banco: string;
  tipo_operacao: string;
  parcelasPagas: number;
  parcelasRestantes: number;
  dataElegibilidade: Date;
  diasParaElegibilidade: number;
  valorPotencial: number | null;
  priority: OpportunityPriority;
  isPriorized?: boolean;
  assignedTo?: string;
  status: 'eligible' | 'soon' | 'monitoring';
}

export interface OpportunityFilter {
  type: 'all' | 'portability' | 'refinancing';
  bank: string;
  status: 'all' | 'eligible' | 'soon' | 'monitoring';
  priority: 'all' | 'high' | 'medium' | 'low';
  search: string;
}

export const DEFAULT_FILTERS: OpportunityFilter = {
  type: 'all',
  bank: 'all',
  status: 'all',
  priority: 'all',
  search: '',
};

// Portabilidade: sempre 12 parcelas
export const PORTABILITY_MIN_PARCELAS = 12;
