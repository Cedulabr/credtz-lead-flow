

## Filtro "Trabalhados Hoje" no Activate Leads (Lista + Pipeline)

### Conceito

Adicionar um filtro toggle/switch "Trabalhados Hoje" que mostra apenas leads cujo `updated_at` é do dia atual. Isso permite ao gestor ver rapidamente quais leads foram movimentados/tratados no dia por cada usuario.

### Arquivos a modificar

**1. `src/modules/activate-leads/views/ActivatePipelineView.tsx`**
- Adicionar estado `filterWorkedToday` (boolean, default `false`)
- Adicionar um botao/toggle "Trabalhados Hoje" na barra de filtros (ao lado dos selects existentes), com icone `CalendarCheck`
- No `filteredLeads` useMemo, quando ativo, filtrar leads onde `updated_at` esta no dia de hoje (comparar `new Date(l.updated_at).toDateString() === new Date().toDateString()`)
- Incluir no calculo de `activeFilterCount`

**2. `src/components/ActivateLeads.tsx`**
- Adicionar o mesmo estado `filterWorkedToday` na secao de filtros da listagem
- Adicionar botao toggle na barra de filtros existente
- Aplicar filtro na lista de leads renderizados, filtrando por `updated_at` do dia atual
- Mostrar badge com quantidade de leads trabalhados hoje quando ativo

### Detalhes tecnicos

- O campo `updated_at` ja existe no tipo `ActivateLead` e e atualizado automaticamente quando o status muda (via `updateStatus` no hook)
- Filtro client-side — sem necessidade de alteracao no banco
- O toggle usa `Button` com `variant={filterWorkedToday ? "default" : "outline"}` para indicar estado ativo

