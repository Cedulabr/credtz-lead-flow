export type TipoLead = 'inss' | 'siape' | 'servidor' | 'clt';

export interface LeadRequestData {
  // Etapa 1: Tipo de convênio
  tipoLead: TipoLead | null;

  // Etapa 2: Perfil
  uf: string | null;          // obrigatório para servidor
  ddds: string[];
  tags: string[];
  requireTelefone: boolean | null; // null = não perguntado

  // Filtros de contrato (servidor)
  banco: string | null;
  parcelaMin: number | null;
  parcelaMax: number | null;
  margemMin: number | null;
  parcelasPagasMin: number | null;

  // Etapa 3: Quantidade e prioridade
  quantidade: number;
  prioridade: 'recentes' | 'antigos' | 'aleatorio';

  // Compatibilidade com hook (derivado de tipoLead)
  convenio: string | null;
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
  uf: null,
  ddds: [],
  tags: [],
  requireTelefone: null,
  banco: null,
  parcelaMin: null,
  parcelaMax: null,
  margemMin: null,
  parcelasPagasMin: null,
  quantidade: 10,
  prioridade: 'recentes',
  convenio: null,
};

// Mapa UF → DDDs (cobertura nacional)
export const UF_TO_DDDS: Record<string, string[]> = {
  AC: ['68'],
  AL: ['82'],
  AM: ['92', '97'],
  AP: ['96'],
  BA: ['71', '73', '74', '75', '77'],
  CE: ['85', '88'],
  DF: ['61'],
  ES: ['27', '28'],
  GO: ['62', '64'],
  MA: ['98', '99'],
  MG: ['31', '32', '33', '34', '35', '37', '38'],
  MS: ['67'],
  MT: ['65', '66'],
  PA: ['91', '93', '94'],
  PB: ['83'],
  PE: ['81', '87'],
  PI: ['86', '89'],
  PR: ['41', '42', '43', '44', '45', '46'],
  RJ: ['21', '22', '24'],
  RN: ['84'],
  RO: ['69'],
  RR: ['95'],
  RS: ['51', '53', '54', '55'],
  SC: ['47', '48', '49'],
  SE: ['79'],
  SP: ['11', '12', '13', '14', '15', '16', '17', '18', '19'],
  TO: ['63'],
};

export const UF_LIST = Object.keys(UF_TO_DDDS).sort();

export const UF_NOMES: Record<string, string> = {
  AC: 'Acre',
  AL: 'Alagoas',
  AM: 'Amazonas',
  AP: 'Amapá',
  BA: 'Bahia',
  CE: 'Ceará',
  DF: 'Distrito Federal',
  ES: 'Espírito Santo',
  GO: 'Goiás',
  MA: 'Maranhão',
  MG: 'Minas Gerais',
  MS: 'Mato Grosso do Sul',
  MT: 'Mato Grosso',
  PA: 'Pará',
  PB: 'Paraíba',
  PE: 'Pernambuco',
  PI: 'Piauí',
  PR: 'Paraná',
  RJ: 'Rio de Janeiro',
  RN: 'Rio Grande do Norte',
  RO: 'Rondônia',
  RR: 'Roraima',
  RS: 'Rio Grande do Sul',
  SC: 'Santa Catarina',
  SE: 'Sergipe',
  SP: 'São Paulo',
  TO: 'Tocantins',
};

export const TIPOS_LEAD: { id: TipoLead; label: string; description: string; icon: string }[] = [
  { id: 'inss',     label: 'INSS',             description: 'Aposentados e pensionistas INSS', icon: '💛' },
  { id: 'siape',    label: 'SIAPE',            description: 'Servidores federais (folha federal)', icon: '🔵' },
  { id: 'servidor', label: 'Servidor Público', description: 'Estadual e municipal — escolha o estado', icon: '🏛️' },
  { id: 'clt',      label: 'CLT / Privado',    description: 'Trabalhadores com carteira assinada', icon: '📋' },
];

export const FEATURED_DDDS = ['11', '21', '31', '71', '41', '51', '61', '81', '85', '27'];

export const PRIORIDADES = [
  { id: 'recentes', label: 'Mais Recentes', description: 'Leads cadastrados recentemente' },
  { id: 'antigos', label: 'Mais Antigos', description: 'Leads há mais tempo sem contato' },
  { id: 'aleatorio', label: 'Aleatório', description: 'Distribuição aleatória' },
];

// Mapeia tipoLead → convenio_filter para o RPC
export function tipoLeadToConvenio(tipo: TipoLead | null): string | null {
  switch (tipo) {
    case 'inss': return 'INSS';
    case 'siape': return 'SIAPE';
    case 'servidor': return 'GOVERNO BA';
    case 'clt': return 'CLT';
    default: return null;
  }
}
