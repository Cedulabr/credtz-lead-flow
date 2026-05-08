## Objetivo

Melhorar o painel "Lançar ajuste" (em `AdjustmentReview.tsx`, usado por admin/gestor) para mostrar e tratar em massa as pendências do mês de qualquer colaborador, com filtros, ordenação e lançamento em lote.

## Diagnóstico

- Hoje o painel "Pendências do mês" só existe em `AdjustmentRequest.tsx` (visão do próprio colaborador). O diálogo "Lançar ajuste" do admin não carrega pendências — por isso o "campo novo" parece vazio.
- Não há filtro por colaborador, nem por tipo de pendência, nem ação em lote.

## Mudanças (somente em `src/components/TimeClock/AdjustmentReview.tsx`)

### 1. Novo bloco "Pendências do mês" dentro do diálogo "Lançar ajuste"

- Carregar registros de `time_clock` do mês selecionado para todos os colaboradores visíveis (admin: todos; gestor: `companyUserIds`).
- Rodar `evaluateDay` (de `src/lib/timeClockEngine.ts`) por usuário/dia para identificar dias com `pendente_ajuste` ou `ajuste_parcial`.
- Excluir datas que já tenham solicitação `pending` ou `approved` (consultar `time_clock_adjustment_requests`).
- Listar cada pendência como linha: colaborador · data · tipo de problema (sem entrada / sem saída / pausa desbalanceada / parcial) · ação rápida.

### 2. Filtros e ordenação

- Filtro por **colaborador** (Select com a mesma lista `users` já carregada).
- Filtro por **tipo de pendência**:
  - Sem entrada
  - Sem saída
  - Pausa incompleta/desbalanceada
  - Ajuste parcial (outros)
- Filtro por **período** (date range, padrão mês atual).
- Ordenação: por colaborador (A→Z), data (mais antiga/recente), severidade (faltas de entrada/saída primeiro). Padrão: severidade desc + data asc, agrupando por colaborador.

### 3. Ação rápida "Lançar"

- Botão por linha que abre o formulário de criação já pré-preenchido (user_id, data, tipo sugerido, motivo padrão "Ajuste lançado pela gestão — registro incompleto").
- Mantém o fluxo atual de `submitCreate` (insert em `time_clock_adjustment_requests` com `status='approved'`).

### 4. Lançamento em lote

- Checkbox por linha + checkbox "selecionar todos visíveis" (respeita filtros).
- Botão "Lançar ajustes selecionados" abre um diálogo de confirmação com:
  - Campo único de **horário sugerido** por tipo (entrada padrão, saída padrão) — opcional; se vazio, mantém o turno padrão do colaborador (se não houver, usar 08:00 entrada / 18:00 saída como fallback configurável).
  - Campo único de **motivo** aplicado a todos.
- Submete em lote via `insert([...])` único na tabela `time_clock_adjustment_requests` com `status='approved'`, `reviewed_by=user.id`.
- Mostra toast com contagem de sucessos/erros e recarrega lista.

### 5. Detalhes técnicos

```text
Estado novo:
  pendingMonth: Array<{ user_id, name, date, type, severity, suggestedAdjType, suggestedTime }>
  pendFilters: { userId, type, from, to, sort }
  pendSelected: Set<string> // chaves "userId|date|type"

Fluxo:
  loadPending() -> busca time_clock por intervalo, agrupa por user/date,
                   roda evaluateDay, monta linhas + remove já solicitadas.
  bulkSubmit()  -> mapeia seleção em payloads e faz insert único.
```

- Tipo derivado do problema:
  - Falta `entrada` → `add_entry` (severity 1)
  - Falta `saida` → `add_exit` (severity 1)
  - Pausa desbalanceada → `add_break_start` ou `add_break_end` (severity 2)
  - Outros parciais → `other` (severity 3)

## Fora do escopo

- Não altera `AdjustmentRequest.tsx` (visão do colaborador), `timeClockEngine.ts`, nem regras de cálculo/discount.
- Não cria novas tabelas — usa as existentes (`time_clock`, `time_clock_adjustment_requests`, `user_companies`, `profiles` via RPC `get_profiles_by_ids`).
