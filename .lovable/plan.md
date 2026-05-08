## Diagnóstico

A lógica de cálculo do espelho de ponto vive principalmente em `src/lib/timeClockEngine.ts` (função `evaluateDay` + `summarizePeriod`) e é consumida por `TimeClockPDF.tsx`, `ClosurePanel.tsx`, `DiscountCalculator.tsx` e `MyHistory.tsx`. Hoje ela só recebe `isHoliday` — **não recebe folga/DSR/escala OFF**. Resultado:

- Dias com `time_clock_day_offs` (folga, dsr, escala_off, ferias, atestado) entram na engine como dia útil normal e geram `falta`, `pendente_ajuste`, `saida_antecipada_grave`, etc.
- `summarizePeriod` soma esses dias em `absences` / `pending`.
- O PDF (`TimeClockPDF.tsx`) mostra o status da engine na coluna "Status" e calcula `descFaltas` / `descPendentes` em cima desse total inflado, mesmo já tendo o rótulo "FOLGA" na coluna observações.
- Só o tipo `feriado` é mesclado no `holidaySet` (linha 173-175). Os demais tipos passam batido.
- `DiscountCalculator.tsx` trata `dayOffsByUser` corretamente, mas `pendingDays` ainda é incrementado em dias com folga parcial mal coberta; e o módulo do PDF ignora esse cálculo paralelo.
- `evaluateDay` não valida intervalo mínimo (ex.: 24/04 com pausa de 1 min) e não impede status conflitantes.

## Mudanças

### 1. `src/lib/timeClockEngine.ts` — engine com prioridade de status
- Nova assinatura: `evaluateDay(records, schedule, dayOfWeek, { isHoliday, dayOff, justified, minBreakMinutes }, discountMode)`.
  - `dayOff?: { type: 'folga' | 'dsr' | 'escala_off' | 'ferias' | 'atestado'; isPartial?: boolean; partialMinutes?: number }`.
  - `justified?: boolean` (justificativa aprovada).
- Pipeline de prioridade (do mais alto ao mais baixo):
  1. `feriado` → status `feriado`, zera tudo (worked/over/bank/delay/early), nunca gera falta/pendente/desconto.
  2. `dayOff` full-day → status `folga` (sub-rotulo via `dayOff.type`), zera tudo. Se houver registros no dia, expõe apenas como observação informativa, nunca como inconsistência financeira.
  3. `dayOff` parcial → reduz `expectedMinutes` (`max(0, daily*60 - partialMinutes)`); só avalia atrasos/saídas/falta se `expectedMinutes > 0` E houver janela útil restante.
  4. `justified` sem registros → status `justificado`, zera deltas.
  5. Demais regras atuais (falta, pendente_ajuste, observação, ok).
- Adicionar `MIN_BREAK_MINUTES` (ex.: 5) e novo código `INTERVALO_INVALIDO` em `Inconsistency['code']` quando uma pausa < limite — sinaliza `severity: 'high'` (vira `pendente_ajuste`).
- Validação de status conflitantes: garantir que `status='falta'` nunca coexiste com `dayOff` ou `feriado`; `subStatus` só preenche quando `status` permite.
- `summarizePeriod`: passar a ignorar `feriado`, `folga` e `justificado` em `absences`/`pending`/`delay`/`earlyExit`. Adicionar contadores `holidays` e `dayOffs` no retorno para uso no PDF.

### 2. `src/components/TimeClock/TimeClockPDF.tsx`
- Construir `dayOffMap` com objeto `{ type, is_partial_day, start_time, end_time }` (já vem de `time_clock_day_offs`; ampliar select).
- Construir `justSet` com apenas justificativas `status='approved'`.
- Trocar chamada de `evaluateDay(...)` para passar o novo objeto de contexto (`dayOff`, `isHoliday`, `justified`).
- Coluna **Status**: priorizar `dayOffLabel` quando presente (FOLGA/DSR/ESCALA OFF/FERIADO/JUSTIFICADO) com cor própria; só cair no `subStatus` quando o dia é útil.
- Bloco **TOTALIZADORES**: ler `summary` ajustado (faltas/pendentes já excluem folgas).
- Bloco **Desconto estimado**:
  - `descFaltas = summary.absences * valorDia` (já corrigido pela engine).
  - `descPendentes = summary.pending * valorDia` (idem).
  - `descAtrasos` segue (`summary.delay + summary.earlyExit`), também já zerados em folga.
- Repetir os ajustes na geração diária (`generateDailyPDF`) e no PDF do gestor (linhas ~561-626).

### 3. `src/components/TimeClock/ClosurePanel.tsx`
- Buscar `time_clock_day_offs` (já busca) e `time_clock_justifications` no mesmo `Promise.all`; passar `dayOff` + `justified` para `evaluateDay`. Garante que o painel de fechamento não trave por folga marcada como pendente.

### 4. `src/components/TimeClock/DiscountCalculator.tsx`
- Eliminar o cálculo paralelo: usar `evaluateDay` + `summarizePeriod` (mesma fonte da verdade do PDF) por usuário, garantindo que dashboard e PDF batam.
- Pendências só contam quando `expectedMinutes > 0` e não há `dayOff`/`justified`.

### 5. `src/lib/payrollCalculations.ts`
- Refatorar `computePayrollRow` para delegar a `evaluateDay`, eliminando lógica duplicada e mantendo o tipo público para os testes.

### 6. Testes — `src/lib/payrollCalculations.test.ts`
Adicionar cenários cobrindo:
- Folga full-day sem batidas → `absences=0`, `dayOffs=1`, desconto = 0.
- Folga full-day **com** batidas residuais → status folga, desconto = 0, sem pendência.
- Folga parcial cobrindo metade do turno → `expectedMinutes` reduzido proporcionalmente.
- Feriado nacional + escala OFF → status feriado, sem desconto.
- Justificativa aprovada substitui falta.
- Falta real (dia útil sem folga/justificativa) → 1 absence, desconto = `valorDia`.
- Registro incompleto em dia útil → pendente. Em folga → ignorado.
- Pausa de 1 min → `INTERVALO_INVALIDO` + status `pendente_ajuste`.
- Banco de horas: jornada 9h em dia de 8h → +60 min de banco; dia com atraso só desconta financeiro (modo financeiro).
- Hora extra em sábado de escala 6h.
- Cenário replicando 10/04 e 13/04 do Alana (folga + falta) → desconto final = R$ 120 (apenas 29/04 e 30/04), líquido > R$ 930.

### 7. Recalcular registros existentes
- Após o deploy, disparar `recalc_user_day` (RPC já existente) para o período afetado dos colaboradores (ou criar migração que rode `SELECT recalc_user_day(user_id, dia)` para o mês 04/2026 de todos os usuários com folga registrada). Isso atualiza `time_clock_daily_summary` e qualquer view dependente do banco.

## Detalhes técnicos relevantes

```ts
// nova interface
export interface DayContext {
  isHoliday?: boolean;
  dayOff?: {
    type: 'folga' | 'dsr' | 'escala_off' | 'ferias' | 'atestado';
    isPartial?: boolean;
    partialMinutes?: number;
  };
  justified?: boolean;
  minBreakMinutes?: number; // default 5
}

export function evaluateDay(
  records: ClockRecord[],
  schedule: DaySchedule | null,
  dayOfWeek: number,
  ctx: DayContext = {},
  discountMode: DiscountMode = 'financeiro'
): DayResult
```

Ordem de aplicação dentro de `evaluateDay`:

```text
feriado  >  dayOff(full)  >  justificado(sem registros)
        >  dayOff(parcial)  >  validações de inconsistência
        >  cálculo normal (atraso / saída antecipada / banco)
```

`summarizePeriod` passa a ignorar `status ∈ { 'feriado', 'folga', 'justificado' }` para `absences`/`pending`/`delay`/`earlyExit`, mas continua somando `worked`/`overtime`/`bank` (caso o colaborador tenha trabalhado mesmo assim).

## Itens fora de escopo

- Mudar a UX da tela de DayOffManager / JustificationManager.
- Alterar o RPC `recalc_user_day` no banco (apenas chamamos no script de recomputação).
- Mexer em RLS ou novas tabelas.