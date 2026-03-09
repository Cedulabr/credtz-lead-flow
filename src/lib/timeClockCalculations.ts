import { parseISO } from 'date-fns';

export interface DaySchedule {
  entry_time: string;
  exit_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
  daily_hours: number;
  tolerance_minutes: number;
  work_days: number[];
}

export interface DayMetrics {
  workedMinutes: number;
  breakMinutes: number;
  delayMinutes: number;
  overtimeMinutes: number;
  status: 'present' | 'late' | 'absent' | 'incomplete' | 'on_break' | 'weekend';
}

interface ClockRecord {
  clock_type: string;
  clock_time: string;
  break_type_id?: string | null;
}

/**
 * Calculate all break minutes from multiple pausa_inicio/pausa_fim pairs
 */
export function calculateTotalBreakMinutes(records: ClockRecord[]): number {
  const pausaInicios = records
    .filter(r => r.clock_type === 'pausa_inicio')
    .sort((a, b) => a.clock_time.localeCompare(b.clock_time));
  const pausaFins = records
    .filter(r => r.clock_type === 'pausa_fim')
    .sort((a, b) => a.clock_time.localeCompare(b.clock_time));

  let totalBreak = 0;
  const pairCount = Math.min(pausaInicios.length, pausaFins.length);

  for (let i = 0; i < pairCount; i++) {
    const start = parseTimeToMinutes(pausaInicios[i].clock_time);
    const end = parseTimeToMinutes(pausaFins[i].clock_time);
    if (end > start) {
      totalBreak += end - start;
    }
  }

  return totalBreak;
}

/**
 * Parse a time string (HH:mm or ISO) to minutes since midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (timeStr.includes('T')) {
    const d = parseISO(timeStr);
    return d.getHours() * 60 + d.getMinutes();
  }
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Check if a user currently has an active break (pausa_inicio without pausa_fim)
 */
export function hasActiveBreak(records: ClockRecord[]): boolean {
  const pausaInicios = records.filter(r => r.clock_type === 'pausa_inicio').length;
  const pausaFins = records.filter(r => r.clock_type === 'pausa_fim').length;
  return pausaInicios > pausaFins;
}

/**
 * Calculate full day metrics comparing records against schedule
 */
export function calculateDayMetrics(
  records: ClockRecord[],
  schedule: DaySchedule | null,
  dayOfWeek: number
): DayMetrics {
  const defaultSchedule: DaySchedule = {
    entry_time: '08:00',
    exit_time: '18:00',
    lunch_start: '12:00',
    lunch_end: '13:00',
    daily_hours: 8,
    tolerance_minutes: 10,
    work_days: [1, 2, 3, 4, 5],
  };

  const sched = schedule || defaultSchedule;
  const isWorkDay = sched.work_days.includes(dayOfWeek);

  if (!isWorkDay) {
    // Weekend/off day - if they worked, count as overtime
    const entry = records.find(r => r.clock_type === 'entrada');
    const exit = records.find(r => r.clock_type === 'saida');
    if (entry && exit) {
      const entryMin = parseTimeToMinutes(entry.clock_time);
      const exitMin = parseTimeToMinutes(exit.clock_time);
      const breakMin = calculateTotalBreakMinutes(records);
      const worked = Math.max(0, exitMin - entryMin - breakMin);
      return {
        workedMinutes: worked,
        breakMinutes: breakMin,
        delayMinutes: 0,
        overtimeMinutes: worked,
        status: 'present',
      };
    }
    return { workedMinutes: 0, breakMinutes: 0, delayMinutes: 0, overtimeMinutes: 0, status: 'weekend' };
  }

  const entry = records.find(r => r.clock_type === 'entrada');
  const exit = records.find(r => r.clock_type === 'saida');

  if (!entry) {
    return { workedMinutes: 0, breakMinutes: 0, delayMinutes: 0, overtimeMinutes: 0, status: 'absent' };
  }

  // Check active break
  if (hasActiveBreak(records)) {
    const entryMin = parseTimeToMinutes(entry.clock_time);
    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();
    const breakMin = calculateTotalBreakMinutes(records);
    return {
      workedMinutes: Math.max(0, currentMin - entryMin - breakMin),
      breakMinutes: breakMin,
      delayMinutes: 0,
      overtimeMinutes: 0,
      status: 'on_break',
    };
  }

  if (!exit) {
    const entryMin = parseTimeToMinutes(entry.clock_time);
    const scheduledEntryMin = parseTimeToMinutes(sched.entry_time);
    const delayMinutes = Math.max(0, entryMin - scheduledEntryMin - sched.tolerance_minutes);
    return {
      workedMinutes: 0,
      breakMinutes: calculateTotalBreakMinutes(records),
      delayMinutes,
      overtimeMinutes: 0,
      status: delayMinutes > 0 ? 'late' : 'incomplete',
    };
  }

  // Full day calculation
  const entryMin = parseTimeToMinutes(entry.clock_time);
  const exitMin = parseTimeToMinutes(exit.clock_time);
  const breakMin = calculateTotalBreakMinutes(records);
  const workedMinutes = Math.max(0, exitMin - entryMin - breakMin);

  const scheduledEntryMin = parseTimeToMinutes(sched.entry_time);
  const delayMinutes = Math.max(0, entryMin - scheduledEntryMin - sched.tolerance_minutes);

  const expectedDailyMinutes = sched.daily_hours * 60;
  const overtimeMinutes = Math.max(0, workedMinutes - expectedDailyMinutes);

  let status: DayMetrics['status'] = 'present';
  if (delayMinutes > 0) status = 'late';

  return {
    workedMinutes,
    breakMinutes: breakMin,
    delayMinutes,
    overtimeMinutes,
    status,
  };
}

export function formatMinutesToHM(minutes: number): string {
  if (minutes <= 0) return '0h 0min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}min`;
}

export function formatMinutesToHMCompact(minutes: number): string {
  if (minutes <= 0) return '-';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, '0')}`;
}

/**
 * Calculate early exit minutes (exit before scheduled exit minus tolerance)
 */
export function calculateEarlyExitMinutes(
  exitTimeStr: string,
  scheduledExitStr: string,
  toleranceMinutes: number
): number {
  const exitMin = parseTimeToMinutes(exitTimeStr);
  const scheduledExitMin = parseTimeToMinutes(scheduledExitStr);
  return Math.max(0, scheduledExitMin - exitMin - toleranceMinutes);
}
