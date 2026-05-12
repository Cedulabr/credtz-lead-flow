## Diagnóstico

Você está certo. Para um estagiário que recebe R$ 800,00 e cumpre **6h/dia**, o valor/hora correto é:

```
800 ÷ (6h × 20 dias úteis) = 800 ÷ 120 = R$ 6,67/h
```

E não R$ 5,00/h (que é o resultado de `800 ÷ (8 × 20)`).

A fórmula em `src/lib/payrollCalculations.ts → computeRates()` já está correta — o problema é **o dado de entrada**: o estagiário do espelho analisado tem `time_clock_schedules.daily_hours = 8` (ou não tem schedule cadastrada). Na correção anterior bloqueamos o fallback silencioso de 8h na **Calculadora de Descontos**, mas:

1. O **espelho de ponto do colaborador** (`TimeClockPDF.tsx` + tela `MyHistory.tsx`) ainda **não mostra** a base de cálculo — o colaborador vê só o desconto final, sem entender de onde veio.
2. O `daily_hours` errado no banco continua existindo para os estagiários — precisa ser ajustado caso a caso no `ScheduleManager`.

## O que vou fazer

### 1. Bloco "Como seu desconto foi calculado" no espelho do colaborador

Adicionar no topo do espelho (tela `MyHistory.tsx` e PDF `TimeClockPDF.tsx`) um card didático em linguagem simples, sem jargão:

```text
┌─ Resumo financeiro do mês ─────────────────────────────────┐
│  Salário base ............................. R$ 800,00       │
│  Sua jornada contratual ................... 6h por dia      │
│  Dias úteis no mês ........................ 20 dias         │
│                                                              │
│  Como calculamos seu valor/hora:                            │
│    R$ 800,00 ÷ (6h × 20 dias) = R$ 6,67/hora                │
│  Como calculamos seu valor/dia:                             │
│    R$ 6,67/h × 6h = R$ 40,00/dia                            │
│                                                              │
│  Descontos do mês:                                          │
│  • 7 faltas integrais × R$ 40,00 ......... – R$ 280,00      │
│      (dias 03, 10, 12, 17, 22, 25, 28)                      │
│  • 23h29min de horas negativas × R$ 6,67 . – R$ 156,60      │
│      (somatório de atrasos + saídas antecipadas)            │
│                                                              │
│  Total de descontos ...................... – R$ 436,60      │
│  Líquido estimado a receber .............. R$ 363,40        │
└─────────────────────────────────────────────────────────────┘
```

Princípios:

- Mostrar **a conta** (não só o resultado): "R$ 800 ÷ (6 × 20) = R$ 6,67".
- Listar **as datas** das faltas e dos atrasos que somaram as horas negativas.
- Usar tooltips com `?` em "valor/hora", "horas negativas", "dias úteis" explicando cada termo em 1 frase.
- Quando a jornada não estiver cadastrada, exibir card amarelo "Sua jornada não está configurada — fale com o RH" e **não** mostrar valores de desconto financeiro (igual ao que já fizemos na Calculadora).

### 2. Mesma tabela na Calculadora de Descontos

Na `DiscountCalculator.tsx`, ao expandir a linha do colaborador, mostrar o mesmo bloco com a memória de cálculo + datas das ocorrências. Isso permite o gestor abrir junto com o colaborador e explicar.

### 3. PDF do espelho

Replicar o bloco no `TimeClockPDF.tsx` (jspdf), na primeira página, antes da tabela de batidas. Assim o colaborador que assina o espelho recebe a explicação por escrito.

### 4. Lista de auditoria de jornadas divergentes

Adicionar no `ScheduleManager.tsx` uma seção "Jornadas a revisar" que lista automaticamente:

- Colaboradores ativos **sem** `time_clock_schedules`.
- Colaboradores com `daily_hours = 8` mas `base_salary ≤ R$ 1.300` (provável estagiário).
- Colaboradores com salário compatível com meio período mas jornada de 8h.

Cada linha tem botão "Corrigir jornada" que abre o editor já no `daily_hours` do funcionário. **Não vou alterar nenhum dado automaticamente** — só evidenciar.

### 5. Centralizar o "explicador"

Criar `src/lib/payrollExplain.ts` com uma função pura:

```ts
export function explainPayroll(row: PayrollResultRow, dates: { absences: string[]; negatives: { date: string; minutes: number }[] }): PayrollExplanation
```

Tanto a tela quanto o PDF consomem o mesmo objeto — garante que valor exibido = valor descontado, sempre.

## Fora de escopo

- Não vou alterar a fórmula (continua `salário ÷ (jornada × dias úteis)` — padrão CLT).
- Não vou alterar `daily_hours` de ninguém automaticamente — apenas listar suspeitas.
- Não vou mexer em CHECK constraints, triggers ou no schema do banco.

## Resultado esperado

Para o estagiário do exemplo, depois do gestor corrigir a jornada para 6h no `ScheduleManager`:

- Espelho mostra: `R$ 800 ÷ (6 × 20) = R$ 6,67/h` e `R$ 40,00/dia` por extenso.
- Faltas: 7 × R$ 40,00 = **R$ 280,00** (com as 7 datas listadas).
- Horas negativas: 23,48h × R$ 6,67 ≈ **R$ 156,60** (com cada dia/minutos discriminados).
- Total: **R$ 436,60** descontado → líquido **R$ 363,40**.

E qualquer colaborador, leigo ou não, consegue ler o próprio espelho e bater a conta na calculadora.