
## Plano: Evolucao do Relatorio de Desempenho para Gestores

### Situacao Atual

O modulo de Relatorio de Desempenho ja possui:
- Verificacao de acesso para Admin e Gestor
- Filtragem de usuarios por empresa (para gestores)
- Tabela de desempenho por colaborador com metricas de leads, propostas e valores
- Cards de resumo consolidado
- Modal de detalhes de atividades
- Exportacao para PDF, Excel e CSV

**Lacunas identificadas para gestao eficiente:**

| Aspecto | Status Atual | Melhoria Necessaria |
|---------|--------------|---------------------|
| Visao de equipe | Lista plana de colaboradores | Cards de equipe com indicadores rapidos |
| Alertas de inatividade | Nao existe | Destacar colaboradores inativos ha X dias |
| Comparativo de metas | Nao existe | Indicador visual de atingimento |
| Ranking de equipe | Ordenacao manual | Ranking automatico com destaques |
| Filtro de empresa (gestor) | Aplica automaticamente | Mostrar nome da empresa no header |
| Acoes rapidas | Apenas "ver detalhes" | Enviar mensagem, ver perfil |

### O que sera feito

#### 1. Novo componente `TeamOverviewCards`

Criar cards visuais com resumo rapido por colaborador:
- Avatar + nome
- Mini-indicadores (leads, propostas pagas, conversao)
- Badge de status: **Ativo** (atividade recente), **Alerta** (sem atividade ha 3+ dias), **Critico** (sem atividade ha 7+ dias)
- Clicavel para expandir detalhes

Layout em grid responsivo (3-4 cards por linha em desktop, 1 em mobile).

#### 2. Sistema de alertas de inatividade

Adicionar ao hook de dados:
- Calcular `daysSinceLastActivity` para cada usuario
- Classificar em: `active` (0-2 dias), `warning` (3-6 dias), `critical` (7+ dias)
- Exibir banner de alerta no topo se houver colaboradores criticos

#### 3. Header contextual para Gestor

Quando o usuario for gestor, exibir:
- Nome da empresa que gerencia
- Total de colaboradores da equipe
- Indicador de colaboradores ativos vs inativos

#### 4. Ranking visual da equipe

Substituir ou complementar a tabela com:
- Top 3 vendedores destacados (medalhas ouro/prata/bronze)
- Barra de progresso de conversao por colaborador
- Comparativo com media da equipe

#### 5. Melhorar filtros para Gestor

Simplificar a experiencia:
- Gestor ve apenas colaboradores de sua empresa (ja funciona)
- Adicionar filtro rapido por status de atividade (Todos, Ativos, Alertas, Criticos)

### Arquivos a modificar

| Arquivo | Acao |
|---------|------|
| `src/components/PerformanceReport/types.ts` | Adicionar campos `daysSinceLastActivity`, `activityStatus` |
| `src/components/PerformanceReport/index.tsx` | Integrar `useGestorCompany`, calcular status de atividade |
| `src/components/PerformanceReport/TeamOverviewCards.tsx` | **NOVO** - Cards visuais de equipe |
| `src/components/PerformanceReport/InactivityAlertBanner.tsx` | **NOVO** - Banner de alerta |
| `src/components/PerformanceReport/TeamRanking.tsx` | **NOVO** - Ranking visual |
| `src/components/PerformanceReport/SummaryCards.tsx` | Adicionar indicador de equipe para gestor |
| `src/components/PerformanceReport/ReportFilters.tsx` | Adicionar filtro de status de atividade |

### Estrutura Visual Proposta

```text
┌─────────────────────────────────────────────────────────────┐
│ Relatorio de Desempenho           [Empresa: ABC Creditos]   │
│ Equipe: 12 colaboradores | 9 ativos | 2 alertas | 1 critico │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ [!] ALERTA: 1 colaborador sem atividade ha mais de 7 dias   │
└─────────────────────────────────────────────────────────────┘

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 🥇 Maria  │ │ 🥈 Joao   │ │ 🥉 Ana    │ │ Pedro    │
│ 15 pagas │ │ 12 pagas │ │ 10 pagas │ │ 8 pagas  │
│ R$ 45k   │ │ R$ 38k   │ │ R$ 32k   │ │ R$ 25k   │
│ ●Ativo   │ │ ●Ativo   │ │ ●Alerta  │ │ ●Ativo   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

[Filtros: Periodo | Status Atividade | Colaborador]

[Cards KPI existentes]

[Tabela detalhada existente]
```

### Detalhes Tecnicos

**Calculo de status de atividade:**
```typescript
const getActivityStatus = (lastActivity: string | null): 'active' | 'warning' | 'critical' => {
  if (!lastActivity) return 'critical';
  const days = differenceInDays(new Date(), new Date(lastActivity));
  if (days <= 2) return 'active';
  if (days <= 6) return 'warning';
  return 'critical';
};
```

**Integracao com useGestorCompany:**
- Usar o hook existente para obter `companyName` e `companyUserIds`
- Exibir nome da empresa no header
- Usar `companyUserIds` para filtrar usuarios (ja implementado, mas melhorar UX)
