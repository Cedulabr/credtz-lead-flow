

## Fix Activate Leads — Pipeline Kanban funcional + Metricas + Editar Funil

### Problemas Atuais

1. **Pipeline e Metricas mostram placeholder** — o `ActivateLeadsModule.tsx` nao busca dados da tabela `activate_leads`, entao nao consegue alimentar as views Pipeline e Metricas
2. **Sem botao "Editar Funil"** no Kanban para criar/editar colunas
3. **Cards do Kanban** nao mostram telefone, contrato/produto nem tempo disponivel
4. **Colunas iniciais** precisam ser: Novo, Em Andamento, Fechado, Sem Possibilidade

### Plano

**1. Criar hook `useActivateLeads.ts`** — busca leads da tabela `activate_leads` com filtros de usuario/empresa, calcula stats (total, novos, emAndamento, segundaTentativa, fechados, semPossibilidade, alertas), busca lista de usuarios para filtros. Exporta `{ leads, stats, users, isLoading, updateStatus, refetch }`.

**2. Refatorar `ActivateLeadsModule.tsx`**:
- Usar `useActivateLeads()` para ter dados reais
- Passar `leads`, `stats`, `users` para `ActivatePipelineView` e `ActivateMetricsView`
- Remover placeholders e renderizar os componentes reais

**3. Atualizar `PIPELINE_STATUSES` em `types.ts`**:
- Colunas padrao: `['novo', 'em_andamento', 'fechado', 'sem_possibilidade']`

**4. Adicionar botao "Editar Funil" no `ActivatePipelineView.tsx`**:
- Reutilizar o componente `PipelineColumnsManager` do Leads Premium (adaptado para activate)
- Visivel apenas para admin/gestor
- Permite adicionar, remover e reordenar colunas do Kanban

**5. Melhorar `ActivateLeadCard.tsx`**:
- Mostrar telefone formatado (ja existe)
- Adicionar produto/contrato (`lead.produto`)
- Adicionar tempo decorrido desde criacao ("ha X horas")
- Adicionar CPF se disponivel

**6. Melhorar `ActivateMetricsView.tsx`**:
- Adicionar cards de conversao: taxa fechados/total, taxa sem_possibilidade/total
- Adicionar breakdown por usuario (quem tem mais leads, quem converte mais)

### Arquivos

| Arquivo | Acao |
|---------|------|
| `src/modules/activate-leads/hooks/useActivateLeads.ts` | Novo — hook principal de dados |
| `src/modules/activate-leads/ActivateLeadsModule.tsx` | Integrar hook + renderizar views reais |
| `src/modules/activate-leads/types.ts` | Ajustar PIPELINE_STATUSES padrao |
| `src/modules/activate-leads/views/ActivatePipelineView.tsx` | Adicionar botao Editar Funil + filtros |
| `src/modules/activate-leads/components/ActivateLeadCard.tsx` | Mostrar telefone, produto, tempo |
| `src/modules/activate-leads/views/ActivateMetricsView.tsx` | Metricas de conversao reais |

