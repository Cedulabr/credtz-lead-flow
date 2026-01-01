import { format } from "date-fns";

/**
 * Parse dates safely without timezone month/day shifts.
 * - For DATE columns (YYYY-MM-DD), create a local date at 12:00 to avoid UTC offsets.
 * - For ISO strings (with timezone), normalize to a local date at 12:00.
 */
export const parseDateSafe = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;

  // DATE: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  }

  // ISO / timestamp
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;

  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0);
};

export const formatDateISO = (date: Date) => format(date, "yyyy-MM-dd");
