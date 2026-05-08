## Diagnóstico

Investigando o módulo de Ponto encontrei três causas que explicam o sintoma "lanço folga/ajuste e o histórico não atualiza":

1. **Folgas (`time_clock_day_offs`) não entram no histórico.**
   Os componentes `MyHistory.tsx`, `AdminControl.tsx` e `ManagerDashboard.tsx` montam a tabela do histórico exclusivamente a partir das batidas em `time_clock`. Quando você lança uma folga num dia sem batidas, esse dia simplesmente não aparece — e quando há batidas, a folga é ignorada no status/cálculo (continua como "falta" ou "incompleto").

2. **Justificativas (`time_clock_justifications`) também são ignoradas** nas mesmas telas. Hoje só o PDF e o `DiscountCalculator` consultam essa tabela, então o histórico nunca muda para "justificado".

3. **Ajustes aprovados não são aplicados ao ponto.**
   Em `AdjustmentReview.tsx`, aprovar uma solicitação só atualiza `time_clock_adjustment_requests.status = 'approved'`. Não existe trigger nem chamada que altere `time_clock` ou que rode `recalc_user_day` — apesar do toast dizer "dia recalculado". A função `recalc_user_day` existe no banco mas está órfã.

   Confirmado por `information_schema.triggers`: nenhum trigger em `time_clock*` hoje.

## Plano

### 1. Backend (migrations)

a) **Aplicar ajustes automaticamente quando aprovados**
   - Criar trigger `AFTER UPDATE` em `time_clock_adjustment_requests` que, ao mudar `status` para `approved`, executa a operação correspondente:
     - `inclusion` → INSERT em `time_clock` com o tipo/horário pedidos.
     - `correction` → UPDATE do registro em `time_clock` (`clock_time`, `status='ajustado'`).
     - `exclusion` → DELETE do registro alvo.
   - Após qualquer um dos três, chamar `recalc_user_day(user_id, data)` e gravar log em `time_clock_logs`.

b) **Recalcular ao mexer em folgas e justificativas**
   - Trigger `AFTER INSERT/UPDATE/DELETE` em `time_clock_day_offs` chamando `recalc_user_day`.
   - Trigger equivalente em `time_clock_justifications` (apenas quando `status='approved'`).

c) **Trigger geral em `time_clock`** (`AFTER INSERT/UPDATE/DELETE`) chamando `recalc_user_day`, usando `tg_time_clock_recalc` que já existe.

d) **Estender `recalc_user_day`** para considerar:
   - Se existir folga em `time_clock_day_offs` para o dia → status `folga` (zera expected/atrasos).
   - Se existir justificativa aprovada cobrindo o dia → status `justificado` em vez de `falta`.

### 2. Frontend (somente leitura, sem mudar regra de negócio)

e) **`MyHistory.tsx`, `AdminControl.tsx`, `ManagerDashboard.tsx`**
   - Buscar em paralelo, no mesmo período, `time_clock_day_offs` e `time_clock_justifications` (status approved) para os usuários exibidos.
   - No agrupamento por dia, criar "linhas virtuais" para dias que só têm folga ou justificativa (sem batidas), exibindo o tipo (Folga/Férias/Atestado/Justificado) e zerando colunas de horário.
   - Quando o dia tem batidas + folga/justificativa, sobrescrever o status final usando a mesma prioridade do `recalc_user_day` (folga > justificado > status calculado).
   - Re-fetch automático (já existe `loadHistory`/`loadRecords` no `useEffect`); apenas garantir que o `DayOffManager` e o `AdjustmentReview` disparem um refresh global via evento ou via `queryClient.invalidateQueries` quando aplicável.

### 3. Validação

- Lançar uma folga em dia sem batida → o dia aparece no histórico com badge "Folga" e não conta como falta.
- Lançar uma justificativa aprovada → status muda para "Justificado".
- Aprovar um ajuste de inclusão/correção/exclusão → o registro em `time_clock` é alterado e o histórico/PDF refletem imediatamente.
- Conferir `time_clock_day_summary` para o usuário/dia para garantir que `recalc_user_day` rodou.

### Detalhes técnicos

- Arquivos afetados: `src/components/TimeClock/MyHistory.tsx`, `AdminControl.tsx`, `ManagerDashboard.tsx`, `AdjustmentReview.tsx`, `DayOffManager.tsx`, e migration nova com 4 triggers + atualização de `recalc_user_day`.
- Sem alteração em `useTimeClock.ts` além de, opcionalmente, expor `recalcDay`.
- Nada muda no PDF (ele já lê folgas/justificativas).
