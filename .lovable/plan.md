

## Corrigir Indicadores do Televendas para Refletir Filtros Aplicados

### Problema

Os indicadores (DashboardCards, Pipeline Operacional, Producao do Mes) usam `centralStats` que e calculado sobre `televendas` (dados completos, sem filtro). Quando o usuario aplica filtros (produto, mes, usuario, status), a lista filtra corretamente mas os KPIs continuam mostrando os totais gerais.

### Solucao

**Arquivo unico**: `src/modules/televendas/TelevendasModule.tsx`

1. **Criar `filteredStats`** — uma segunda chamada ao hook `useTelevendasStats` passando `filteredTelevendas` em vez de `televendas`:
```
const filteredStats = useTelevendasStats(filteredTelevendas, bankCalculationModel);
```

2. **Substituir `centralStats` por `filteredStats`** nos componentes visuais:
   - `DashboardCards stats={filteredStats}`
   - `BankingPipeline pipelineCounts={filteredStats.pipelineCounts}` + criticos/alertas
   - `ProductionBar stats={filteredStats}`
   - `StalledAlertBanner criticos/alertas`

Isso faz com que todos os indicadores reflitam exatamente os mesmos dados que aparecem na listagem filtrada. O hook `useTelevendasStats` ja esta pronto e aceita qualquer array de `Televenda[]` — nao precisa de alteracao.

### Detalhes tecnicos

- Linha 104: manter `centralStats` (pode ser util para referencia geral)
- Adicionar logo abaixo: `const filteredStats = useTelevendasStats(filteredTelevendas, bankCalculationModel);`
- Linhas 688-712: trocar todas as referencias de `centralStats` para `filteredStats`

