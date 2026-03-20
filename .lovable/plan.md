

## Pipeline Kanban — Trocar "Em Andamento" por "Aguardando Retorno"

### Mudança

Substituir a coluna "Em Andamento" (`em_andamento`) pela coluna "Aguardando Retorno" (`aguardando_retorno`) no array `PIPELINE_COLUMNS` do `PipelineView.tsx`.

| Arquivo | Ação |
|---|---|
| `src/modules/leads-premium/views/PipelineView.tsx` | Linha 40: trocar `em_andamento`/`TrendingUp`/`Em Andamento` por `aguardando_retorno`/`Clock`/`Aguard. Retorno` |

As 6 colunas do kanban ficarão: **Novos → Auto Leads → Aguard. Retorno → Agendamento → Fechados → Recusados**

O status `em_andamento` continua existindo no sistema (filtros, lista), apenas não aparece como coluna no kanban.

