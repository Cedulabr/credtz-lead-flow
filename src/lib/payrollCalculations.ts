import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { evaluateDay, summarizePeriod, type DaySchedule, type DiscountMode, type DayOffType } from './timeClockEngine';

export interface PayrollUserInput {
  userId: string;
  userName: string;
  salary: number;
  workDays: number[];
  dailyHours: number;
  /** Schedule completo opcional. Se ausente, usa dailyHours/workDays + 08:00-18:00. */
  schedule?: Partial<DaySchedule>;
  records: Array<{ clock_date: string; clock_time: string; clock_type: string }>;
  dayOffs: Array<{
    off_date: string;
    off_type?: DayOffType | 'feriado';
    is_partial_day?: boolean;
    start_time?: string | null;
    end_time?: string | null;
  }>;
  approvedJustifications: string[]; // reference_date list
}

export interface PayrollComputeOptions {
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
  holidays: string[]; // yyyy-MM-dd
  now?: Date;
  discountMode?: DiscountMode;
}

export interface PayrollRates {
  valorHora: number;
  valorDia: number;
  monthlyHours: number;
  /** True quando há jornada cadastrada e parâmetros válidos para calcular o valor/hora. */
  configured: boolean;
}

/**
 * Fórmula CLT padrão para valor-hora e valor-dia a partir do salário base,
 * jornada contratual e dias úteis do período. Usar SEMPRE essa função em vez
 * de duplicar a fórmula nas telas — ver `mem://features/time-clock`.
 */
export function computeRates(
  salary: number,
  dailyHours: number | null | undefined,
  businessDays: number,
): PayrollRates {
  if (!salary || !dailyHours || !businessDays || dailyHours <= 0 || businessDays <= 0) {
    return { valorHora: 0, valorDia: 0, monthlyHours: 0, configured: false };
  }
  const monthlyHours = dailyHours * businessDays;
  const valorHora = salary / monthlyHours;
  const valorDia = valorHora * dailyHours;
  return { valorHora, valorDia, monthlyHours, configured: true };
}

export interface PayrollResultRow {
  userId: string;
  userName: string;
  salary: number;
  /** Jornada contratual (h/dia). null quando o colaborador não tem schedule cadastrada. */
  dailyHours: number | null;
  monthlyHours: number;
  valorHora: number;
  scheduleConfigured: boolean;
  expectedMinutes: number;
  workedMinutes: number;
  negativeMinutes: number;
  absences: number;
  pending: number;
  partialPending: number;
  dayOffs: number;
  holidays: number;
  delayMinutes: number;
  earlyExitMinutes: number;
  overtimeMinutes: number;
  bankBalanceMinutes: number;
  discountNegativeHours: number;
  discountAbsences: number;
  totalDiscount: number;
  netEstimated: number;
}

/**
 * Folha estimada baseada na engine única (`evaluateDay`).
 * Folgas, feriados e justificativas aprovadas têm prioridade máxima e nunca
 * geram falta/desconto/atraso/pendência.
 */
export function computePayrollRow(
  user: PayrollUserInput,
  opts: PayrollComputeOptions
): PayrollResultRow {
  const { startDate, endDate, holidays, now = new Date(), discountMode = 'financeiro' } = opts;
  const holidaySet = new Set(holidays);

  // Day-offs do tipo "feriado" também viram feriado
  const offByDate: Record<string, PayrollUserInput['dayOffs'][number]> = {};
  user.dayOffs.forEach(d => {
    offByDate[d.off_date] = d;
    if (d.off_type === 'feriado') holidaySet.add(d.off_date);
  });

  const justSet = new Set(user.approvedJustifications);
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });

  const sched: DaySchedule = {
    entry_time: user.schedule?.entry_time ?? '08:00',
    exit_time: user.schedule?.exit_time ?? '18:00',
    daily_hours: user.dailyHours,
    tolerance_minutes: user.schedule?.tolerance_minutes ?? 10,
    work_days: user.workDays,
  };

  const dayResults = days
    .filter(d => d <= now)
    .map(d => {
      const dateStr = format(d, 'yyyy-MM-dd');
      const off = offByDate[dateStr];
      let dayOff: { type: DayOffType; isPartial?: boolean; partialMinutes?: number } | null = null;
      if (off && off.off_type !== 'feriado') {
        let partialMinutes = 0;
        if (off.is_partial_day && off.start_time && off.end_time) {
          const [sh, sm] = String(off.start_time).split(':').map(Number);
          const [eh, em] = String(off.end_time).split(':').map(Number);
          partialMinutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
        }
        const type = (off.off_type as DayOffType) || 'folga';
        dayOff = { type, isPartial: !!off.is_partial_day, partialMinutes };
      }
      const dayRecords = user.records
        .filter(r => r.clock_date === dateStr)
        .map(r => ({ clock_type: r.clock_type as any, clock_time: r.clock_time }));
      return evaluateDay(dayRecords, sched, d.getDay(), {
        isHoliday: holidaySet.has(dateStr),
        dayOff,
        justified: justSet.has(dateStr),
      }, discountMode);
    });

  const summary = summarizePeriod(dayResults);
  const businessDays = dayResults.filter(d => d.expectedMinutes > 0).length || 22;
  const scheduleConfigured = !!user.schedule && (user.dailyHours ?? 0) > 0;
  const rates = computeRates(user.salary, scheduleConfigured ? user.dailyHours : null, businessDays);

  // Apenas faltas reais "consomem" minutos esperados — pendências/ajustes parciais
  // continuam contabilizando a diferença real como horas negativas (sem dia integral).
  const negativeMinutes = Math.max(
    0,
    summary.expected - summary.worked - summary.absences * user.dailyHours * 60
  );

  let discountNegativeHours = 0;
  let discountAbsences = 0;
  if (rates.configured) {
    if (discountMode === 'financeiro') {
      discountNegativeHours = (negativeMinutes / 60) * rates.valorHora;
      discountAbsences = summary.absences * rates.valorDia;
    } else if (discountMode === 'misto') {
      discountAbsences = summary.absences * rates.valorDia;
    }
  }
  const totalDiscount = discountNegativeHours + discountAbsences;
  const netEstimated = Math.max(0, user.salary - totalDiscount);

  return {
    userId: user.userId,
    userName: user.userName,
    salary: user.salary,
    dailyHours: scheduleConfigured ? user.dailyHours : null,
    monthlyHours: rates.monthlyHours,
    valorHora: rates.valorHora,
    scheduleConfigured: rates.configured,
    expectedMinutes: summary.expected,
    workedMinutes: summary.worked,
    negativeMinutes,
    absences: summary.absences,
    pending: summary.pending,
    partialPending: summary.partialPending,
    dayOffs: summary.dayOffs,
    holidays: summary.holidays,
    delayMinutes: summary.delay,
    earlyExitMinutes: summary.earlyExit,
    overtimeMinutes: summary.overtime,
    bankBalanceMinutes: summary.bank,
    discountNegativeHours,
    discountAbsences,
    totalDiscount,
    netEstimated,
  };
}
