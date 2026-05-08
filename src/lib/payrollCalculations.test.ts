import { describe, it, expect } from 'vitest';
import { computePayrollRow } from './payrollCalculations';

const baseUser = {
  userId: 'u1',
  userName: 'Alana Rodrigues',
  salary: 2200,
  workDays: [1, 2, 3, 4, 5], // seg-sex
  dailyHours: 8,
};

const periodOpts = {
  startDate: '2026-04-01',
  endDate: '2026-04-30',
  holidays: ['2026-04-21'], // Tiradentes
  now: new Date('2026-05-01T00:00:00'),
};

describe('computePayrollRow', () => {
  it('cenário Alana: 2 folgas justificadas + parcial 4h + ajuste + folga + feriado', () => {
    // Dias úteis em abril/2026 (seg–sex), excluindo 21/04 (feriado): 21
    // Folgas full-day: 10/04 (sex), 13/04 (seg), 28/04 (ter) → 3 folgas
    // Folga parcial 20/04 (seg) 12:00–16:00 = 240 min
    // 27/04 ajuste manual com entrada 09:00 e saída 17:00 (fora do ar)
    // Para os outros 16 dias úteis assumimos jornada 09:00–18:00 (8h)
    const records: any[] = [];
    const allDays = [
      '2026-04-01','2026-04-02','2026-04-03','2026-04-06','2026-04-07',
      '2026-04-08','2026-04-09','2026-04-14','2026-04-15','2026-04-16',
      '2026-04-17','2026-04-22','2026-04-23','2026-04-24','2026-04-29',
      '2026-04-30','2026-04-27',
    ];
    allDays.forEach(d => {
      records.push({ clock_date: d, clock_type: 'entrada', clock_time: '09:00:00' });
      records.push({ clock_date: d, clock_type: 'saida', clock_time: '17:00:00' });
    });
    // 20/04 trabalhou só de manhã 09:00-12:00 (3h) — folga parcial à tarde
    records.push({ clock_date: '2026-04-20', clock_type: 'entrada', clock_time: '09:00:00' });
    records.push({ clock_date: '2026-04-20', clock_type: 'saida', clock_time: '12:00:00' });

    const row = computePayrollRow(
      {
        ...baseUser,
        records,
        dayOffs: [
          { off_date: '2026-04-10' },
          { off_date: '2026-04-13' },
          { off_date: '2026-04-28' },
          { off_date: '2026-04-20', is_partial_day: true, start_time: '12:00', end_time: '16:00' },
        ],
        approvedJustifications: [],
      },
      periodOpts
    );

    expect(row.dayOffs).toBe(3);
    // 17 dias úteis × 8h = 8160 min, + 20/04 reduzido (480-240=240): total 8400
    expect(row.expectedMinutes).toBe(17 * 480 + 240);
    // worked: 17*8h*60 + 3h*60 = 8340
    expect(row.workedMinutes).toBe(17 * 480 + 180);
    expect(row.absences).toBe(0);
    // só os 60 min de diferença em 20/04
    expect(row.negativeMinutes).toBe(60);
  });

  it('feriado nacional não conta como dia esperado', () => {
    const row = computePayrollRow(
      { ...baseUser, records: [], dayOffs: [], approvedJustifications: [] },
      { ...periodOpts, holidays: ['2026-04-01', '2026-04-21'] }
    );
    // 22 dias úteis em abril/2026 - 2 feriados = 20 → 20*8h*60
    expect(row.expectedMinutes).toBe(20 * 480);
  });

  it('justificativa aprovada evita contar falta (mas mantém horas esperadas)', () => {
    const rowJust = computePayrollRow(
      {
        ...baseUser,
        records: [],
        dayOffs: [],
        approvedJustifications: [
          '2026-04-01','2026-04-02','2026-04-03','2026-04-06','2026-04-07',
          '2026-04-08','2026-04-09','2026-04-10','2026-04-13','2026-04-14',
          '2026-04-15','2026-04-16','2026-04-17','2026-04-20','2026-04-22',
          '2026-04-23','2026-04-24','2026-04-27','2026-04-28','2026-04-29','2026-04-30',
        ],
      },
      periodOpts
    );
    expect(rowJust.absences).toBe(0);
    expect(rowJust.totalDiscount).toBe(0);
  });

  it('folga parcial cobrindo 8h zera o dia e conta como folga', () => {
    const row = computePayrollRow(
      {
        ...baseUser,
        records: [],
        dayOffs: [
          { off_date: '2026-04-15', is_partial_day: true, start_time: '08:00', end_time: '18:00' },
        ],
        approvedJustifications: [],
      },
      periodOpts
    );
    expect(row.dayOffs).toBe(1);
  });

  it('falta sem justificativa gera desconto financeiro', () => {
    const row = computePayrollRow(
      { ...baseUser, records: [], dayOffs: [], approvedJustifications: [] },
      periodOpts
    );
    // 21 dias úteis - 1 feriado = 20 dias de falta
    expect(row.absences).toBe(20);
    expect(row.discountAbsences).toBeGreaterThan(0);
  });
});
