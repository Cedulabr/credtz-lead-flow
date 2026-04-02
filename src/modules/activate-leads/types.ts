import { Sparkles, TrendingUp, RotateCcw, CheckCircle, XCircle, Clock, UserX, CalendarClock, PhoneOff } from "lucide-react";
import React from "react";

export interface ActivateLead {
  id: string;
  nome: string;
  telefone: string;
  origem: string;
  produto: string | null;
  status: string;
  assigned_to: string | null;
  company_id: string | null;
  motivo_recusa: string | null;
  data_proxima_operacao: string | null;
  ultima_interacao: string | null;
  proxima_acao: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  segunda_tentativa?: boolean;
  segunda_tentativa_at?: string;
  segunda_tentativa_by?: string;
  cpf?: string | null;
  simulation_status?: string | null;
  simulation_id?: string | null;
  sanitized?: boolean;
  sanitized_at?: string;
  has_quality_issues?: boolean;
  quality_issues?: any;
}

export interface ActivateLeadStats {
  total: number;
  novos: number;
  emAndamento: number;
  segundaTentativa: number;
  fechados: number;
  semPossibilidade: number;
  alertas: number;
}

export interface ActivateUser {
  id: string;
  name: string;
  email: string;
}

export const ACTIVATE_STATUS_CONFIG: Record<string, {
  label: string;
  emoji: string;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  order: number;
}> = {
  novo: {
    label: 'Novo',
    emoji: '✨',
    color: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    dotColor: 'bg-blue-500',
    order: 1,
  },
  em_andamento: {
    label: 'Em Andamento',
    emoji: '📞',
    color: 'from-indigo-500 to-violet-500',
    textColor: 'text-indigo-700',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    dotColor: 'bg-indigo-500',
    order: 2,
  },
  segunda_tentativa: {
    label: 'Segunda Tentativa',
    emoji: '🔁',
    color: 'from-cyan-500 to-teal-500',
    textColor: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-200',
    dotColor: 'bg-cyan-500',
    order: 3,
  },
  fechado: {
    label: 'Fechado',
    emoji: '✅',
    color: 'from-emerald-500 to-green-500',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    dotColor: 'bg-emerald-500',
    order: 4,
  },
  contato_futuro: {
    label: 'Contato Futuro',
    emoji: '📅',
    color: 'from-purple-500 to-violet-500',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    dotColor: 'bg-purple-500',
    order: 5,
  },
  operacoes_recentes: {
    label: 'Operações Recentes',
    emoji: '⏳',
    color: 'from-violet-500 to-purple-600',
    textColor: 'text-violet-700',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    dotColor: 'bg-violet-500',
    order: 6,
  },
  sem_possibilidade: {
    label: 'Sem Possibilidade',
    emoji: '❌',
    color: 'from-rose-500 to-red-500',
    textColor: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    dotColor: 'bg-rose-500',
    order: 7,
  },
  fora_do_perfil: {
    label: 'Fora do Perfil',
    emoji: '👤',
    color: 'from-slate-500 to-gray-500',
    textColor: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    dotColor: 'bg-slate-500',
    order: 8,
  },
  nao_e_cliente: {
    label: 'Não é o Cliente',
    emoji: '🚫',
    color: 'from-gray-500 to-zinc-500',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    dotColor: 'bg-gray-500',
    order: 9,
  },
  sem_interesse: {
    label: 'Sem Interesse',
    emoji: '😔',
    color: 'from-red-400 to-rose-500',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    dotColor: 'bg-red-400',
    order: 10,
  },
  sem_retorno: {
    label: 'Sem Retorno',
    emoji: '📵',
    color: 'from-zinc-400 to-neutral-500',
    textColor: 'text-zinc-700',
    bgColor: 'bg-zinc-50',
    borderColor: 'border-zinc-200',
    dotColor: 'bg-zinc-400',
    order: 11,
  },
};

export const PIPELINE_STATUSES = ['novo', 'em_andamento', 'fechado', 'sem_possibilidade'];

export const PROOF_TYPES = [
  { value: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { value: 'ligacao', label: 'Ligação', emoji: '📞' },
  { value: 'mensagem', label: 'SMS/Mensagem', emoji: '📱' },
  { value: 'outro', label: 'Outro', emoji: '📎' },
];

export const ORIGEM_OPTIONS = ['site', 'aplicativo', 'importacao', 'indicacao'];
