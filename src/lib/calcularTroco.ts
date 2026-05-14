export interface TrocoInput {
  parcela: number;
  prazo: number;
}

export interface TrocoResult {
  valorBruto: number;
  iofEstimado: number;
  troco: number;
}

const TAXA_MENSAL = 0.0185;
const IOF_DIARIO = 0.000082;
const IOF_DIARIO_LIMITE = 0.03;
const IOF_ADICIONAL = 0.0038;

export function calcularTroco({ parcela, prazo }: TrocoInput): TrocoResult {
  if (!parcela || parcela <= 0 || !prazo || prazo <= 0) {
    return { valorBruto: 0, iofEstimado: 0, troco: 0 };
  }
  const pot = Math.pow(1 + TAXA_MENSAL, prazo);
  const fator = (TAXA_MENSAL * pot) / (pot - 1);
  const valorBruto = parcela / fator;
  const dias = prazo * 30;
  const iofTotalRate = Math.min(IOF_DIARIO * dias, IOF_DIARIO_LIMITE) + IOF_ADICIONAL;
  const iofEstimado = valorBruto * iofTotalRate;
  const troco = valorBruto - iofEstimado;
  return { valorBruto, iofEstimado, troco };
}

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// ===== Portabilidade (taxa 1,65% a.m.) =====
// Fator coeficiente bancário por prazo
export const FATOR_COEFICIENTE_PORTABILIDADE: Record<number, number> = {
  108: 0.02095,
  96: 0.021801,
  84: 0.023113,
};

export interface PortabilidadeInput {
  parcela: number;
  prazo: number; // 84 | 96 | 108
  saldoDevedor: number;
}

export interface PortabilidadeResult {
  fator: number;
  novoValorFinanciado: number; // parcela / fator
  saldoDevedor: number;
  valorLiberado: number; // troco (novoValorFinanciado - saldoDevedor)
}

export function calcularPortabilidade({
  parcela,
  prazo,
  saldoDevedor,
}: PortabilidadeInput): PortabilidadeResult {
  const fator = FATOR_COEFICIENTE_PORTABILIDADE[prazo] ?? 0;
  if (!parcela || parcela <= 0 || !fator) {
    return { fator, novoValorFinanciado: 0, saldoDevedor: saldoDevedor || 0, valorLiberado: 0 };
  }
  const novoValorFinanciado = parcela / fator;
  const valorLiberado = novoValorFinanciado - (saldoDevedor || 0);
  return {
    fator,
    novoValorFinanciado,
    saldoDevedor: saldoDevedor || 0,
    valorLiberado,
  };
}
