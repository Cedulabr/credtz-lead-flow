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

// Status configuration
export const STATUS_CONFIG: Record<string, {
  label: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  dotColor: string;
}> = {
  new_lead: { 
    label: "Novo Lead", 
    color: "from-blue-500 to-blue-600", 
    textColor: "text-blue-700", 
    bgColor: "bg-gradient-to-r from-blue-50 to-blue-100",
    borderColor: "border-blue-200",
    icon: "Sparkles",
    dotColor: "bg-blue-500"
  },
  em_andamento: { 
    label: "Em Andamento", 
    color: "from-blue-500 to-indigo-500", 
    textColor: "text-blue-700", 
    bgColor: "bg-gradient-to-r from-blue-50 to-indigo-100",
    borderColor: "border-blue-200",
    icon: "TrendingUp",
    dotColor: "bg-blue-500"
  },
  aguardando_retorno: { 
    label: "Aguardando Retorno", 
    color: "from-purple-500 to-indigo-500", 
    textColor: "text-purple-700", 
    bgColor: "bg-gradient-to-r from-purple-50 to-indigo-100",
    borderColor: "border-purple-200",
    icon: "Clock",
    dotColor: "bg-purple-500"
  },
  cliente_fechado: { 
    label: "Cliente Fechado", 
    color: "from-emerald-500 to-green-500", 
    textColor: "text-emerald-700", 
    bgColor: "bg-gradient-to-r from-emerald-50 to-green-100",
    borderColor: "border-emerald-200",
    icon: "CheckCircle",
    dotColor: "bg-emerald-500"
  },
  recusou_oferta: { 
    label: "Recusado", 
    color: "from-rose-500 to-red-500", 
    textColor: "text-rose-700", 
    bgColor: "bg-gradient-to-r from-rose-50 to-red-100",
    borderColor: "border-rose-200",
    icon: "XCircle",
    dotColor: "bg-rose-500"
  },
  contato_futuro: { 
    label: "Contato Futuro", 
    color: "from-slate-500 to-gray-500", 
    textColor: "text-slate-700", 
    bgColor: "bg-gradient-to-r from-slate-50 to-gray-100",
    borderColor: "border-slate-200",
    icon: "Calendar",
    dotColor: "bg-slate-500"
  },
  agendamento: { 
    label: "Agendamento", 
    color: "from-indigo-500 to-violet-500", 
    textColor: "text-indigo-700", 
    bgColor: "bg-gradient-to-r from-indigo-50 to-violet-100",
    borderColor: "border-indigo-200",
    icon: "Calendar",
    dotColor: "bg-indigo-500"
  },
  nao_e_cliente: {
    label: "Não é o cliente",
    color: "from-gray-500 to-zinc-500",
    textColor: "text-gray-700",
    bgColor: "bg-gradient-to-r from-gray-50 to-zinc-100",
    borderColor: "border-gray-200",
    icon: "UserX",
    dotColor: "bg-gray-500"
  },
  sem_interesse: {
    label: "Sem Interesse",
    color: "from-yellow-500 to-amber-600",
    textColor: "text-yellow-800",
    bgColor: "bg-gradient-to-r from-yellow-50 to-amber-100",
    borderColor: "border-yellow-200",
    icon: "Ban",
    dotColor: "bg-yellow-500"
  },
  sem_retorno: {
    label: "Sem retorno",
    color: "from-zinc-500 to-neutral-600",
    textColor: "text-zinc-700",
    bgColor: "bg-gradient-to-r from-zinc-50 to-neutral-100",
    borderColor: "border-zinc-200",
    icon: "PhoneOff",
    dotColor: "bg-zinc-500"
  },
  nao_e_whatsapp: {
    label: "Não é WhatsApp",
    color: "from-violet-500 to-purple-500",
    textColor: "text-violet-700",
    bgColor: "bg-gradient-to-r from-violet-50 to-purple-100",
    borderColor: "border-violet-200",
    icon: "MessageCircle",
    dotColor: "bg-violet-500"
  }
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
