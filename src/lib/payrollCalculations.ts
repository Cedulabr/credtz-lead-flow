import { eachDayOfInterval, format, parseISO } from 'date-fns';
import { calculateTotalBreakMinutes, parseTimeToMinutes } from '@/lib/timeClockCalculations';

export interface PayrollUserInput {
  userId: string;
  userName: string;
  salary: number;
  workDays: number[];
  dailyHours: number;
  records: Array<{ clock_date: string; clock_time: string; clock_type: string }>;
  dayOffs: Array<{ off_date: string; is_partial_day?: boolean; start_time?: string | null; end_time?: string | null }>;
  approvedJustifications: string[]; // reference_date list
}

export interface PayrollComputeOptions {
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
  holidays: string[]; // yyyy-MM-dd
  now?: Date;
  discountMode?: 'financeiro' | 'banco' | 'misto';
}

export interface PayrollResultRow {
  userId: string;
  userName: string;
  salary: number;
  expectedMinutes: number;
  workedMinutes: number;
  negativeMinutes: number;
  absences: number;
  dayOffs: number;
  discountNegativeHours: number;
  discountAbsences: number;
  totalDiscount: number;
  netEstimated: number;
}

/**
 * Pure payroll discount calculation. Mirrors the logic in DiscountCalculator.tsx
 * but isolated for unit testing.
 */
export function computePayrollRow(
  user: PayrollUserInput,
  opts: PayrollComputeOptions
): PayrollResultRow {
  const { startDate, endDate, holidays, now = new Date(), discountMode = 'financeiro' } = opts;
  const holidaySet = new Set(holidays);
  const userDayOffs = new Set<string>();
  const partialOffs: Record<string, number> = {};

  user.dayOffs.forEach(d => {
    if (d.is_partial_day && d.start_time && d.end_time) {
      const [sh, sm] = String(d.start_time).split(':').map(Number);
      const [eh, em] = String(d.end_time).split(':').map(Number);
      const mins = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
      partialOffs[d.off_date] = (partialOffs[d.off_date] || 0) + mins;
    } else {
      userDayOffs.add(d.off_date);
    }
  });

  const justSet = new Set(user.approvedJustifications);
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });

  let expectedMinutes = 0;
  let workedMinutes = 0;
  let absences = 0;
  let dayOffCount = 0;
  let pendingDays = 0;
  let businessDays = 0;

  days.forEach(day => {
    if (day > now) return;
    const dateStr = format(day, 'yyyy-MM-dd');
    const dow = day.getDay();
    if (!user.workDays.includes(dow)) return;
    if (holidaySet.has(dateStr)) return;

    if (userDayOffs.has(dateStr)) {
      dayOffCount++;
      return;
    }

    const partialOff = partialOffs[dateStr] || 0;
    const dailyExpected = Math.max(0, user.dailyHours * 60 - partialOff);
    if (dailyExpected === 0) {
      if (partialOff > 0) dayOffCount++;
      return;
    }

    expectedMinutes += dailyExpected;
    businessDays++;

    const dayRecords = user.records.filter(r => r.clock_date === dateStr);
    const entry = dayRecords.find(r => r.clock_type === 'entrada');
    const exit = dayRecords.find(r => r.clock_type === 'saida');

    if (entry && exit) {
      const eMin = parseTimeToMinutes(entry.clock_time);
      const xMin = parseTimeToMinutes(exit.clock_time);
      const brk = calculateTotalBreakMinutes(dayRecords);
      workedMinutes += Math.max(0, xMin - eMin - brk);
    } else if (entry && !exit) {
      if (!justSet.has(dateStr)) pendingDays++;
    } else if (!entry) {
      if (!justSet.has(dateStr)) absences++;
    }
  });

  const effectiveBusinessDays = businessDays || 22;
  const valorHora = user.salary > 0 ? user.salary / (user.dailyHours * effectiveBusinessDays) : 0;
  const valorDia = valorHora * user.dailyHours;
  const negativeMinutes = Math.max(
    0,
    expectedMinutes - workedMinutes - (absences + pendingDays) * user.dailyHours * 60
  );

  let discountNegativeHours = 0;
  let discountAbsences = 0;
  if (discountMode === 'financeiro') {
    discountNegativeHours = (negativeMinutes / 60) * valorHora;
    discountAbsences = (absences + pendingDays) * valorDia;
  } else if (discountMode === 'misto') {
    discountAbsences = (absences + pendingDays) * valorDia;
  }
  const totalDiscount = discountNegativeHours + discountAbsences;
  const netEstimated = Math.max(0, user.salary - totalDiscount);

  return {
    userId: user.userId,
    userName: user.userName,
    salary: user.salary,
    expectedMinutes,
    workedMinutes,
    negativeMinutes,
    absences: absences + pendingDays,
    dayOffs: dayOffCount,
    discountNegativeHours,
    discountAbsences,
    totalDiscount,
    netEstimated,
  };
}
