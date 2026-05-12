/**
 * Memória de cálculo da folha de ponto, em linguagem amigável para o colaborador.
 * Tela e PDF consomem o MESMO objeto — garante que a explicação sempre bate
 * com o valor descontado. Não duplique fórmulas: chame `buildPayrollExplanation`.
 */
import { format, parseISO } from 'date-fns';
import { computeRates } from './payrollCalculations';

export interface NegativeDayDetail {
  date: string;            // yyyy-MM-dd
  minutes: number;         // minutos negativos do dia
  reason?: 'atraso' | 'saida_antecipada' | 'jornada_incompleta' | 'outro';
}

export interface PayrollExplainInput {
  salary: number;
  dailyHours: number | null | undefined;     // null/undefined = jornada não cadastrada
  businessDays: number;                      // dias úteis do período
  expectedMinutes: number;
  workedMinutes: number;
  absenceCount: number;
  absenceDates: string[];                    // datas das faltas integrais (yyyy-MM-dd)
  negativeMinutes: number;                   // já calculado (sem contar faltas integrais)
  negativeDays?: NegativeDayDetail[];        // opcional: detalhe por dia
  discountMode?: 'financeiro' | 'banco' | 'misto';
}

export interface PayrollExplanation {
  scheduleConfigured: boolean;
  salary: number;
  dailyHours: number | null;
  businessDays: number;
  monthlyHours: number;
  valorHora: number;
  valorDia: number;

  /** Frases prontas, sem jargão, na ordem em que devem aparecer. */
  formulaValorHora: string;       // "R$ 800,00 ÷ (6h × 20 dias) = R$ 6,67/hora"
  formulaValorDia: string;        // "R$ 6,67/h × 6h = R$ 40,00/dia"

  absenceCount: number;
  absenceDates: string[];
  formattedAbsenceDates: string;  // "03/05, 10/05, 12/05..."
  discountAbsences: number;
  formulaDescAbsences: string;    // "7 faltas × R$ 40,00/dia = R$ 280,00"

  negativeMinutes: number;
  negativeHM: string;             // "23h 29min"
  discountNegativeHours: number;
  formulaDescNegative: string;    // "23h29min × R$ 6,67/h = R$ 156,60"
  negativeDays: NegativeDayDetail[];

  totalDiscount: number;
  netEstimated: number;
  discountMode: 'financeiro' | 'banco' | 'misto';

  /** Avisos para o colaborador entender restrições. */
  notices: string[];
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatHM = (totalMinutes: number) => {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h}h ${mm.toString().padStart(2, '0')}min`;
};

const formatDateBR = (iso: string) => {
  try {
    return format(parseISO(iso), 'dd/MM');
  } catch {
    return iso;
  }
};

export function buildPayrollExplanation(input: PayrollExplainInput): PayrollExplanation {
  const discountMode = input.discountMode ?? 'financeiro';
  const dailyHours = input.dailyHours && input.dailyHours > 0 ? input.dailyHours : null;
  const rates = computeRates(input.salary, dailyHours, input.businessDays);

  const formattedAbsenceDates = (input.absenceDates ?? [])
    .map(formatDateBR)
    .join(', ');

  const negativeHM = formatHM(input.negativeMinutes);

  let discountAbsences = 0;
  let discountNegativeHours = 0;
  if (rates.configured) {
    if (discountMode === 'financeiro') {
      discountAbsences = input.absenceCount * rates.valorDia;
      discountNegativeHours = (input.negativeMinutes / 60) * rates.valorHora;
    } else if (discountMode === 'misto') {
      discountAbsences = input.absenceCount * rates.valorDia;
    }
  }
  const totalDiscount = discountAbsences + discountNegativeHours;
  const netEstimated = Math.max(0, input.salary - totalDiscount);

  const formulaValorHora = rates.configured
    ? `${brl(input.salary)} ÷ (${dailyHours}h × ${input.businessDays} dias úteis) = ${brl(rates.valorHora)}/hora`
    : 'Jornada contratual ainda não cadastrada — fale com o RH.';

  const formulaValorDia = rates.configured
    ? `${brl(rates.valorHora)}/h × ${dailyHours}h = ${brl(rates.valorDia)}/dia`
    : '—';

  const formulaDescAbsences =
    input.absenceCount > 0 && rates.configured
      ? `${input.absenceCount} falta(s) × ${brl(rates.valorDia)}/dia = ${brl(discountAbsences)}`
      : `${input.absenceCount} falta(s) — sem desconto`;

  const negativeHours = input.negativeMinutes / 60;
  const formulaDescNegative =
    input.negativeMinutes > 0 && rates.configured
      ? `${negativeHM} (${negativeHours.toFixed(2).replace('.', ',')}h) × ${brl(rates.valorHora)}/h = ${brl(discountNegativeHours)}`
      : input.negativeMinutes > 0
        ? `${negativeHM} — sem desconto (jornada não cadastrada)`
        : 'Sem horas negativas no período';

  const notices: string[] = [];
  if (!rates.configured) {
    notices.push(
      'Sua jornada contratual não está cadastrada no sistema. Sem essa informação não conseguimos calcular o desconto financeiro de horas negativas. Procure o RH para regularizar.',
    );
  }
  if (discountMode === 'banco') {
    notices.push(
      'Modo de desconto: Banco de Horas. Faltas e atrasos não viram desconto em folha — o saldo é compensado no banco de horas.',
    );
  } else if (discountMode === 'misto') {
    notices.push(
      'Modo de desconto: Misto. Faltas integrais descontam em folha; horas negativas vão para o banco de horas.',
    );
  }

  return {
    scheduleConfigured: rates.configured,
    salary: input.salary,
    dailyHours,
    businessDays: input.businessDays,
    monthlyHours: rates.monthlyHours,
    valorHora: rates.valorHora,
    valorDia: rates.valorDia,
    formulaValorHora,
    formulaValorDia,
    absenceCount: input.absenceCount,
    absenceDates: input.absenceDates ?? [],
    formattedAbsenceDates,
    discountAbsences,
    formulaDescAbsences,
    negativeMinutes: input.negativeMinutes,
    negativeHM,
    discountNegativeHours,
    formulaDescNegative,
    negativeDays: input.negativeDays ?? [],
    totalDiscount,
    netEstimated,
    discountMode,
    notices,
  };
}

export const payrollFormat = { brl, formatHM, formatDateBR };
