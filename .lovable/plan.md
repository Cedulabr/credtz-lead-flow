

## Activate Leads — KPI Cards, Filtros e Alertas 48h (estilo Leads Premium)

### O que sera feito

Adicionar ao modulo Activate Leads (nas abas Pipeline e Metricas) os mesmos elementos visuais do Leads Premium:

1. **KPI Cards** — Barra de indicadores com cards brancos, borda lateral colorida, numero grande + label (Total, Novos, Em Andamento, Fechados, Taxa Conversao, Alertas 48h)
2. **Filtros** — Dropdowns para Colaborador, Status e Convenio/Origem, com icone de filtro e badge de contagem
3. **Alertas 48h** — Card de alerta com destaque vermelho mostrando leads que passaram 48h sem mudar de status

### Arquivos a modificar

**`src/modules/activate-leads/views/ActivatePipelineView.tsx`**:
- Adicionar barra de KPI cards (6 cards: Total, Novos, Em Andamento, Fechados, Taxa Conversao, Alertas 48h) com o mesmo estilo `border-l-4` + icone em fundo colorido do Leads Premium
- Adicionar filtros: Colaborador (Select), Status (Select), Origem/Convenio (Select baseado em `lead.origem` ou `lead.produto`)
- Calcular alertas 48h (leads com `status === 'novo'` e `created_at > 48h`)
- Aplicar filtros ao Kanban

**`src/modules/activate-leads/views/ActivateMetricsView.tsx`**:
- Adicionar os mesmos KPI cards no topo
- Adicionar card de alertas 48h com lista dos leads vencidos (nome, telefone, tempo decorrido)

**`src/modules/activate-leads/hooks/useActivateLeads.ts`**:
- Adicionar calculo de `conversionRate` e `avgTime` nas stats
- Retornar origens unicas para filtro

**`src/modules/activate-leads/types.ts`**:
- Atualizar `ActivateLeadStats` com `conversionRate: number` e `avgTimeHours: number`

### Detalhes tecnicos

**KPI Cards** — Reutiliza o padrao exato do `PipelineView.tsx` do Leads Premium (linhas 302-378): `Card` com `border-l-4 border-l-{color}`, icone em `p-2 rounded-xl bg-{color}-100`, numero `text-2xl font-bold`, label `text-xs text-muted-foreground`.

**Filtros** — Mesmo padrao do Leads Premium (linhas 139-204): `Filter` icon + `Select` components em `flex items-center gap-3 flex-wrap`. Filtra por `assigned_to` (colaborador), `status`, e `origem`/`produto`.

**Alertas 48h** — Calculo: `(now - created_at) / (1000*60*60) >= 48` para leads com `status === 'novo'`. Mostrar no KPI card com cor vermelha pulsante e na lista do Kanban com borda vermelha.

### Resultado visual esperado

Identico a screenshot do Leads Premium que o usuario enviou: header com titulo, tabs, barra de filtros com dropdowns, e linha de KPI cards limpos com borda lateral colorida.

