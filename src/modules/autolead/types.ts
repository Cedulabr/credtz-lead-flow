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
  tipoLead: string | null;
  useDefaultMessage: boolean;
  messageTemplate: string;
  whatsappInstanceIds: string[];
  smsEnabled: boolean;
  smsTemplate: string;
}

export const DEFAULT_MESSAGE = `Olá {{nome}}, tudo bem?

Estamos entrando em contato pois identificamos que você pode ter oportunidades disponíveis em seus contratos.

Se quiser mais informações, posso verificar aqui para você!`;

export const SMS_TEMPLATES = [
  {
    id: 'portabilidade',
    label: 'Portabilidade de Crédito',
    icon: '🔄',
    template: 'Olá {{nome}}! Identificamos que você pode reduzir sua parcela com a portabilidade de crédito. Quer saber quanto pode economizar? Fale comigo: {{whatsapp}}',
  },
  {
    id: 'ofertas',
    label: 'Novas Ofertas INSS',
    icon: '🎯',
    template: '{{nome}}, temos ofertas exclusivas para beneficiários do INSS com as melhores taxas do mercado. Entre em contato: {{whatsapp}}',
  },
  {
    id: 'oportunidade',
    label: 'Nova Oportunidade',
    icon: '💰',
    template: 'Olá {{nome}}! Surgiu uma nova oportunidade de crédito para você com condições especiais. Saiba mais: {{whatsapp}}',
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

export const FEATURED_DDDS = [
  { ddd: '11', city: 'São Paulo' },
  { ddd: '21', city: 'Rio de Janeiro' },
  { ddd: '27', city: 'Espírito Santo' },
  { ddd: '31', city: 'Minas Gerais' },
  { ddd: '41', city: 'Paraná' },
  { ddd: '51', city: 'Rio Grande do Sul' },
  { ddd: '61', city: 'Brasília' },
  { ddd: '71', city: 'Bahia' },
  { ddd: '81', city: 'Pernambuco' },
  { ddd: '85', city: 'Ceará' },
];

export const QUANTITY_PRESETS = [5, 10, 15, 20, 30];
