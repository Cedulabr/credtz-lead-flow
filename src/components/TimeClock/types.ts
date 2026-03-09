export type TimeClockType = 'entrada' | 'pausa_inicio' | 'pausa_fim' | 'saida';
export type TimeClockStatus = 'completo' | 'incompleto' | 'ajustado' | 'pendente';
export type AuditStatus = 'normal' | 'suspicious' | 'irregular';

export interface AuditFlag {
  code: string;
  label: string;
  scoreDelta: number;
}

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
  trust_score: number | null;
  audit_flags: any;
  audit_status: string | null;
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
  company_latitude: number | null;
  company_longitude: number | null;
  geofence_radius_meters: number | null;
  block_on_invalid_photo: boolean;
  block_on_geofence_violation: boolean;
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

export interface FaceDetectionResult {
  faceCount: number;
  confidence: number;
  isBlurry: boolean;
  flags: AuditFlag[];
}

export interface AuditResult {
  score: number;
  status: AuditStatus;
  flags: AuditFlag[];
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

export const auditStatusLabels: Record<AuditStatus, string> = {
  normal: 'Confiável',
  suspicious: 'Suspeito',
  irregular: 'Irregular',
};

export const auditStatusColors: Record<AuditStatus, string> = {
  normal: 'bg-green-100 text-green-800 border-green-200',
  suspicious: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  irregular: 'bg-red-100 text-red-800 border-red-200',
};

// Hour Bank types
export type HourBankEntryType = 
  | 'hora_extra' | 'atraso' | 'saida_antecipada' | 'falta' 
  | 'ajuste_manual' | 'compensacao_folga' | 'compensacao_pagamento' | 'desconto_folha';

export type HourBankStatus = 'open' | 'closed' | 'paid';

export interface HourBankEntry {
  id: string;
  user_id: string;
  company_id: string | null;
  entry_date: string;
  entry_type: HourBankEntryType;
  minutes: number;
  reason: string | null;
  reference_month: string;
  performed_by: string;
  hourly_rate: number | null;
  total_value: number | null;
  created_at: string;
}

export interface HourBankSettings {
  id: string;
  company_id: string | null;
  tolerance_delay_minutes: number;
  max_overtime_monthly_minutes: number;
  max_bank_balance_minutes: number;
  allow_negative_discount: boolean;
  overtime_multiplier: number;
  created_at: string;
  updated_at: string;
}

export interface MonthBalance {
  month: string;
  monthLabel: string;
  expectedMinutes: number;
  workedMinutes: number;
  balanceMinutes: number;
  overtimeMinutes: number;
  delayMinutes: number;
  earlyExitMinutes: number;
  absenceCount: number;
  manualAdjustmentsMinutes: number;
  compensationsMinutes: number;
  status: HourBankStatus;
}

export const hourBankEntryTypeLabels: Record<HourBankEntryType, string> = {
  hora_extra: 'Hora Extra',
  atraso: 'Atraso',
  saida_antecipada: 'Saída Antecipada',
  falta: 'Falta',
  ajuste_manual: 'Ajuste Manual',
  compensacao_folga: 'Compensação (Folga)',
  compensacao_pagamento: 'Compensação (Pagamento)',
  desconto_folha: 'Desconto em Folha',
};

export const hourBankEntryTypeColors: Record<HourBankEntryType, string> = {
  hora_extra: 'bg-green-100 text-green-800',
  atraso: 'bg-red-100 text-red-800',
  saida_antecipada: 'bg-orange-100 text-orange-800',
  falta: 'bg-red-100 text-red-800',
  ajuste_manual: 'bg-blue-100 text-blue-800',
  compensacao_folga: 'bg-purple-100 text-purple-800',
  compensacao_pagamento: 'bg-indigo-100 text-indigo-800',
  desconto_folha: 'bg-yellow-100 text-yellow-800',
};
