export interface AutoLeadJob {
  id: string;
  user_id: string;
  company_id: string | null;
  total_leads: number;
  leads_sent: number;
  leads_failed: number;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
  message_template: string | null;
  use_default_message: boolean;
  selected_ddds: string[];
  selected_tags: string[];
  tipo_lead: string | null;
  whatsapp_instance_ids: string[];
  max_per_number_day: number;
  pause_every: number;
  pause_minutes: number;
  send_window_start: string;
  send_window_end: string;
  created_at: string;
  started_at: string | null;
  paused_at: string | null;
  finished_at: string | null;
  sms_enabled: boolean;
  sms_template: string | null;
  sms_sent: number;
  sms_failed: number;
}

export interface AutoLeadMessage {
  id: string;
  job_id: string;
  lead_id: string | null;
  lead_name: string | null;
  phone: string;
  whatsapp_instance_id: string;
  message: string;
  status: 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled';
  scheduled_at: string;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface WizardData {
  quantidade: number;
  ddds: string[];
  tags: string[];
  tipoLead: string | null;
  useDefaultMessage: boolean;
  messageTemplate: string;
  whatsappInstanceIds: string[];
  smsEnabled: boolean;
  smsTemplate: string;
}

export const DEFAULT_MESSAGE = `Olá {{nome}}, tudo bem?

Identificamos possibilidade de liberar um novo valor sem aumentar a sua parcela. Quer saber quanto? Fale comigo!`;

export const WHATSAPP_TEMPLATES = [
  {
    id: 'valor_sem_aumento',
    label: 'Novo Valor sem Aumento',
    icon: '💰',
    template: 'Olá {{nome}}, tudo bem?\n\nIdentificamos possibilidade de liberar um novo valor sem aumentar a sua parcela. Quer saber quanto? Fale comigo!',
  },
  {
    id: 'reducao_parcela',
    label: 'Redução de Parcela',
    icon: '📉',
    template: 'Olá {{nome}}, tudo bem?\n\nConseguimos identificar uma condição especial para reduzir o valor da sua parcela atual, mantendo as mesmas condições. Quer saber mais? Estou à disposição!',
  },
  {
    id: 'portabilidade_troco',
    label: 'Portabilidade com Troco',
    icon: '🔄',
    template: 'Olá {{nome}}, tudo bem?\n\nIdentificamos que você pode fazer a portabilidade do seu empréstimo e ainda receber um troco! Quer saber o valor? Fale comigo!',
  },
  {
    id: 'oportunidade_exclusiva',
    label: 'Oportunidade Exclusiva',
    icon: '⭐',
    template: 'Olá {{nome}}, tudo bem?\n\nSurgiu uma oportunidade exclusiva de crédito consignado com condições diferenciadas para o seu perfil. Posso te explicar sem compromisso!',
  },
];

export const SMS_TEMPLATES = [
  {
    id: 'valor_sem_aumento',
    label: 'Novo Valor sem Aumento',
    icon: '💰',
    template: 'Identificamos possibilidade de liberar um novo valor sem aumentar a sua parcela. Quer saber quanto? Fale comigo: https://wa.me/55{{whatsapp}}',
  },
  {
    id: 'reducao_parcela',
    label: 'Redução de Parcela',
    icon: '📉',
    template: 'Identificamos uma condição especial para reduzir o valor da sua parcela atual. Quer saber mais? Fale comigo: https://wa.me/55{{whatsapp}}',
  },
  {
    id: 'oportunidade',
    label: 'Nova Oportunidade',
    icon: '⭐',
    template: 'Surgiu uma nova oportunidade de crédito para você com condições especiais. Saiba mais: https://wa.me/55{{whatsapp}}',
  },
];

export const TIPOS_LEAD = [
  { id: 'inss', label: 'INSS', icon: '👴' },
  { id: 'servidor', label: 'Servidor Público', icon: '🏛️' },
  { id: 'fgts', label: 'FGTS', icon: '💰' },
  { id: 'cartao', label: 'Cartão Benefício', icon: '💳' },
  { id: 'refinanciamento', label: 'Refinanciamento', icon: '🔄' },
  { id: 'todos', label: 'Todos', icon: '📊' },
];

export const FEATURED_DDDS = ['11', '21', '27', '31', '41', '51', '61', '71', '81', '85'];

export const ALL_DDDS = [
  '11','12','13','14','15','16','17','18','19',
  '21','22','24','27','28',
  '31','32','33','34','35','37','38',
  '41','42','43','44','45','46',
  '47','48','49',
  '51','53','54','55',
  '61','62','63','64','65','66','67','68','69',
  '71','73','74','75','77','79',
  '81','82','83','84','85','86','87','88','89',
  '91','92','93','94','95','96','97','98','99',
];

export const DDD_CITIES: Record<string, string> = {
  '11': 'São Paulo', '12': 'S. José dos Campos', '13': 'Santos', '14': 'Bauru', '15': 'Sorocaba',
  '16': 'Ribeirão Preto', '17': 'S. José do Rio Preto', '18': 'Presidente Prudente', '19': 'Campinas',
  '21': 'Rio de Janeiro', '22': 'Campos', '24': 'Volta Redonda',
  '27': 'Vitória', '28': 'Cachoeiro',
  '31': 'Belo Horizonte', '32': 'Juiz de Fora', '33': 'Gov. Valadares', '34': 'Uberlândia',
  '35': 'Poços de Caldas', '37': 'Divinópolis', '38': 'Montes Claros',
  '41': 'Curitiba', '42': 'Ponta Grossa', '43': 'Londrina', '44': 'Maringá', '45': 'Foz do Iguaçu', '46': 'Pato Branco',
  '47': 'Joinville', '48': 'Florianópolis', '49': 'Chapecó',
  '51': 'Porto Alegre', '53': 'Pelotas', '54': 'Caxias do Sul', '55': 'Santa Maria',
  '61': 'Brasília', '62': 'Goiânia', '63': 'Palmas', '64': 'Rio Verde',
  '65': 'Cuiabá', '66': 'Rondonópolis', '67': 'Campo Grande', '68': 'Rio Branco', '69': 'Porto Velho',
  '71': 'Salvador', '73': 'Ilhéus', '74': 'Juazeiro', '75': 'Feira de Santana', '77': 'Barreiras', '79': 'Aracaju',
  '81': 'Recife', '82': 'Maceió', '83': 'João Pessoa', '84': 'Natal',
  '85': 'Fortaleza', '86': 'Teresina', '87': 'Petrolina', '88': 'Juazeiro do Norte', '89': 'Picos',
  '91': 'Belém', '92': 'Manaus', '93': 'Santarém', '94': 'Marabá',
  '95': 'Boa Vista', '96': 'Macapá', '97': 'Coari', '98': 'São Luís', '99': 'Imperatriz',
};

export const QUANTITY_PRESETS = [5, 10, 15, 20, 30];
