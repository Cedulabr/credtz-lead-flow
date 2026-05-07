/**
 * Time Clock Engine — validação e cálculo confiável juridicamente.
 * Espelha a lógica do RPC `recalc_user_day` para uso no frontend (PDF, dashboards).
 */
import { parseISO } from 'date-fns';

export type DayStatus =
  | 'ok'
  | 'observacao'
  | 'pendente_ajuste'
  | 'justificado'
  | 'falta'
  | 'feriado'
  | 'folga'
  | 'sem_jornada';

export interface ClockRecord {
  clock_type: 'entrada' | 'pausa_inicio' | 'pausa_fim' | 'saida';
  clock_time: string;
}

export interface DaySchedule {
  entry_time: string;
  exit_time: string;
  daily_hours: number;
  tolerance_minutes: number;
  work_days: number[];
}

export interface Inconsistency {
  code:
    | 'ENTRADA_DUPLICADA'
    | 'SAIDA_DUPLICADA'
    | 'PAUSA_INCOMPLETA'
    | 'SAIDA_SEM_ENTRADA'
    | 'ENTRADA_SEM_SAIDA'
    | 'SAIDA_ANTES_ENTRADA'
    | 'PAUSA_INVERTIDA'
    | 'PAUSA_EXCESSIVA'
    | 'JORNADA_EXCESSIVA'
    | 'BATIDA_DUPLICADA'
    | 'HORARIO_INVALIDO';
  severity: 'high' | 'medium' | 'low';
  message: string;
  minutes?: number;
}

export interface DayResult {
  status: DayStatus;
  inconsistencies: Inconsistency[];
  expectedMinutes: number;
  workedMinutes: number;
  breakMinutes: number;
  delayMinutes: number;
  earlyExitMinutes: number;
  overtimeMinutes: number;
  bankBalanceMinutes: number;
  entryMinute: number | null;
  exitMinute: number | null;
}

export const inconsistencyLabels: Record<Inconsistency['code'], string> = {
  ENTRADA_DUPLICADA: 'Mais de uma entrada registrada',
  SAIDA_DUPLICADA: 'Mais de uma saída registrada',
  PAUSA_INCOMPLETA: 'Pausa aberta sem fechamento',
  SAIDA_SEM_ENTRADA: 'Saída sem entrada correspondente',
  ENTRADA_SEM_SAIDA: 'Entrada registrada sem saída',
  SAIDA_ANTES_ENTRADA: 'Saída anterior à entrada',
  PAUSA_INVERTIDA: 'Fim de pausa anterior ao início',
  PAUSA_EXCESSIVA: 'Pausa acima de 4 horas',
  JORNADA_EXCESSIVA: 'Jornada acima de 12 horas',
  BATIDA_DUPLICADA: 'Batidas duplicadas no mesmo minuto',
  HORARIO_INVALIDO: 'Horário fora do intervalo válido',
};

export const dayStatusLabels: Record<DayStatus, string> = {
  ok: 'OK',
  observacao: 'Observação',
  pendente_ajuste: 'Pendente de Ajuste',
  justificado: 'Justificado',
  falta: 'Falta',
  feriado: 'Feriado',
  folga: 'Folga',
  sem_jornada: 'Sem Jornada',
};

export const dayStatusColor: Record<DayStatus, { bg: string; text: string; border: string; pdfRgb: [number, number, number] }> = {
  ok:               { bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-300',  pdfRgb: [220, 252, 231] },
  observacao:       { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', pdfRgb: [254, 249, 195] },
  pendente_ajuste:  { bg: 'bg-red-100',    text: 'text-red-800',    border: 'border-red-300',    pdfRgb: [254, 226, 226] },
  justificado:      { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300',   pdfRgb: [219, 234, 254] },
  falta:            { bg: 'bg-gray-200',   text: 'text-gray-800',   border: 'border-gray-300',   pdfRgb: [229, 231, 235] },
  feriado:          { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', pdfRgb: [243, 232, 255] },
  folga:            { bg: 'bg-slate-100',  text: 'text-slate-700',  border: 'border-slate-300',  pdfRgb: [241, 245, 249] },
  sem_jornada:      { bg: 'bg-slate-50',   text: 'text-slate-600',  border: 'border-slate-200',  pdfRgb: [248, 250, 252] },
};

const DEFAULT_SCHEDULE: DaySchedule = {
  entry_time: '08:00',
  exit_time: '18:00',
  daily_hours: 8,
  tolerance_minutes: 10,
  work_days: [1, 2, 3, 4, 5],
};

export function timeToMinutes(time: string): number {
  if (!time) return 0;
  if (time.includes('T')) {
    const d = parseISO(time);
    return d.getHours() * 60 + d.getMinutes();
  }
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatHM(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes === 0) return '00:00';
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Avalia o dia: detecta inconsistências e calcula somente quando válido.
 */
export function evaluateDay(
  records: ClockRecord[],
  schedule: DaySchedule | null,
  dayOfWeek: number,
  isHoliday = false
): DayResult {
  const sched = schedule ?? DEFAULT_SCHEDULE;
  const isWorkDay = sched.work_days?.includes(dayOfWeek) ?? [1, 2, 3, 4, 5].includes(dayOfWeek);
  const expectedMinutes = isWorkDay && !isHoliday ? Math.round((sched.daily_hours || 0) * 60) : 0;

  const incons: Inconsistency[] = [];
  const empty: DayResult = {
    status: 'sem_jornada',
    inconsistencies: incons,
    expectedMinutes,
    workedMinutes: 0,
    breakMinutes: 0,
    delayMinutes: 0,
    earlyExitMinutes: 0,
    overtimeMinutes: 0,
    bankBalanceMinutes: 0,
    entryMinute: null,
    exitMinute: null,
  };

  if (!records || records.length === 0) {
    if (isHoliday) return { ...empty, status: 'feriado' };
    if (!isWorkDay) return { ...empty, status: 'folga' };
    return { ...empty, status: 'falta', bankBalanceMinutes: -expectedMinutes };
  }

  const entries = records.filter(r => r.clock_type === 'entrada');
  const exits = records.filter(r => r.clock_type === 'saida');
  const pInicios = records.filter(r => r.clock_type === 'pausa_inicio')
    .sort((a, b) => a.clock_time.localeCompare(b.clock_time));
  const pFins = records.filter(r => r.clock_type === 'pausa_fim')
    .sort((a, b) => a.clock_time.localeCompare(b.clock_time));

  if (entries.length > 1) incons.push({ code: 'ENTRADA_DUPLICADA', severity: 'high', message: inconsistencyLabels.ENTRADA_DUPLICADA });
  if (exits.length > 1) incons.push({ code: 'SAIDA_DUPLICADA', severity: 'high', message: inconsistencyLabels.SAIDA_DUPLICADA });
  if (pInicios.length !== pFins.length) incons.push({ code: 'PAUSA_INCOMPLETA', severity: 'high', message: inconsistencyLabels.PAUSA_INCOMPLETA });
  if (entries.length === 0 && exits.length > 0) incons.push({ code: 'SAIDA_SEM_ENTRADA', severity: 'high', message: inconsistencyLabels.SAIDA_SEM_ENTRADA });
  // Entrada sem saída em dia útil já encerrado: pendência crítica (não pode ser tratado como OK)
  if (entries.length >= 1 && exits.length === 0 && isWorkDay && !isHoliday) {
    incons.push({ code: 'ENTRADA_SEM_SAIDA', severity: 'high', message: inconsistencyLabels.ENTRADA_SEM_SAIDA });
  }

  // Duplicatas exatas (mesmo tipo, mesmo minuto)
  const seen = new Set<string>();
  for (const r of records) {
    const key = `${r.clock_type}@${Math.floor(timeToMinutes(r.clock_time))}`;
    if (seen.has(key)) {
      incons.push({ code: 'BATIDA_DUPLICADA', severity: 'medium', message: inconsistencyLabels.BATIDA_DUPLICADA });
      break;
    }
    seen.add(key);
  }

  let workedMinutes = 0;
  let breakMinutes = 0;
  let delayMinutes = 0;
  let earlyExitMinutes = 0;
  let overtimeMinutes = 0;
  let bankBalance = 0;
  let entryMinute: number | null = null;
  let exitMinute: number | null = null;

  if (entries.length === 1 && exits.length === 1 && pInicios.length === pFins.length) {
    entryMinute = timeToMinutes(entries[0].clock_time);
    exitMinute = timeToMinutes(exits[0].clock_time);

    if (exitMinute <= entryMinute) {
      incons.push({ code: 'SAIDA_ANTES_ENTRADA', severity: 'high', message: inconsistencyLabels.SAIDA_ANTES_ENTRADA });
    } else {
      // Pausas pareadas
      for (let i = 0; i < pInicios.length; i++) {
        const ini = timeToMinutes(pInicios[i].clock_time);
        const fim = timeToMinutes(pFins[i].clock_time);
        if (fim < ini) {
          incons.push({ code: 'PAUSA_INVERTIDA', severity: 'high', message: inconsistencyLabels.PAUSA_INVERTIDA });
        } else {
          breakMinutes += fim - ini;
        }
      }
      if (breakMinutes > 240) {
        incons.push({ code: 'PAUSA_EXCESSIVA', severity: 'medium', message: inconsistencyLabels.PAUSA_EXCESSIVA, minutes: breakMinutes });
      }

      workedMinutes = Math.max(0, exitMinute - entryMinute - breakMinutes);
      if (workedMinutes > 720) {
        incons.push({ code: 'JORNADA_EXCESSIVA', severity: 'high', message: inconsistencyLabels.JORNADA_EXCESSIVA, minutes: workedMinutes });
      }

      if (expectedMinutes > 0) {
        const schedEntry = timeToMinutes(sched.entry_time);
        const schedExit = timeToMinutes(sched.exit_time);
        const tol = sched.tolerance_minutes ?? 10;
        delayMinutes = Math.max(0, entryMinute - schedEntry - tol);
        earlyExitMinutes = Math.max(0, schedExit - exitMinute - tol);
        overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes);
        bankBalance = workedMinutes - expectedMinutes;
      }
    }
  }

  const hasHigh = incons.some(i => i.severity === 'high');
  let status: DayStatus;

  if (isHoliday) {
    status = workedMinutes > 0 && !hasHigh ? 'ok' : 'feriado';
  } else if (hasHigh) {
    status = 'pendente_ajuste';
    workedMinutes = 0;
    overtimeMinutes = 0;
    bankBalance = 0;
  } else if (delayMinutes > 0 || earlyExitMinutes > 0 || incons.length > 0) {
    status = 'observacao';
  } else if (workedMinutes === 0 && !isWorkDay) {
    status = 'folga';
  } else {
    status = 'ok';
  }

  return {
    status,
    inconsistencies: incons,
    expectedMinutes,
    workedMinutes,
    breakMinutes,
    delayMinutes,
    earlyExitMinutes,
    overtimeMinutes,
    bankBalanceMinutes: bankBalance,
    entryMinute,
    exitMinute,
  };
}

/**
 * Resume um período (mês) somando dias válidos.
 */
export function summarizePeriod(days: DayResult[]) {
  return days.reduce(
    (acc, d) => {
      acc.expected += d.expectedMinutes;
      acc.worked += d.workedMinutes;
      acc.delay += d.delayMinutes;
      acc.earlyExit += d.earlyExitMinutes;
      acc.overtime += d.overtimeMinutes;
      acc.bank += d.bankBalanceMinutes;
      if (d.status === 'falta') acc.absences += 1;
      if (d.status === 'pendente_ajuste') acc.pending += 1;
      if (d.status === 'justificado') acc.justified += 1;
      return acc;
    },
    { expected: 0, worked: 0, delay: 0, earlyExit: 0, overtime: 0, bank: 0, absences: 0, pending: 0, justified: 0 }
  );
}
