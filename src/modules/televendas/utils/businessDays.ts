/**
 * Calcula a data adicionando N dias úteis a partir de uma data base.
 * Não considera feriados, apenas sábados e domingos.
 */
export const addBusinessDays = (startDate: Date, days: number): Date => {
  const result = new Date(startDate);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dayOfWeek = result.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  return result;
};
