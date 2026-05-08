## Problema

No painel **Solicitar Ajuste → Pendências do mês**, hoje só aparecem pendências do próprio usuário logado (filtro fixo `eq('user_id', user.id)`). Por isso colaboradoras como Jamile e os demais funcionários da empresa não aparecem, mesmo tendo 4+ registros incompletos. Também não há filtro por colaborador nem botão de lançar ajustes em lote.

A correção fica restrita ao componente `src/components/TimeClock/AdjustmentRequest.tsx` (frontend / apresentação) — sem mexer em regras de cálculo, RLS ou tabelas.

## O que vai mudar

### 1. Detectar papel do usuário logado
- Importar `useAuth` (já importado) e calcular `canManage = isAdmin || isGestor`.
- Para `gestor`, carregar a lista de `user_ids` da mesma empresa via `user_companies` (mesmo padrão usado em `AdjustmentReview.tsx`).
- Para `admin`, considerar todos os colaboradores ativos.
- Para usuário comum, manter o comportamento atual (só o próprio `user.id`).

### 2. Carregar pendências de todos os colaboradores visíveis
Quando `canManage = true`:
- Trocar a query de `time_clock` para usar `.in('user_id', visibleIds)` no intervalo do mês.
- Buscar em paralelo:
  - `time_clock_schedules` ativos (`.in('user_id', visibleIds)`) para ter a jornada de cada um.
  - `time_clock_day_offs` no período `.in('user_id', visibleIds)`.
  - `time_clock_justifications` aprovadas no período `.in('user_id', visibleIds)`.
  - Nomes via RPC `get_profiles_by_ids(visibleIds)` (padrão Two-Step Profile Fetch já usado no projeto).
- Agrupar registros por `user_id + clock_date` e rodar `evaluateDay` para cada combinação, mantendo apenas `pendente_ajuste` ou `ajuste_parcial`.

Estrutura por linha:
```
{ user_id, user_name, date, result, records, missingTypes,
  suggestedType, reasonText, severity, problemKind }
```
Onde `problemKind` ∈ `entrada` | `saida` | `pausa` | `outro` e `severity` (1=entrada/saída, 2=pausa, 3=outro) — mesmas regras já usadas em `AdjustmentReview`.

### 3. Filtros e ordenação
Acima da lista, adicionar (somente quando `canManage`):
- **Colaborador** (`Select`) — opção "Todos" + lista vinda do RPC.
- **Tipo de problema** — Todos / Falta de entrada / Falta de saída / Pausa desbalanceada / Outro.
- **De / Até** — já existem.
- **Ordenar por** — Severidade (padrão), Nome, Data.

### 4. Bloqueio inteligente de duplicidade
Hoje `blockedDates` só considera as solicitações do próprio usuário. Passar a buscar `time_clock_adjustment_requests` com `.in('user_id', visibleIds)` no período e construir `blockedKeys = Set("user_id|clock_date")`. A linha fica desabilitada se a chave existir com status `pending` ou `approved`.

### 5. "Lançar ajuste" individual
Hoje o botão abre o dialog pré-preenchido só para o próprio user. Adicionar `target_user_id` quando admin/gestor, e enviar o `INSERT` com:
- `user_id = target_user_id` (não `user.id`)
- `company_id = companyId`
- `status = 'approved'` e `reviewed_by = user.id` (mesmo padrão do AdjustmentReview, evita pedir aprovação para si mesmo)
Para usuário comum sem `canManage`, manter `status = 'pending'`.

### 6. Lançamento em lote
Quando `canManage`:
- Checkbox por linha + "Selecionar todas visíveis".
- Botão **"Lançar em lote"** abre dialog com:
  - Horários padrão por tipo (entrada, saída, início pausa, fim pausa) — fallback para a `entry_time/exit_time` da jornada de cada colaborador caso o campo fique vazio.
  - Motivo único aplicado a todos.
- Cria `INSERT` único em `time_clock_adjustment_requests` com `status='approved'` e `reviewed_by=user.id`.
- Toast com contagem de sucesso/erro e refresh do painel + lista de solicitações.

### 7. Para usuário comum
Tudo permanece como hoje: só vê o próprio painel, sem filtro de colaborador nem botão de lote, e novas solicitações continuam saindo como `pending`.

## Detalhes técnicos

- Estados novos: `visibleUsers`, `filterUserId`, `filterProblem`, `sortBy`, `selected: Set<string>`, `bulkOpen`, `bulkEntry/Exit/PauseIni/PauseFim`, `bulkReason`.
- Reaproveitar lógica de `severity`, `problemKind` e `suggestedType` já desenvolvida em `AdjustmentReview.tsx` para manter consistência.
- Performance: limitar a janela ao período selecionado (default mês corrente). Usar `Promise.all` para consultas independentes. Ignorar dias futuros (`> hoje`).
- RLS: como `gestor`/`admin` já têm permissão de SELECT em `time_clock`, `time_clock_schedules`, `time_clock_day_offs`, `time_clock_justifications` e `time_clock_adjustment_requests` para sua empresa, não há mudanças de policy.

## Fora do escopo

- Não alterar `timeClockEngine.ts`, lógica financeira ou regras de desconto.
- Não duplicar para `AdjustmentReview.tsx` (já tem essa funcionalidade).
- Sem novas tabelas/migrations.
