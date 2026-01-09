export type TimeClockType = 'entrada' | 'pausa_inicio' | 'pausa_fim' | 'saida';
export type TimeClockStatus = 'completo' | 'incompleto' | 'ajustado' | 'pendente';

export interface TimeClock {
  id: string;
  user_id: string;
  company_id: string | null;
  clock_date: string;
  clock_type: TimeClockType;
  clock_time: string;
  ip_address: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  photo_url: string | null;
  user_agent: string | null;
  device_info: any;
  status: TimeClockStatus;
  notes: string | null;
  break_type_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeClockLog {
  id: string;
  time_clock_id: string;
  action: string;
  performed_by: string;
  reason: string | null;
  old_values: any;
  new_values: any;
  created_at: string;
}

export interface TimeClockSettings {
  id: string;
  company_id: string | null;
  default_entry_time: string;
  default_exit_time: string;
  tolerance_minutes: number;
  require_photo: boolean;
  require_location: boolean;
  allow_manual_adjustment: boolean;
  block_duplicate_clock: boolean;
  retention_years: number;
  created_at: string;
  updated_at: string;
}

export interface TimeClockConsent {
  id: string;
  user_id: string;
  consent_given: boolean;
  consent_date: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface TimeClockBreakType {
  id: string;
  company_id: string | null;
  name: string;
  description: string | null;
  is_paid: boolean;
  max_duration_minutes: number | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface DailyRecord {
  date: string;
  records: TimeClock[];
  totalHours: number;
  status: TimeClockStatus;
}

export const clockTypeLabels: Record<TimeClockType, string> = {
  entrada: 'Entrada',
  pausa_inicio: 'Início Pausa',
  pausa_fim: 'Fim Pausa',
  saida: 'Saída',
};

export const statusLabels: Record<TimeClockStatus, string> = {
  completo: 'Completo',
  incompleto: 'Incompleto',
  ajustado: 'Ajustado',
  pendente: 'Pendente',
};

export const statusColors: Record<TimeClockStatus, string> = {
  completo: 'bg-green-100 text-green-800',
  incompleto: 'bg-yellow-100 text-yellow-800',
  ajustado: 'bg-blue-100 text-blue-800',
  pendente: 'bg-gray-100 text-gray-800',
};
