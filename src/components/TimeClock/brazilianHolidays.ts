import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface BrazilianHoliday {
  date: string; // yyyy-MM-dd
  name: string;
  dayOfWeek: string;
}

/**
 * Calculate Easter date using the Meeus/Jones/Butcher algorithm
 */
function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day, 12, 0, 0);
}

export function getBrazilianHolidays(year: number): BrazilianHoliday[] {
  const easter = getEasterDate(year);

  const fixedHolidays = [
    { month: 0, day: 1, name: 'Confraternização Universal' },
    { month: 3, day: 21, name: 'Tiradentes' },
    { month: 4, day: 1, name: 'Dia do Trabalho' },
    { month: 8, day: 7, name: 'Independência do Brasil' },
    { month: 9, day: 12, name: 'Nossa Senhora Aparecida' },
    { month: 10, day: 2, name: 'Finados' },
    { month: 10, day: 15, name: 'Proclamação da República' },
    { month: 11, day: 25, name: 'Natal' },
  ];

  const mobileHolidays = [
    { date: subDays(easter, 47), name: 'Carnaval' },
    { date: subDays(easter, 2), name: 'Sexta-feira Santa' },
    { date: addDays(easter, 60), name: 'Corpus Christi' },
  ];

  const holidays: BrazilianHoliday[] = [];

  for (const h of fixedHolidays) {
    const d = new Date(year, h.month, h.day, 12, 0, 0);
    holidays.push({
      date: format(d, 'yyyy-MM-dd'),
      name: h.name,
      dayOfWeek: format(d, 'EEEE', { locale: ptBR }),
    });
  }

  for (const h of mobileHolidays) {
    holidays.push({
      date: format(h.date, 'yyyy-MM-dd'),
      name: h.name,
      dayOfWeek: format(h.date, 'EEEE', { locale: ptBR }),
    });
  }

  holidays.sort((a, b) => a.date.localeCompare(b.date));
  return holidays;
}
