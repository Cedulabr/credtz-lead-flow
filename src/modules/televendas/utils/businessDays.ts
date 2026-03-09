import { getBrazilianHolidays } from "@/components/TimeClock/brazilianHolidays";
import { format } from "date-fns";

/**
 * Calcula a data adicionando N dias úteis a partir de uma data base.
 * Considera sábados, domingos E feriados nacionais brasileiros.
 */
export const addBusinessDays = (startDate: Date, days: number): Date => {
  const result = new Date(startDate);
  let added = 0;

  // Pre-compute holiday set for relevant years
  const startYear = result.getFullYear();
  const holidaySet = new Set<string>();
  // Cover current year and next year in case the range crosses year boundary
  for (const year of [startYear, startYear + 1]) {
    for (const h of getBrazilianHolidays(year)) {
      holidaySet.add(h.date);
    }
  }

  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateStr = format(result, "yyyy-MM-dd");
    if (holidaySet.has(dateStr)) continue;

    added++;
  }
  return result;
};
