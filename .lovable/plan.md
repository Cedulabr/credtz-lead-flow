

## Plano: Evolucao do Modulo de Oportunidades

### Situacao Atual

O modulo de oportunidades **so consulta a tabela `televendas`** (240 propostas pagas), buscando contratos com status pago para calcular elegibilidade de refinanciamento/portabilidade. Ele **ignora completamente** duas fontes criticas:

| Fonte | Dados disponiveis | Status atual |
|-------|-------------------|--------------|
| `propostas` (Meus Clientes) | **259 com contato futuro**, 59 nos proximos 5 dias | Nao integrado |
| `leads` (Leads Premium) | **9 com contato futuro**, 7 nos proximos 5 dias | Nao integrado |
| `televendas` (Propostas Pagas) | 240 pagas, 164 com data de pagamento | Ja integrado (unica fonte) |

### O que sera feito

#### 1. Expandir o hook `useOpportunities` para buscar 3 fontes

Adicionar queries paralelas para:
- **`propostas`** com `client_status = 'contato_futuro'` e `future_contact_date` proximo
- **`leads`** com `status = 'contato_futuro'` e `future_contact_date` proximo
- Manter a query existente de **`televendas`** pagas

Unificar os dados em um tipo `UnifiedOpportunity` com campo `source: 'televendas' | 'propostas' | 'leads'`.

#### 2. Redesenhar a Visao Geral em blocos

Substituir o `OpportunityOverview` atual por um layout de **3 blocos visuais distintos**:

```text
┌─────────────────────────────────────────────────────┐
│  KPI Cards (totais unificados)                      │
│  [Total Oportunidades] [Acao Hoje] [Proximos 5d]    │
└─────────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ REFINANCIAMENTO │ CONTATOS AGENDADOS │ LEADS QUENTES │
│ (televendas)    │ (propostas)        │ (leads)       │
│                 │                    │               │
│ 164 monitorados │ 259 agendados      │ 9 agendados   │
│ X elegiveis     │ 59 proximos 5d     │ 7 proximos 5d │
│                 │                    │               │
│ [Ver clientes]  │ [Ver clientes]     │ [Ver clientes]│
└──────────────┘ └──────────────┘ └──────────────┘

┌─────────────────────────────────────────────────────┐
│  Oportunidades por Banco (existente, mantido)       │
└─────────────────────────────────────────────────────┘
```

#### 3. Adicionar filtro por fonte na aba Clientes

Expandir `OpportunityFilter` com campo `source: 'all' | 'televendas' | 'propostas' | 'leads'` e adicionar esse filtro no `OpportunityFilters`.

#### 4. Expandir tipos e ClientDetail

Adicionar ao `OpportunityClient` o campo `source` e informacoes especificas de cada fonte (ex: `future_contact_date` para propostas/leads, `data_pagamento` para televendas). O `ClientDetail` exibira contexto diferente conforme a fonte.

### Arquivos modificados

| Arquivo | Acao |
|---------|------|
| `src/modules/opportunities/types.ts` | Adicionar `source` ao tipo, novo filtro, novos stats |
| `src/modules/opportunities/hooks/useOpportunities.ts` | 3 queries paralelas, calculo unificado |
| `src/modules/opportunities/components/OpportunityOverview.tsx` | Redesenhar com 3 blocos por fonte |
| `src/modules/opportunities/components/OpportunityFilters.tsx` | Filtro de fonte |
| `src/modules/opportunities/components/ClientDetail.tsx` | Contexto por fonte |
| `src/modules/opportunities/OpportunitiesModule.tsx` | Ajustar para novos dados |

