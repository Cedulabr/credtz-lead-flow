export interface LeadRequestData {
  // Etapa 1: Tipo de lead
  tipoLead: string | null;
  
  // Etapa 2: Perfil do cliente
  convenio: string | null;
  ddds: string[];
  tags: string[];
  
  // Etapa 3: Quantidade e prioridade
  quantidade: number;
  prioridade: 'recentes' | 'antigos' | 'aleatorio';
}

export interface AvailableOption {
  value: string;
  count: number;
}

export interface StepProps {
  data: LeadRequestData;
  onUpdate: (updates: Partial<LeadRequestData>) => void;
  isLoading?: boolean;
}

export const INITIAL_DATA: LeadRequestData = {
  tipoLead: null,
  convenio: null,
  ddds: [],
  tags: [],
  quantidade: 10,
  prioridade: 'recentes'
};

export const TIPOS_LEAD = [
  { id: 'inss', label: 'INSS', description: 'Aposentados e pensionistas INSS', icon: '👴' },
  { id: 'servidor', label: 'Servidor Público', description: 'Servidores federais, estaduais e municipais', icon: '🏛️' },
  { id: 'fgts', label: 'FGTS', description: 'Leads com saldo FGTS disponível', icon: '💰' },
  { id: 'siape', label: 'SIAPE', description: 'Servidores públicos federais', icon: '📋' },
  { id: 'todos', label: 'Todos', description: 'Sem filtro por tipo', icon: '📊' },
];

export const FEATURED_DDDS = ['11', '21', '31', '71', '41', '51', '61', '81', '85', '27'];

export const PRIORIDADES = [
  { id: 'recentes', label: 'Mais Recentes', description: 'Leads cadastrados recentemente' },
  { id: 'antigos', label: 'Mais Antigos', description: 'Leads há mais tempo sem contato' },
  { id: 'aleatorio', label: 'Aleatório', description: 'Distribuição aleatória' },
];
