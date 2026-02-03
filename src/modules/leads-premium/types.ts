// Types for the Leads Premium module

export interface Lead {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  phone2?: string;
  convenio: string;
  tag?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  assigned_to?: string;
  created_by?: string;
  is_rework?: boolean;
  rework_date?: string;
  notes?: string;
  future_contact_date?: string;
  future_contact_time?: string;
  rejection_reason?: string;
  rejection_offered_value?: number;
  rejection_bank?: string;
  rejection_description?: string;
  banco_operacao?: string;
  valor_operacao?: number;
  history?: any;
  simulation_status?: string | null;
  simulation_id?: string | null;
}

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
}

export interface LeadRequest {
  convenio: string;
  count: number;
  ddds: string[];
  tags: string[];
}

export interface LeadFilters {
  search: string;
  status: string;
  user: string;
  convenio: string;
  tag: string;
}

export interface LeadStats {
  total: number;
  novos: number;
  emAndamento: number;
  fechados: number;
  recusados: number;
  pendentes: number;
  conversionRate: number;
  avgTimeToConversion: number;
  todayCount: number;
  weekCount: number;
  byStatus: Record<string, number>;
}

export interface HistoryEntry {
  action: string;
  timestamp: string;
  user_id?: string;
  user_name?: string;
  from_status?: string;
  to_status?: string;
  note?: string;
  rejection_data?: {
    reason?: string;
    offered_value?: number;
    bank?: string;
    description?: string;
  };
  future_contact_date?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  assigned_to?: string;
  assigned_to_name?: string;
}

// Pipeline stages configuration
export const PIPELINE_STAGES: Record<string, {
  label: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  order: number;
}> = {
  new_lead: { 
    label: "Novo Lead", 
    color: "from-blue-500 to-blue-600", 
    textColor: "text-blue-700", 
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    dotColor: "bg-blue-500",
    order: 1
  },
  em_andamento: { 
    label: "Em Andamento", 
    color: "from-indigo-500 to-violet-500", 
    textColor: "text-indigo-700", 
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    dotColor: "bg-indigo-500",
    order: 2
  },
  aguardando_retorno: { 
    label: "Aguardando Retorno", 
    color: "from-purple-500 to-fuchsia-500", 
    textColor: "text-purple-700", 
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    dotColor: "bg-purple-500",
    order: 3
  },
  agendamento: { 
    label: "Agendamento", 
    color: "from-cyan-500 to-teal-500", 
    textColor: "text-cyan-700", 
    bgColor: "bg-cyan-50",
    borderColor: "border-cyan-200",
    dotColor: "bg-cyan-500",
    order: 4
  },
  cliente_fechado: { 
    label: "Cliente Fechado", 
    color: "from-emerald-500 to-green-500", 
    textColor: "text-emerald-700", 
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    dotColor: "bg-emerald-500",
    order: 5
  },
  contato_futuro: { 
    label: "Contato Futuro", 
    color: "from-slate-500 to-gray-500", 
    textColor: "text-slate-700", 
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    dotColor: "bg-slate-500",
    order: 6
  },
  recusou_oferta: { 
    label: "Recusado", 
    color: "from-rose-500 to-red-500", 
    textColor: "text-rose-700", 
    bgColor: "bg-rose-50",
    borderColor: "border-rose-200",
    dotColor: "bg-rose-500",
    order: 7
  },
  sem_interesse: {
    label: "Sem Interesse",
    color: "from-amber-500 to-orange-500",
    textColor: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    dotColor: "bg-amber-500",
    order: 8
  },
  nao_e_cliente: {
    label: "Não é o Cliente",
    color: "from-gray-500 to-zinc-500",
    textColor: "text-gray-700",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    dotColor: "bg-gray-500",
    order: 9
  },
  sem_retorno: {
    label: "Sem Retorno",
    color: "from-zinc-500 to-neutral-600",
    textColor: "text-zinc-700",
    bgColor: "bg-zinc-50",
    borderColor: "border-zinc-200",
    dotColor: "bg-zinc-500",
    order: 10
  },
  nao_e_whatsapp: {
    label: "Não é WhatsApp",
    color: "from-violet-500 to-purple-500",
    textColor: "text-violet-700",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    dotColor: "bg-violet-500",
    order: 11
  }
};

// Status categories for quick filtering
export const STATUS_CATEGORIES = {
  active: ['new_lead', 'em_andamento', 'aguardando_retorno', 'agendamento'],
  converted: ['cliente_fechado'],
  lost: ['recusou_oferta', 'sem_interesse', 'nao_e_cliente', 'sem_retorno', 'nao_e_whatsapp'],
  scheduled: ['contato_futuro', 'agendamento']
};

export const REJECTION_REASONS = [
  { id: "valor_baixo", label: "Cliente achou o valor baixo", requiresValue: true, requiresBank: true },
  { id: "sem_interesse", label: "Não teve interesse", requiresValue: false, requiresBank: false },
  { id: "contratou_outro", label: "Já contratou com outro banco", requiresValue: false, requiresBank: false },
  { id: "outros", label: "Outros", requiresValue: false, requiresBank: false }
];

export const BANKS_LIST = [
  "BRADESCO", "BMG", "C6", "DAYCOVAL", "FACTA", "ITAU", "MASTER", 
  "MERCANTIL", "OLE", "PAN", "PARANÁ", "SAFRA", "SANTANDER"
];

// Legacy STATUS_CONFIG for backward compatibility
export const STATUS_CONFIG = PIPELINE_STAGES;
