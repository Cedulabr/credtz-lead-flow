

## Plano: Simulador Financeiro com Coeficiente Diário e IOF Federal

### Contexto

O simulador atual usa cálculos Price mensais simples com IOF fixo de 3%. Precisa evoluir para usar coeficiente financeiro diário (considerando dias até o primeiro vencimento) e IOF conforme regra federal (fixo 0,38% + diário 0,0082%/dia limitado a 365 dias).

### Alterações em `TrocoCalculator.tsx`

#### 1. Novos campos de estado

Adicionar campos de data na interface:
- `dataContratacao` (Date, default: hoje)
- `primeiroVencimento` (Date, default: hoje + 30 dias)

Campos calculados automaticamente:
- `diasAtePrimeiraParcela` = diferença em dias entre contratação e primeiro vencimento
- `ultimoVencimento` = primeiroVencimento + (prazo - 1) meses

#### 2. Novas funções financeiras

```ts
// Taxa diária equivalente
function taxaDiaria(taxaMensal: number): number {
  return Math.pow(1 + taxaMensal / 100, 1 / 30) - 1;
}

// PV com coeficiente diário (primeiro período fracionado)
function calcPVDiario(pmt: number, taxaMensalPct: number, n: number, diasPrimeiraParcela: number): number {
  const im = taxaMensalPct / 100;
  const id = taxaDiaria(taxaMensalPct);
  const fatorPrimeiro = Math.pow(1 + id, diasPrimeiraParcela);
  // PV = PMT / fatorPrimeiro + PMT * (1 - (1+im)^-(n-1)) / im  ... all discounted
  // Fórmula completa: primeiro período com dias reais, restante mensal
  if (im === 0) return pmt * n;
  const pvRestante = pmt * (1 - Math.pow(1 + im, -(n - 1))) / im;
  return (pmt + pvRestante) / fatorPrimeiro;
}

// IOF federal correto
function calcIOFFederal(valorFinanciado: number, prazoMeses: number): number {
  const iofFixo = valorFinanciado * 0.0038;
  const dias = Math.min(prazoMeses * 30, 365);
  const iofDiario = valorFinanciado * 0.000082 * dias;
  return iofFixo + iofDiario;
}
```

#### 3. Atualizar interface `RateResult`

Adicionar campos:
- `valorLiberado: number` (financiado - IOF)
- `cetMensal: number`
- `cetAnual: number`
- `totalOperacao: number` (parcela × prazo)

#### 4. Atualizar cálculos (`rateResults`, `novoEmprestimoResults`)

Substituir `calcPV` por `calcPVDiario` usando `diasAtePrimeiraParcela`. Substituir `IOF_PERCENT` fixo por `calcIOFFederal`. Calcular CET mensal e anual.

#### 5. UI — Campos de data

Na seção de parâmetros (abaixo do prazo), adicionar dois date pickers lado a lado:
- **Data da Contratação** (Calendar popover)
- **Primeiro Vencimento** (Calendar popover)

Abaixo, exibir em texto pequeno:
- Dias até 1ª parcela: **X dias**
- Último vencimento: **dd/MM/yyyy**

#### 6. UI — Colunas da tabela de resultados

Atualizar colunas Port/Refin:
| Taxa | Parcela | Vl. Financiado | IOF | Vl. Liberado | Troco | CET a.m. | CET a.a. |

Atualizar colunas Novo Empréstimo:
| Taxa | Parcela | Vl. Financiado | IOF | Liberado | CET a.m. | CET a.a. |

Para mobile: as colunas CET podem ficar em scroll horizontal (já tem `overflow-auto` na Table).

#### 7. CET — Cálculo

CET mensal ≈ taxa efetiva que iguala PV (com IOF embutido) às parcelas. Usar Newton-Raphson ou bisection para encontrar a taxa `r` tal que:

```
valorLiberado = PMT * (1 - (1+r)^-n) / r
```

CET anual = `(1 + cetMensal)^12 - 1`

### Resumo de arquivos

| Arquivo | Ação |
|---|---|
| `TrocoCalculator.tsx` | Adicionar date pickers, funções de coeficiente diário, IOF federal, CET, colunas extras |

### Resultado

O simulador passará a gerar resultados compatíveis com simuladores bancários reais, considerando dias até primeiro vencimento e IOF conforme legislação federal.

