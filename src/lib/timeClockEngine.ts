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

export type DaySubStatus =
  | 'atraso_leve'
  | 'atraso_critico'
  | 'saida_antecipada'
  | 'saida_antecipada_grave'
  | 'jornada_incompleta'
  | 'registro_incompleto'
  | 'banco_positivo'
  | 'hora_extra'
  | 'folga_parcial'
  | null;

export type DayOffType = 'folga' | 'dsr' | 'escala_off' | 'ferias' | 'atestado';

export interface DayOffContext {
  type: DayOffType;
  isPartial?: boolean;
  partialMinutes?: number;
}

export interface DayContext {
  isHoliday?: boolean;
  dayOff?: DayOffContext | null;
  justified?: boolean;
  minBreakMinutes?: number;
}

export type DiscountMode = 'financeiro' | 'banco' | 'misto';

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
    | 'HORARIO_INVALIDO'
    | 'INTERVALO_INVALIDO';
  severity: 'high' | 'medium' | 'low';
  message: string;
  minutes?: number;
}

export interface DayResult {
  status: DayStatus;
  subStatus: DaySubStatus;
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
  /** Marca se o dia caiu em feriado (mesmo que tenha trabalhado). */
  wasHoliday?: boolean;
  /** Marca se o dia tinha day_off explícito (folga/dsr/escala_off/ferias/atestado). */
  wasDayOff?: boolean;
  /** Marca se o dia foi coberto por justificativa aprovada. */
  wasJustified?: boolean;
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
  INTERVALO_INVALIDO: 'Intervalo de pausa abaixo do mínimo legal',
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

export const subStatusLabels: Record<Exclude<DaySubStatus, null>, string> = {
  atraso_leve: 'Atraso Leve',
  atraso_critico: 'Atraso Crítico',
  saida_antecipada: 'Saída Antecipada',
  saida_antecipada_grave: 'Saída Antecipada Grave',
  jornada_incompleta: 'Jornada Incompleta',
  registro_incompleto: 'Registro Incompleto',
  banco_positivo: 'Banco Positivo',
  hora_extra: 'Hora Extra',
  folga_parcial: 'Folga Parcial',
};

export const subStatusColor: Record<Exclude<DaySubStatus, null>, { bg: string; text: string; border: string; pdfRgb: [number, number, number] }> = {
  atraso_leve:             { bg: 'bg-yellow-50',   text: 'text-yellow-700',   border: 'border-yellow-200',   pdfRgb: [254, 252, 232] },
  atraso_critico:          { bg: 'bg-orange-100',  text: 'text-orange-800',   border: 'border-orange-300',   pdfRgb: [255, 237, 213] },
  saida_antecipada:        { bg: 'bg-amber-100',   text: 'text-amber-800',    border: 'border-amber-300',    pdfRgb: [254, 243, 199] },
  saida_antecipada_grave:  { bg: 'bg-orange-200',  text: 'text-orange-900',   border: 'border-orange-400',   pdfRgb: [254, 215, 170] },
  jornada_incompleta:      { bg: 'bg-orange-100',  text: 'text-orange-800',   border: 'border-orange-300',   pdfRgb: [255, 237, 213] },
  registro_incompleto:     { bg: 'bg-red-100',     text: 'text-red-800',      border: 'border-red-300',      pdfRgb: [254, 226, 226] },
  banco_positivo:          { bg: 'bg-green-50',    text: 'text-green-700',    border: 'border-green-200',    pdfRgb: [240, 253, 244] },
  hora_extra:              { bg: 'bg-emerald-100', text: 'text-emerald-800',  border: 'border-emerald-300',  pdfRgb: [209, 250, 229] },
  folga_parcial:           { bg: 'bg-slate-100',   text: 'text-slate-700',    border: 'border-slate-300',    pdfRgb: [241, 245, 249] },
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
 *
 * Prioridade de status (do maior para o menor):
 *   feriado > folga (full) > justificado(sem registros) > folga parcial >
 *   inconsistência grave (pendente_ajuste) > observação > falta > ok
 *
 * @param ctxOrHoliday por compatibilidade aceita `boolean` (= isHoliday) ou DayContext.
 */
const DEFAULT_MIN_BREAK = 5; // minutos — abaixo disso a pausa é inválida

export function evaluateDay(
  records: ClockRecord[],
  schedule: DaySchedule | null,
  dayOfWeek: number,
  ctxOrHoliday: boolean | DayContext = false,
  discountMode: DiscountMode = 'financeiro'
): DayResult {
  const ctx: DayContext = typeof ctxOrHoliday === 'boolean' ? { isHoliday: ctxOrHoliday } : (ctxOrHoliday || {});
  const isHoliday = !!ctx.isHoliday;
  const dayOff = ctx.dayOff || null;
  const justified = !!ctx.justified;
  const minBreakMinutes = ctx.minBreakMinutes ?? DEFAULT_MIN_BREAK;

  const sched = schedule ?? DEFAULT_SCHEDULE;
  const isWorkDay = sched.work_days?.includes(dayOfWeek) ?? [1, 2, 3, 4, 5].includes(dayOfWeek);

  // expectedMinutes base (antes de ajustes por folga parcial)
  let expectedMinutes = isWorkDay && !isHoliday ? Math.round((sched.daily_hours || 0) * 60) : 0;

  // Folga parcial: reduz a jornada esperada
  const isPartialOff = !!(dayOff && dayOff.isPartial);
  if (isPartialOff && dayOff && dayOff.partialMinutes && dayOff.partialMinutes > 0) {
    expectedMinutes = Math.max(0, expectedMinutes - dayOff.partialMinutes);
  }

  const empty: DayResult = {
    status: 'sem_jornada',
    subStatus: null,
    inconsistencies: [],
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

  // === PRIORIDADE 1: FERIADO ===
  if (isHoliday) {
    if (records && records.length > 0) {
      const worked = computeWorkedMinutes(records);
      return {
        ...empty,
        status: worked > 0 ? 'ok' : 'feriado',
        subStatus: worked > 0 ? 'hora_extra' : null,
        workedMinutes: worked,
        overtimeMinutes: worked,
        bankBalanceMinutes: worked,
        expectedMinutes: 0,
        wasHoliday: true,
      };
    }
    return { ...empty, status: 'feriado', expectedMinutes: 0, wasHoliday: true };
  }

  // === PRIORIDADE 2: FOLGA / DSR / ESCALA OFF / FÉRIAS / ATESTADO (full-day) ===
  if (dayOff && !isPartialOff) {
    const worked = records && records.length > 0 ? computeWorkedMinutes(records) : 0;
    return {
      ...empty,
      status: 'folga',
      subStatus: null,
      expectedMinutes: 0,
      workedMinutes: worked,
      overtimeMinutes: worked,
      bankBalanceMinutes: worked,
      wasDayOff: true,
    };
  }

  // === PRIORIDADE 3: JUSTIFICATIVA APROVADA sem registros ===
  if (justified && (!records || records.length === 0)) {
    return { ...empty, status: 'justificado', expectedMinutes: 0, wasJustified: true };
  }

  // === PRIORIDADE 4: FOLGA PARCIAL com expected zerado pela cobertura total ===
  if (isPartialOff && expectedMinutes === 0) {
    return { ...empty, status: 'folga', subStatus: 'folga_parcial', expectedMinutes: 0, wasDayOff: true };
  }

  // === Sem registros em dia útil ===
  if (!records || records.length === 0) {
    if (!isWorkDay) return { ...empty, status: 'sem_jornada' };
    const bankOnAbsence = discountMode === 'banco' ? -expectedMinutes : 0;
    return { ...empty, status: 'falta', bankBalanceMinutes: bankOnAbsence };
  }

  // ====== A partir daqui: dia útil normal (ou folga parcial com janela útil) ======
  const incons: Inconsistency[] = [];
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
  if (entries.length >= 1 && exits.length === 0 && isWorkDay) {
    incons.push({ code: 'ENTRADA_SEM_SAIDA', severity: 'high', message: inconsistencyLabels.ENTRADA_SEM_SAIDA });
  }

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
      for (let i = 0; i < pInicios.length; i++) {
        const ini = timeToMinutes(pInicios[i].clock_time);
        const fim = timeToMinutes(pFins[i].clock_time);
        if (fim < ini) {
          incons.push({ code: 'PAUSA_INVERTIDA', severity: 'high', message: inconsistencyLabels.PAUSA_INVERTIDA });
        } else {
          const dur = fim - ini;
          if (dur > 0 && dur < minBreakMinutes) {
            incons.push({ code: 'INTERVALO_INVALIDO', severity: 'high', message: inconsistencyLabels.INTERVALO_INVALIDO, minutes: dur });
          }
          breakMinutes += dur;
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
        // Em folga parcial, não cobramos saída antecipada se o expected reduziu
        earlyExitMinutes = isPartialOff ? 0 : Math.max(0, schedExit - exitMinute - tol);
        overtimeMinutes = Math.max(0, workedMinutes - expectedMinutes);
        bankBalance = workedMinutes - expectedMinutes;
      }
    }
  }

  const hasHigh = incons.some(i => i.severity === 'high');
  let status: DayStatus;
  let subStatus: DaySubStatus = null;

  if (hasHigh) {
    status = 'pendente_ajuste';
    subStatus = 'registro_incompleto';
    workedMinutes = 0;
    overtimeMinutes = 0;
    bankBalance = 0;
  } else if (delayMinutes > 0 || earlyExitMinutes > 0 || incons.length > 0) {
    status = 'observacao';
    const halfJornada = expectedMinutes / 2;
    if (workedMinutes > 0 && expectedMinutes > 0 && workedMinutes < halfJornada) {
      subStatus = 'saida_antecipada_grave';
    } else if (earlyExitMinutes > 30) {
      subStatus = 'saida_antecipada';
    } else if (delayMinutes > 15) {
      subStatus = 'atraso_critico';
    } else if (delayMinutes > 0) {
      subStatus = 'atraso_leve';
    } else if (workedMinutes > 0 && workedMinutes < expectedMinutes) {
      subStatus = 'jornada_incompleta';
    }
  } else if (workedMinutes === 0 && !isWorkDay) {
    status = 'sem_jornada';
    bankBalance = 0;
  } else {
    status = 'ok';
    if (overtimeMinutes > 0) subStatus = 'hora_extra';
    else if (bankBalance > 0) subStatus = 'banco_positivo';
  }

  if (isPartialOff && status === 'ok') subStatus = 'folga_parcial';

  if (!isWorkDay && status !== 'ok') bankBalance = 0;

  if (discountMode === 'financeiro' && bankBalance < 0 && (delayMinutes > 0 || earlyExitMinutes > 0)) {
    bankBalance = Math.max(bankBalance + (delayMinutes + earlyExitMinutes), bankBalance);
    if (bankBalance > 0) bankBalance = 0;
  }

  return {
    status,
    subStatus,
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
    wasDayOff: isPartialOff || undefined,
  };
}

/**
 * Computa minutos trabalhados a partir de batidas, ignorando inconsistências.
 * Usado em casos especiais (feriado/folga com trabalho).
 */
function computeWorkedMinutes(records: ClockRecord[]): number {
  const entry = records.find(r => r.clock_type === 'entrada');
  const exit = records.find(r => r.clock_type === 'saida');
  if (!entry || !exit) return 0;
  const e = timeToMinutes(entry.clock_time);
  const x = timeToMinutes(exit.clock_time);
  if (x <= e) return 0;
  const pIni = records.filter(r => r.clock_type === 'pausa_inicio').sort((a, b) => a.clock_time.localeCompare(b.clock_time));
  const pFim = records.filter(r => r.clock_type === 'pausa_fim').sort((a, b) => a.clock_time.localeCompare(b.clock_time));
  let brk = 0;
  for (let i = 0; i < Math.min(pIni.length, pFim.length); i++) {
    const a = timeToMinutes(pIni[i].clock_time);
    const b = timeToMinutes(pFim[i].clock_time);
    if (b > a) brk += b - a;
  }
  return Math.max(0, x - e - brk);
}

/**
 * Resume um período (mês) somando dias válidos.
 * Faltas/pendências/atrasos só são contadas em dias úteis sem folga/feriado/justificativa.
 */
export function summarizePeriod(days: DayResult[]) {
  return days.reduce(
    (acc, d) => {
      acc.expected += d.expectedMinutes;
      acc.worked += d.workedMinutes;
      acc.overtime += d.overtimeMinutes;
      acc.bank += d.bankBalanceMinutes;
      const isHolidayDay = d.wasHoliday || d.status === 'feriado';
      const isOffDay = d.wasDayOff || (d.status === 'folga');
      const isJustifiedDay = d.wasJustified || d.status === 'justificado';
      if (!isHolidayDay && !isOffDay && !isJustifiedDay) {
        acc.delay += d.delayMinutes;
        acc.earlyExit += d.earlyExitMinutes;
      }
      if (d.status === 'falta') acc.absences += 1;
      if (d.status === 'pendente_ajuste') acc.pending += 1;
      if (isJustifiedDay) acc.justified += 1;
      if (isHolidayDay) acc.holidays += 1;
      if (isOffDay) acc.dayOffs += 1;
      return acc;
    },
    { expected: 0, worked: 0, delay: 0, earlyExit: 0, overtime: 0, bank: 0, absences: 0, pending: 0, justified: 0, holidays: 0, dayOffs: 0 }
  );
}

