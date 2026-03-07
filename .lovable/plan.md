

## Plano: Módulo Radar de Oportunidades

### Visão Geral

Criar um módulo completo que funciona como um "scanner inteligente" da base externa `mailing_inss`, permitindo buscar clientes com filtros avançados, score de oportunidade, e sistema de créditos dedicado. A consulta será feita via nova edge function que conecta ao mesmo banco externo usado pelo `baseoff-external-query`.

### Arquitetura

```text
┌─────────────────────────────────────────┐
│  Frontend: RadarModule                   │
│  ├─ RadarSummaryCards (stats do topo)    │
│  ├─ RadarSmartFilters (perfis prontos)  │
│  ├─ RadarAdvancedFilters (modo expert)  │
│  ├─ RadarResults (cards de clientes)    │
│  ├─ RadarCreditsBar (créditos)          │
│  └─ RadarSavedFilters (filtros salvos)  │
├─────────────────────────────────────────┤
│  Edge Function: radar-opportunities      │
│  (consulta mailing_inss com filtros)    │
├─────────────────────────────────────────┤
│  Supabase Tables:                        │
│  ├─ radar_credits (saldo por user)      │
│  ├─ radar_credits_usage (consumo)       │
│  ├─ radar_credits_requests (recargas)   │
│  └─ radar_saved_filters (filtros salvos)│
└─────────────────────────────────────────┘
```

### 1. Banco de Dados — Novas Tabelas

**`radar_credits`**: Créditos dedicados ao Radar (separado do `user_credits` existente de Leads).
- `id`, `user_id` (FK profiles), `credits_balance`, `monthly_limit` (default 200), `credits_used_month`, `current_month`, `created_at`, `updated_at`

**`radar_credits_usage`**: Log de consumo.
- `id`, `user_id`, `action` (search/export), `credits_used`, `filter_used` (jsonb), `results_count`, `created_at`

**`radar_credits_requests`**: Pedidos de recarga.
- `id`, `user_id`, `quantity`, `status` (pending/approved/rejected), `admin_id`, `admin_note`, `created_at`, `updated_at`

**`radar_saved_filters`**: Filtros salvos pelo usuário.
- `id`, `user_id`, `name`, `filters` (jsonb), `created_at`

RLS: usuários acessam apenas seus próprios registros. Admins acessam tudo.

### 2. Edge Function: `radar-opportunities`

Conecta ao mesmo banco externo (`BASEOFF_PG_*` env vars) e executa queries com filtros:

**Parâmetros de entrada:**
```json
{
  "filters": {
    "uf": "SP",
    "cidade": "São Paulo",
    "banco_emprestimo": "PAN",
    "parcelas_pagas_min": 12,
    "qtd_contratos_min": 3,
    "valor_parcela_min": 400,
    "saldo_min": 5000,
    "esp_filter": "consignaveis_exceto_32_92",
    "ddb_range": "1-5",
    "representante": "nao"
  },
  "page": 1,
  "per_page": 50,
  "mode": "search" | "stats"
}
```

**Modo `stats`**: Retorna contagens para os 4 cards do topo sem retornar linhas (queries COUNT otimizadas).

**Modo `search`**: Retorna clientes agrupados por CPF com contratos inline, paginado. Cada cliente recebe um `opportunity_score` calculado:
- parcela >= 800: +30pts
- parcela >= 600: +20pts
- parcela >= 400: +10pts
- saldo >= 10000: +25pts
- saldo >= 5000: +15pts
- contratos >= 6: +15pts
- parcelas_pagas >= 36: +20pts
- parcelas_pagas >= 24: +10pts

Score -> classificação: Premium (70+), Alta (50+), Média (30+), Baixa (<30)

**Filtro de Espécie**:
- `consignaveis_exceto_32_92`: WHERE esp NOT IN ('32','92')
- `consignaveis_exceto_32_92_21_01`: WHERE esp NOT IN ('32','92','21','01')
- `consignaveis_exceto_loas`: WHERE esp NOT ILIKE '%loas%'
- Combinação das exclusões acima

### 3. Frontend — Estrutura do Módulo

**Arquivos a criar:**
```
src/modules/radar/
├─ RadarModule.tsx          (módulo principal com tabs/views)
├─ index.ts
├─ types.ts
├─ hooks/
│  ├─ useRadarSearch.ts     (hook de busca + paginação)
│  └─ useRadarCredits.ts    (hook de créditos)
├─ components/
│  ├─ RadarSummaryCards.tsx  (4 cards estatísticos no topo)
│  ├─ RadarSmartFilters.tsx  (perfis prontos clicáveis)
│  ├─ RadarAdvancedFilters.tsx (filtros manuais completos)
│  ├─ RadarResultCard.tsx   (card de cliente nos resultados)
│  ├─ RadarResultsList.tsx  (lista paginada de resultados)
│  ├─ RadarCreditsBar.tsx   (barra de créditos do usuário)
│  └─ RadarSavedFilters.tsx (filtros salvos)
```

### 4. Topo da Página — Summary Cards

4 cards clicáveis que aplicam filtros automáticos:
- **Alta Rentabilidade Portabilidade**: parcela >= 400 OR saldo >= 5000
- **Refinanciamento Forte**: parcelas_pagas >= 36
- **Parcelas Altas**: parcela >= 600
- **Clientes com Muitos Contratos**: contratos >= 6

Cada card mostra contagem (obtida via modo `stats`). Ao clicar, aplica o filtro e executa a busca.

### 5. Filtros Inteligentes (Smart Filters)

Badges/chips clicáveis que aplicam combinações de filtros predefinidas. Mesmo conceito dos summary cards mas com mais opções: Contratos Antigos (parcelas_pagas >= 24), etc.

### 6. Filtros Avançados

Drawer/collapsible com selects para: UF, Cidade, Banco, Parcelas pagas (faixas), Qtd contratos (faixas), Valor parcela (faixas), Espécie (presets), DDB (faixas), Representante (sim/não).

### 7. Resultados — Cards de Cliente

Card moderno com: Nome, Idade, UF, Qtd contratos, Maior parcela, Banco principal, Score badge (Premium/Alta/Média). Botões: "Ver cliente" (abre no BaseOff Consulta), "Adicionar à lista".

### 8. Paginação

Componente de paginação com seletor de resultados por página (50/100/200). Total de páginas calculado no backend.

### 9. Créditos

Barra fixa no topo mostrando créditos disponíveis e usados no mês. Consumo: 1 busca = 1 crédito, independente de resultados. Botão "Solicitar recarga" abre modal com campo de quantidade.

### 10. Admin — Gestão de Créditos Radar

Adicionar aba no painel admin existente (`AdminOperations` ou `AdminPeople`) para:
- Definir limite mensal por usuário
- Adicionar créditos manualmente
- Ver consumo por usuário
- Aprovar/rejeitar pedidos de recarga

### 11. Integração no Sistema

- **LazyComponents.tsx**: Adicionar `RadarModule` lazy
- **Navigation.tsx**: Adicionar item `{ id: "radar", label: "Radar de Oportunidades", icon: Radar, permissionKey: "can_access_radar" }`
- **Index.tsx**: Adicionar tab `radar` no `tabComponents` e `TAB_PERMISSIONS`
- **profiles**: Adicionar coluna `can_access_radar` (boolean, default false) via migration

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---|---|
| `supabase/functions/radar-opportunities/index.ts` | Nova edge function |
| `src/modules/radar/*` (10 arquivos) | Novo módulo frontend |
| `src/components/LazyComponents.tsx` | Adicionar lazy import |
| `src/components/Navigation.tsx` | Adicionar nav item |
| `src/pages/Index.tsx` | Adicionar tab + permission |
| Migration SQL | 4 tabelas + RLS + coluna profiles |

### Estimativa

Este é um módulo grande. Será implementado em etapas sequenciais: DB → Edge Function → Frontend core → Integração no sistema → Admin panel.

