## Objetivo

Adicionar, na aba **"Pendências do mês"** do card **Revisão de Ajustes**, ações rápidas (1 clique) para resolver os problemas mais comuns que hoje deixam o dia como **"Registro Incompleto"**, sem precisar abrir o modal manual e digitar tudo de novo.

## Problemas tratados

A engine (`timeClockEngine.ts`) já detecta esses códigos. Vamos mapear cada um a uma ação rápida:

| Inconsistência detectada | Ação rápida sugerida |
|---|---|
| `ENTRADA_DUPLICADA` / `SAIDA_DUPLICADA` / `BATIDA_DUPLICADA` | **Remover batida duplicada** — mantém a 1ª (entrada) ou a última (saída) e remove as demais |
| `ENTRADA_SEM_SAIDA` | **Adicionar saída** — pré-preenche com `exit_time` da escala |
| `SAIDA_SEM_ENTRADA` | **Adicionar entrada** — pré-preenche com `entry_time` da escala |
| `PAUSA_INCOMPLETA` (início sem fim) | **Adicionar fim de pausa** — pré-preenche com `pausa_inicio + 1h` ou horário padrão da escala |
| `PAUSA_INCOMPLETA` (fim sem início) | **Adicionar início de pausa** — pré-preenche com `pausa_fim - 1h` |
| `SAIDA_ANTES_ENTRADA` / `PAUSA_INVERTIDA` | **Inverter horários** dos dois registros envolvidos |
| Caso não se encaixe | Fallback: abre o modal manual atual |

## Mudanças no frontend

### 1. `src/lib/timeClockEngine.ts` (helper puro, sem mudar lógica)
Exportar uma função utilitária `suggestQuickFixes(records, schedule, evaluation)` que retorna uma lista tipada:
```ts
type QuickFix =
  | { kind: 'remove_duplicate'; recordId: string; clockType: string; time: string; label: string }
  | { kind: 'add_missing'; clockType: 'entrada'|'saida'|'pausa_inicio'|'pausa_fim'; suggestedTime: string; label: string }
  | { kind: 'swap_times'; aId: string; bId: string; label: string };
```
Sem alterar `evaluateDay` nem cálculos.

### 2. `src/components/TimeClock/AdjustmentReview.tsx`
- Em cada `PendingRow`, calcular `quickFixes` via `suggestQuickFixes`.
- Renderizar até 3 botões pequenos por linha, antes do botão "Lançar ajuste":
  - "Remover entrada duplicada (08:01)"
  - "Adicionar saída 18:00"
  - "Adicionar fim de pausa 13:00"
- Estilo: `variant="outline"` com ícone (`Trash2`, `Plus`, `ArrowLeftRight`) e cor de destaque (amber para remoção, primary para adição).
- Cada botão chama um handler único `applyQuickFix(row, fix)` que:
  - **`remove_duplicate`** → `DELETE` direto em `time_clock` pelo `recordId` (mantendo log via `time_clock_logs`) **OU** cria um request `remove_record` já aprovado (decidir abaixo, ver perguntas).
  - **`add_missing`** → cria request `add_*` com `proposed_time = suggestedTime`, `status='approved'`, `decision_notes='Ajuste rápido'` e dispara o trigger `tg_apply_adjustment_request` que já insere em `time_clock`.
  - **`swap_times`** → 2 updates em `time_clock` + log.
- Confirmação rápida via `toast` (sem modal). Em caso de múltiplas correções no mesmo dia, mostrar botão extra **"Resolver tudo"** que aplica todos os fixes em sequência.

### 3. Visualização das batidas do dia (novo accordion)
Na linha de cada pendência, expandir e mostrar a lista atual de batidas com botão `X` ao lado de cada uma → remove rapidamente. Útil quando há 3+ duplicatas e o auto-fix não cobre.

### 4. `MyHistory.tsx`
Sem mudanças. Continua lendo `time_clock` — após os fixes acima o status muda automaticamente de "Registro Incompleto" para "Completo/Ajustado".

## Fora de escopo

- Mudar o trigger SQL ou a engine de cálculo.
- Mudar layout do PDF.
- Mudar o fluxo de pendências do colaborador (`AdjustmentRequest.tsx`).

## Verificação

1. Provocar um dia com entrada duplicada (2 batidas `entrada` no mesmo dia) → aparece botão **"Remover entrada duplicada"** → 1 clique → dia some da lista de pendências e PDF vira "Completo".
2. Provocar dia com `ENTRADA_SEM_SAIDA` → botão **"Adicionar saída 18:00"** → 1 clique → dia resolvido.
3. Pausa incompleta → botão de fim de pausa → resolvido.
