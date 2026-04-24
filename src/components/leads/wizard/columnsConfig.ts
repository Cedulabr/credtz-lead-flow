// Catálogo de campos por convênio para o wizard de importação/atualização

export type Convenio = 'INSS' | 'SIAPE' | 'SERVIDOR_PUBLICO';
export type Subtipo = 'federal' | 'estadual' | 'municipal';

export interface FieldDef {
  key: string; // chave interna (coluna do banco)
  label: string; // label exibido
  required: boolean;
  group?: 'contato' | 'margem' | 'emprestimo' | 'parcelas' | 'cadastro';
}

export const ESTADOS_BR = [
  'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará',
  'Distrito Federal', 'Espírito Santo', 'Goiás', 'Maranhão',
  'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará',
  'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro',
  'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima',
  'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins',
];

// Campos exigidos por convênio para IMPORTAÇÃO completa
export const FIELDS_BY_CONVENIO: Record<Convenio, FieldDef[]> = {
  INSS: [
    { key: 'cpf', label: 'CPF', required: true, group: 'cadastro' },
    { key: 'name', label: 'Nome', required: true, group: 'cadastro' },
    { key: 'data_nascimento', label: 'Data de Nascimento', required: false, group: 'cadastro' },
    { key: 'tipo_beneficio', label: 'Benefício', required: false, group: 'cadastro' },
    { key: 'ddd', label: 'DDD', required: false, group: 'contato' },
    { key: 'phone', label: 'Telefone', required: false, group: 'contato' },
    { key: 'margem_disponivel', label: 'Margem Livre', required: true, group: 'margem' },
    { key: 'margem_total', label: 'Margem Total', required: true, group: 'margem' },
    { key: 'banco', label: 'Banco', required: true, group: 'emprestimo' },
    { key: 'convenio', label: 'Convênio', required: false, group: 'emprestimo' },
    { key: 'situacao', label: 'Status', required: false, group: 'emprestimo' },
  ],
  SIAPE: [
    { key: 'cpf', label: 'CPF', required: true, group: 'cadastro' },
    { key: 'name', label: 'Nome', required: true, group: 'cadastro' },
    { key: 'matricula', label: 'Matrícula', required: true, group: 'cadastro' },
    { key: 'tipo_beneficio', label: 'Órgão', required: false, group: 'cadastro' },
    { key: 'ddd', label: 'DDD', required: false, group: 'contato' },
    { key: 'phone', label: 'Telefone', required: false, group: 'contato' },
    { key: 'margem_disponivel', label: 'Margem Livre', required: true, group: 'margem' },
    { key: 'margem_total', label: 'Margem Total', required: true, group: 'margem' },
    { key: 'banco', label: 'Banco', required: true, group: 'emprestimo' },
    { key: 'convenio', label: 'Convênio', required: false, group: 'emprestimo' },
    { key: 'situacao', label: 'Status', required: false, group: 'emprestimo' },
  ],
  SERVIDOR_PUBLICO: [
    { key: 'cpf', label: 'CPF', required: true, group: 'cadastro' },
    { key: 'name', label: 'Nome (Servidor)', required: true, group: 'cadastro' },
    { key: 'matricula', label: 'Matrícula', required: true, group: 'cadastro' },
    { key: 'tipo_servico_servidor', label: 'Tipo', required: true, group: 'cadastro' },
    { key: 'margem_disponivel', label: 'Margem Livre', required: true, group: 'margem' },
    { key: 'margem_total', label: 'Margem Total', required: true, group: 'margem' },
    { key: 'banco', label: 'Banco', required: true, group: 'emprestimo' },
    { key: 'ade', label: 'Status ADE', required: true, group: 'emprestimo' },
    { key: 'parcelas_em_aberto', label: 'Total de Parcelas', required: true, group: 'parcelas' },
    { key: 'parcelas_pagas', label: 'Parcelas Pagas', required: true, group: 'parcelas' },
    { key: 'parcela', label: 'Valor de Parcela', required: true, group: 'parcelas' },
    { key: 'deferimento', label: 'Deferimento', required: true, group: 'cadastro' },
    { key: 'ultimo_desconto', label: 'Último Desconto', required: true, group: 'parcelas' },
    { key: 'ultima_parcela', label: 'Última Parcela', required: true, group: 'parcelas' },
    { key: 'convenio', label: 'Convênio', required: true, group: 'emprestimo' },
    { key: 'ddd', label: 'DDD', required: false, group: 'contato' },
    { key: 'phone', label: 'Telefone', required: false, group: 'contato' },
  ],
};

// Grupos de atualização (Atualizar Dados)
export type UpdateGroup = 'contato' | 'margem' | 'emprestimo' | 'parcelas' | 'cadastro';

export const UPDATE_GROUPS: Array<{
  id: UpdateGroup;
  icon: string;
  label: string;
  description: string;
  fields: FieldDef[];
}> = [
  {
    id: 'contato',
    icon: '📞',
    label: 'Telefone / DDD',
    description: 'Adicionar ou atualizar contato dos leads',
    fields: [
      { key: 'ddd', label: 'DDD', required: true },
      { key: 'phone', label: 'Telefone', required: true },
    ],
  },
  {
    id: 'margem',
    icon: '📊',
    label: 'Margem',
    description: 'Margem livre e margem total',
    fields: [
      { key: 'margem_disponivel', label: 'Margem Livre', required: true },
      { key: 'margem_total', label: 'Margem Total', required: true },
    ],
  },
  {
    id: 'emprestimo',
    icon: '🏦',
    label: 'Empréstimos',
    description: 'Banco, status ADE, convênio',
    fields: [
      { key: 'banco', label: 'Banco', required: true },
      { key: 'ade', label: 'Status ADE', required: true },
      { key: 'convenio', label: 'Convênio', required: true },
    ],
  },
  {
    id: 'parcelas',
    icon: '📋',
    label: 'Parcelas',
    description: 'Parcelas pagas, total de parcelas, valor de parcela, último desconto, última parcela',
    fields: [
      { key: 'parcelas_pagas', label: 'Parcelas Pagas', required: true },
      { key: 'parcelas_em_aberto', label: 'Total de Parcelas', required: true },
      { key: 'parcela', label: 'Valor de Parcela', required: true },
      { key: 'ultimo_desconto', label: 'Último Desconto', required: true },
      { key: 'ultima_parcela', label: 'Última Parcela', required: true },
    ],
  },
  {
    id: 'cadastro',
    icon: '📁',
    label: 'Dados cadastrais',
    description: 'Nome, matrícula, tipo, deferimento',
    fields: [
      { key: 'name', label: 'Nome', required: true },
      { key: 'matricula', label: 'Matrícula', required: true },
      { key: 'tipo_servico_servidor', label: 'Tipo', required: true },
      { key: 'deferimento', label: 'Deferimento', required: true },
    ],
  },
];

export const CONVENIO_LABELS: Record<Convenio, string> = {
  INSS: 'INSS',
  SIAPE: 'SIAPE',
  SERVIDOR_PUBLICO: 'Servidor Público',
};

export const SUBTIPO_LABELS: Record<Subtipo, string> = {
  federal: 'Federal',
  estadual: 'Estadual',
  municipal: 'Municipal',
};

export function normalizeCpf(raw: any): string | null {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (!digits || digits.length > 11) return null;
  return digits.padStart(11, '0');
}

// Tenta auto-mapear headers do arquivo para campos do sistema (match exato + variações comuns)
export function autoMapHeaders(systemFields: FieldDef[], fileHeaders: string[]): Record<string, string> {
  const norm = (s: string) => s.toLowerCase().trim().replace(/[\s_\-./]+/g, '').replace(/[áàâã]/g, 'a').replace(/[éê]/g, 'e').replace(/í/g, 'i').replace(/[óôõ]/g, 'o').replace(/ú/g, 'u').replace(/ç/g, 'c');
  const aliases: Record<string, string[]> = {
    cpf: ['cpf', 'documento'],
    name: ['nome', 'nomeservidor', 'nomecliente', 'cliente', 'servidor'],
    phone: ['telefone', 'celular', 'fone', 'telefone1'],
    ddd: ['ddd'],
    matricula: ['matricula', 'matriculaservidor'],
    tipo_servico_servidor: ['tipo', 'tiposervidor'],
    margem_disponivel: ['margemlivre', 'margemdisponivel', 'margem'],
    margem_total: ['margemtotal'],
    banco: ['banco', 'bancooperacao'],
    situacao: ['situacao', 'status'],
    ade: ['ade', 'statusade'],
    parcelas_em_aberto: ['totaldeparcelas', 'totalparcelas', 'qtdparcelas', 'parcelas'],
    parcelas_pagas: ['parcelaspagas'],
    parcela: ['valorparcela', 'valordeparcela', 'parcela'],
    deferimento: ['deferimento', 'datadeferimento', 'averbacao', 'dataaverbacao'],
    ultimo_desconto: ['ultimodesconto'],
    ultima_parcela: ['ultimaparcela'],
    convenio: ['convenio'],
    data_nascimento: ['datanascimento', 'nascimento', 'dtnascimento'],
    tipo_beneficio: ['beneficio', 'tipobeneficio', 'orgao', 'organ'],
  };
  const result: Record<string, string> = {};
  for (const f of systemFields) {
    const candidates = [norm(f.label), ...(aliases[f.key] ?? [])];
    const found = fileHeaders.find(h => candidates.includes(norm(h)));
    if (found) result[f.key] = found;
  }
  return result;
}
