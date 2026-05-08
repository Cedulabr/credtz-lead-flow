## Diagnóstico

O bug vive em `src/lib/timeClockEngine.ts` no bloco final de classificação (linhas ~366-376) e em `src/lib/payrollCalculations.ts` (cálculo de `discountAbsences`).

Hoje, quando há QUALQUER inconsistência grave (`hasHigh`), a engine:

1. Marca `status = 'pendente_ajuste'` e `subStatus = 'registro_incompleto'`.
2. **Zera `workedMinutes`, `overtimeMinutes` e `bankBalance`** — mesmo quando entrada e saída válidas existem.

Em seguida, `computePayrollRow` faz:

```ts
discountAbsences = (summary.absences + summary.pending) * valorDia
```

Resultado: dias com inconsistências menores (ex.: pausa incompleta, batida duplicada, entrada duplicada, saída duplicada) entram como **falta integral financeira**, descartando todas as horas trabalhadas. Isso gera dupla penalização (atraso já contava + descontamos o dia inteiro) e zera horas válidas.

## Mudanças

### 1. `src/lib/timeClockEngine.ts` — preservar horas válidas em registros incompletos

Refatorar a classificação final (`hasHigh` branch) para diferenciar dois casos:

- **Inconsistência sem par entrada+saída válido** (ex.: `ENTRADA_SEM_SAIDA`, `SAIDA_SEM_ENTRADA`, `SAIDA_ANTES_ENTRADA`): mantém `pendente_ajuste` + `registro_incompleto` e `workedMinutes = 0` (não há como calcular).
- **Inconsistência com par entrada+saída válido** (ex.: `ENTRADA_DUPLICADA`, `SAIDA_DUPLICADA`, `PAUSA_INCOMPLETA`, `BATIDA_DUPLICADA`, `INTERVALO_INVALIDO`): **NÃO zerar** `workedMinutes/overtime/bank`; rebaixar para novo status `ajuste_parcial` (subStatus `registro_incompleto`) que NÃO conta como pendência integral nos somatórios.

Adicionar:
- Novo `DayStatus`: `'ajuste_parcial'` (rotulado "Ajuste Parcial Pendente"). Usa cor laranja/âmbar (não vermelho de falta).
- Em `summarizePeriod`: criar novo contador `partialPending` para dias `ajuste_parcial`. Esses dias **continuam somando `worked`/`delay`/`earlyExit`/`overtime`/`bank` normalmente** e **NÃO entram em `absences` nem `pending`**.
- Em `pendente_ajuste` "duro" (sem par válido): aplicar **ausência proporcional** quando possível — `workedMinutes` segue 0, mas o `negativeMinutes` calculado em `payrollCalculations` deve usar a diferença, não o dia inteiro.

Pseudocódigo da nova classificação:

```text
hasHigh && temParEntradaSaidaValido:
  status = 'ajuste_parcial'
  subStatus = 'registro_incompleto'
  // mantém workedMinutes/overtime/bank/delay/earlyExit
hasHigh && !temParEntradaSaidaValido:
  status = 'pendente_ajuste'
  subStatus = 'registro_incompleto'
  workedMinutes = 0, overtime = 0, bank = 0
```

### 2. `src/lib/payrollCalculations.ts` — eliminar dupla penalização

- Trocar `discountAbsences = (summary.absences + summary.pending) * valorDia` por `discountAbsences = summary.absences * valorDia` (somente faltas reais geram desconto integral).
- `negativeMinutes` passa a cobrir as horas faltantes de qualquer dia (incluindo `pendente_ajuste` e `ajuste_parcial`):
  - `negativeMinutes = max(0, expected - worked - absences*dailyMinutes)`
- Resultado:
  - `ajuste_parcial`: desconta apenas a diferença horária real (sem dia integral).
  - `pendente_ajuste` (duro): mostra como pendente para o RH ajustar; financeiramente entra como horas negativas (diferença), nunca como falta integral automática.
- Adicionar `partialPending` ao retorno (`PayrollResultRow`).

### 3. `src/components/TimeClock/TimeClockPDF.tsx`

- Rótulo da coluna Status para `ajuste_parcial`: "Ajuste Parcial" (laranja).
- Bloco TOTALIZADORES: separar `Pendentes (RH)` (= `pending`) de `Ajustes parciais` (= `partialPending`).
- Bloco Desconto estimado:
  - "Desconto por faltas integrais" (somente `absences`).
  - "Desconto por horas negativas" (cobre atrasos + saídas antecipadas + diferença de dias incompletos).
  - Remover qualquer linha "Desconto por pendências".

### 4. `src/components/TimeClock/ClosurePanel.tsx` e `DiscountCalculator.tsx`

- Atualizar para ler `partialPending` e parar de tratar `pendente_ajuste` como falta financeira.

### 5. Testes — `src/lib/payrollCalculations.test.ts`

Adicionar/atualizar cenários:

- **Pausa de 1 min em dia 09:00–17:00**: `workedMinutes ≈ 479`, `status = 'ajuste_parcial'`, `discountAbsences = 0`, `negativeMinutes` = diferença horária pequena.
- **Entrada duplicada com saída válida**: mantém worked, sem desconto integral.
- **Apenas entrada (sem saída)**: `pendente_ajuste`, `worked = 0`, `discountAbsences = 0`, `negativeMinutes` = jornada inteira.
- **Atraso de 30 min + pausa incompleta**: desconta apenas atraso (sem dupla penalização).
- Atualizar o teste existente "pausa de 1 minuto…" para validar que NÃO há mais desconto integral.

## Detalhes técnicos relevantes

```ts
// novo DayStatus
export type DayStatus =
  | 'ok' | 'observacao' | 'pendente_ajuste' | 'ajuste_parcial'
  | 'justificado' | 'falta' | 'feriado' | 'folga' | 'sem_jornada';

// summarizePeriod
if (d.status === 'ajuste_parcial') acc.partialPending += 1;
// pending continua só para 'pendente_ajuste' DURO
```

```ts
// payrollCalculations.ts
discountAbsences = summary.absences * valorDia; // antes: (absences + pending)
const consumedByAbsences = summary.absences * user.dailyHours * 60;
negativeMinutes = Math.max(0, summary.expected - summary.worked - consumedByAbsences);
discountNegativeHours = (negativeMinutes / 60) * valorHora;
```

## Itens fora de escopo

- Mudar UX dos managers de Day Off / Justificativas.
- Alterar o RPC `recalc_user_day` no banco.
- Recalcular registros antigos (pode ser feito depois via `SELECT recalc_user_day(...)`).
