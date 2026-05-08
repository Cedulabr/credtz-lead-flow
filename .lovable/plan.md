## Diagnóstico

Investiguei direto no banco com a Alana (id `8642cf4a…`) e identifiquei o motivo real de a folha não refletir folgas, justificativas nem ajustes:

1. **`recalc_user_day` está falhando em silêncio.**
   A função referencia `public.brazilian_holidays`, que **não existe** neste projeto. Os logs do Postgres confirmam: `relation "public.brazilian_holidays" does not exist`. Como o corpo termina com `EXCEPTION WHEN OTHERS THEN RAISE NOTICE`, o erro é engolido e o `INSERT` no `time_clock_day_summary` nunca acontece.
   Resultado: a tabela `time_clock_day_summary` está **com 0 linhas em todo o sistema**, mesmo com triggers ativos em `time_clock`, `time_clock_day_offs`, `time_clock_justifications` e `time_clock_adjustment_requests`. Tudo que depende dela (Painel de Risco, HRDashboard, banco de horas) mostra dados desatualizados.

2. **`recalc_user_day` não lê folgas nem justificativas.**
   Mesmo quando voltar a funcionar, a versão atual não consulta `time_clock_day_offs` nem `time_clock_justifications` — então o status nunca vira `folga` / `justificado` / `feriado` por essas tabelas. Confirmei rodando manualmente: para 10/04 da Alana (folga lançada) o status final continuaria `falta`.

3. **Folga parcial não é tratada na folha (`DiscountCalculator.tsx`).**
   Hoje, qualquer registro em `time_clock_day_offs` faz o dia inteiro ser pulado (zera expected). Para o caso da Alana em 20/04 (folga 12:00–16:00, parcial), o sistema ignora a jornada cheia em vez de subtrair só as 4h da folga parcial.

4. **Justificativas “aparecem” na folha, mas como o status calculado é `falta`,** elas só evitam o desconto da falta inteira; não acertam o status nas telas analíticas (que dependem do summary).

5. **Os ajustes da Alana de 27/04** (entrada para 09:00) e a folga de 28/04 estão aplicados na base (entrada às 09:51 BRT, folga registrada), mas como `time_clock_day_summary` está vazio, nenhuma view derivada se atualizou.

## Plano

### 1. Backend — migration única

a) **Reescrever `recalc_user_day`** mantendo a assinatura atual e a chamada via triggers, com estas mudanças:
- Remover a leitura de `public.brazilian_holidays`. Usar como única fonte de feriado o registro `time_clock_day_offs` com `off_type = 'feriado'` (já existe esse padrão no projeto).
- Carregar para o dia/usuário:
  - `time_clock_day_offs` (full-day e partial-day).
  - `time_clock_justifications` com `status = 'approved'` cobrindo a `reference_date`.
- Aplicar prioridade de status: `feriado` → `folga`/`ferias` → `justificado` → `falta` → calculado (`pendente_ajuste` / `observacao` / `ok`).
- Para folga full-day: zerar expected, worked, delay, early_exit, bank.
- Para folga **parcial** (`is_partial_day=true`): subtrair `(end_time − start_time)` de `expected_minutes`; recalcular `bank_balance` com esse expected reduzido; não gerar `delay`/`early_exit` no intervalo de folga.
- Para justificativa cobrindo o dia inteiro e sem batidas: status `justificado`, `bank_balance = 0`.
- Trocar `EXCEPTION WHEN OTHERS` por tratamento que **loga o erro real** (`RAISE WARNING` com `SQLERRM`) sem suprimir o `INSERT` quando a falha for em uma sub-rotina opcional.

b) **Backfill imediato** rodando `recalc_user_day` para o conjunto:
```text
SELECT DISTINCT user_id, clock_date FROM time_clock
UNION SELECT user_id, off_date FROM time_clock_day_offs
UNION SELECT user_id, reference_date FROM time_clock_justifications WHERE status='approved'
```
Isso popula `time_clock_day_summary` para todo histórico relevante, incluindo Alana.

### 2. Frontend — apenas `DiscountCalculator.tsx`

c) Diferenciar folga full-day x partial:
- Carregar `is_partial_day`, `start_time`, `end_time`, `off_type` dos `day_offs`.
- Se `is_partial_day = true`: manter o dia em `expectedMinutes`, mas subtrair os minutos cobertos pela folga parcial. Não contar o dia em `dayOffCount`.
- Se full-day (`folga`, `ferias`, `feriado`): comportamento atual (skip).
- Sem mudança em justificativas (já tratadas).

### 3. Validação

- Após o backfill, `time_clock_day_summary` deve ter linhas para Alana em 10/04, 12/04, 13/04 (`folga`), 20/04 (`observacao`/`ok` com expected reduzido), 21/04 (`feriado`), 27/04 (calculado normal) e 28/04 (`folga`).
- Painel de Risco e HRDashboard passam a refletir essas datas.
- `DiscountCalculator` mostra desconto de 20/04 considerando jornada de 6h − 4h de folga parcial = 2h esperadas naquele dia.
- Logs do Postgres deixam de registrar `relation "public.brazilian_holidays" does not exist`.

### Detalhes técnicos

Arquivos afetados:
- Nova migration com `CREATE OR REPLACE FUNCTION public.recalc_user_day(...)` + bloco `DO` de backfill.
- `src/components/TimeClock/DiscountCalculator.tsx` (somente o `forEach(day => ...)` no método `calculate`).

Sem mudança em triggers (eles já existem e estão ativos), em `useTimeClock.ts`, no PDF, ou em outras telas que já leem direto de `day_offs`/`justifications`.
