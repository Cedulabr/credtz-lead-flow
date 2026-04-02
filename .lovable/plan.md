

## Fix "Trabalhados Hoje" — Mostrar minutagem e ordenar por mais recente

### Problemas

1. **Lista (`ActivateLeads.tsx`)**: Quando "Trabalhados Hoje" esta ativo, os leads nao sao ordenados do mais recente para o mais antigo. Tambem nao aparece nenhuma coluna/indicador de "Tratado ha Xmin" nas linhas da tabela.
2. **Pipeline (`ActivatePipelineView.tsx`)**: Ja funciona — cards mostram "Tratado ha 5min" permanentemente e o filtro ordena. Nenhuma mudanca necessaria aqui.

### Solucao

**Arquivo: `src/components/ActivateLeads.tsx`**

1. **Ordenar por `updated_at` desc quando filtro ativo** — Apos o `filter()` no `filteredLeads` useMemo (~linha 1549), adicionar `.sort()` por `updated_at` descendente quando `filterWorkedToday` esta true

2. **Adicionar coluna "Ultima Atividade" na tabela** — Nova `<TableHead>` "🕐 Ultima Atividade" entre Nome e Telefone. Na celula de cada lead, mostrar o tempo relativo preciso (ex: "Tratado ha 5min", "ha 1h 23min") em texto verde, usando a mesma logica do `getWorkedTimeLabel` do `ActivateLeadCard.tsx`. Esta coluna aparece sempre (nao so quando filtro ativo) para dar visibilidade.

3. **Ajustar `colSpan`** do estado vazio para acomodar a nova coluna

### Detalhes tecnicos

- Funcao helper `getWorkedTimeLabel(updatedAt: string)` calculando diff em minutos/horas
- Coluna com icone Clock + texto emerald-600 igual ao card do Kanban
- Sort: `result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())`

