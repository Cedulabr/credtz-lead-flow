export interface RadarFilters {
  uf?: string;
  cidade?: string;
  banco_emprestimo?: string;
  parcelas_pagas_min?: number;
  qtd_contratos_min?: number;
  valor_parcela_min?: number;
  saldo_min?: number;
  esp_filter?: string;
  ddb_range?: string;
  representante?: string;
  smart_filter?: string;
}

export interface RadarClient {
  cpf: string;
  nome: string;
  uf: string;
  municipio: string;
  esp: string;
  idade: number | null;
  banco_principal: string;
  max_parcela: number;
  max_saldo: number;
  max_prazo: number;
  total_contratos: number;
  opportunity_score: number;
  classification: 'Premium' | 'Alta' | 'Média' | 'Baixa';
}

export interface RadarSearchResult {
  clients: RadarClient[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface RadarStats {
  alta_rentabilidade: number;
  refinanciamento_forte: number;
  parcelas_altas: number;
  muitos_contratos: number;
}

export interface RadarCredits {
  id: string;
  user_id: string;
  credits_balance: number;
  monthly_limit: number;
  credits_used_month: number;
  current_month: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: RadarFilters;
  created_at: string;
}

export const SMART_FILTER_PRESETS = [
  { id: 'alta_rentabilidade', label: '🔥 Alta Rentabilidade Portabilidade', icon: '💰', description: 'Parcela ≥ 400 ou saldo ≥ 5000' },
  { id: 'parcelas_altas', label: '💰 Parcelas Altas', icon: '💰', description: 'Parcela ≥ 600' },
  { id: 'contratos_antigos', label: '📈 Contratos Antigos', icon: '📈', description: 'Prazo ≥ 24 parcelas' },
  { id: 'refinanciamento_forte', label: '⚡ Refinanciamento Forte', icon: '⚡', description: 'Prazo ≥ 36 parcelas' },
  { id: 'muitos_contratos', label: '🎯 Muitos Contratos', icon: '🎯', description: '6+ contratos' },
] as const;

export const ESP_FILTER_OPTIONS = [
  { value: 'consignaveis_exceto_32_92', label: 'Consignáveis, exceto 32 e 92' },
  { value: 'consignaveis_exceto_32_92_21_01', label: 'Consignáveis, exceto 32, 92, 21 e 01' },
  { value: 'consignaveis_exceto_loas', label: 'Consignáveis, exceto LOAS' },
  { value: 'consignaveis_exceto_32_92_21_01_loas', label: 'Consignáveis, exceto 32, 92, 21, 01 e LOAS' },
] as const;

export const PARCELAS_PAGAS_OPTIONS = [
  { value: 0, label: 'Todas' },
  { value: 12, label: '12+ parcelas' },
  { value: 24, label: '24+ parcelas' },
  { value: 36, label: '36+ parcelas' },
] as const;

export const QTD_CONTRATOS_OPTIONS = [
  { value: 0, label: 'Todos' },
  { value: 1, label: '1-2 contratos', max: 2 },
  { value: 3, label: '3-5 contratos', max: 5 },
  { value: 6, label: '6+ contratos' },
] as const;

export const VALOR_PARCELA_OPTIONS = [
  { value: 0, label: 'Todas' },
  { value: 400, label: 'R$ 400+' },
  { value: 600, label: 'R$ 600+' },
  { value: 800, label: 'R$ 800+' },
  { value: 1000, label: 'R$ 1.000+' },
] as const;

export const DDB_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'ate_1_ano', label: 'Até 1 ano' },
  { value: '1_5_anos', label: '1-5 anos' },
  { value: '5_mais', label: '5+ anos' },
] as const;
