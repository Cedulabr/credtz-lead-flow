

## Evolucao Activate Leads — Sidebar Collapsible + Redesign completo

### Situacao Atual

1. **48h Deadline NAO foi aplicado ao Activate Leads** — foi implementado apenas no Leads Premium (`useOverdueLeads`, `OverdueBlockBanner`, `TreatmentLogDialog`). O `ActivateLeads.tsx` (2950 linhas) nao referencia nenhuma dessas funcionalidades.
2. **Sidebar** (`Navigation.tsx`, 476 linhas) e fixa em 64px desktop, sem collapse. Ja existe `sidebar.tsx` do shadcn com suporte a `collapsible="icon"`.
3. **Activate Leads** e um arquivo monolitico sem views separadas, sem Kanban, sem tabs — apenas lista/tabela.

### Escopo de Trabalho

---

### TASK 1 — Collapsible Sidebar

**Arquivo**: `src/components/Navigation.tsx`

Refatorar a sidebar desktop (linhas 293-374) para suportar collapse:

- Adicionar estado `isCollapsed` persistido em `localStorage`
- Botao toggle (ChevronLeft/ChevronRight) no topo da sidebar
- Largura expandida: `w-64` (220px) — colapsada: `w-16` (60px)
- Transicao CSS `transition-all duration-200`
- Quando colapsado: mostrar apenas icones com `Tooltip` para labels
- User info na parte inferior: colapsado mostra apenas avatar circular
- Logo: colapsado mostra apenas o icone (sem texto)
- Mobile nao muda (ja usa menu overlay)
- Todos os 28 nav items continuam funcionais

---

### TASK 2 — Modularizar Activate Leads (arquitetura igual ao Leads Premium)

Criar nova estrutura modular:

```text
src/modules/activate-leads/
  ActivateLeadsModule.tsx        # Componente principal (como LeadsPremiumModule.tsx)
  types.ts                       # Tipos e STATUS_CONFIG
  hooks/
    useActivateLeads.ts          # Hook principal (fetch, update, stats)
    useActivateOverdueLeads.ts   # Hook 48h (reutiliza logica do Leads Premium adaptada para activate_leads)
  views/
    ActivateListView.tsx         # Vista Lista (tabela atual refatorada)
    ActivatePipelineView.tsx     # Vista Kanban (novo)
    ActivateMetricsView.tsx      # Vista Metricas (novo)
    ActivateSimulationsView.tsx  # Vista Simulacoes (reutiliza SimulationManager)
  components/
    ActivateOverdueBanner.tsx    # Banner 48h para activate leads
    ActivateLeadCard.tsx         # Card para Kanban
```

**Manter**: `src/components/ActivateLeads.tsx` como redirect/deprecado apontando para o novo modulo, para nao quebrar imports existentes.

---

### TASK 3 — Aplicar 48h Deadline ao Activate Leads

- Criar `useActivateOverdueLeads.ts` — query `activate_leads` onde `status = 'novo'` e `created_at + 48h < now()`
- Criar `ActivateOverdueBanner.tsx` — banner vermelho full-width (mesma UX do Leads Premium)
- Integrar no `ActivateLeadsModule.tsx`: bloquear botoes Gerar/Importar/Puxar se houver leads vencidos
- Alertas progressivos em 24h e 36h (toast)

Nota: A tabela `activate_leads` ja tem `created_at` como timestamp de referencia (nao tem `withdrawn_at` como `leads`). Usaremos `created_at` como marco de retirada para o calculo de 48h, ja que os leads sao criados/importados pelo usuario.

---

### TASK 4 — Redesign Header + KPI Cards (estilo Leads Premium)

**Header**: 
- Icone rocket + "Activate Leads" titulo + subtitulo
- Botoes de acao (Gerar, Importar, Puxar, Historico) alinhados a direita como CTAs
- Badge de creditos/total no canto superior direito (pill estilizado)

**KPI Cards**:
- Substituir cards coloridos por cards brancos com borda lateral colorida (left-border accent)
- Numero grande bold + label pequeno abaixo
- Stats: Total, Novos, Em Andamento, 2a Tentativa, Fechados, Sem Possibilidade, Alertas

---

### TASK 5 — Tabs + Pipeline Kanban

**Tabs**: Lista | Pipeline | Metricas | Simulacoes (mesma barra do Leads Premium)

**Kanban (ActivatePipelineView.tsx)**:
- Colunas: Novos, Em Andamento, 2a Tentativa, Fechados, Sem Possibilidade, Alertas
- Cards com: nome, telefone, tag de origem, tempo relativo ("ha X horas")
- Header de coluna com nome + badge de contagem
- Drag-and-drop para mover leads entre status (desktop)
- Mobile: scroll horizontal com snap

**Filtros (toolbar)**:
- Dropdown pills: "Todos Usuarios", "Todos Status", "Periodo"
- Botao "Editar Funil" (admin/gestor) — reutilizar PipelineColumnsManager do Leads Premium adaptado

---

### TASK 6 — Restyle Lista

- Manter colunas: Nome, CPF, Simulacao, WhatsApp, Acoes
- Cards brancos com sombra sutil, cantos arredondados, hover suave
- Secao "Simulacoes Prontas" mantida como banner fixo no topo
- Responsivo completo

---

### Detalhes Tecnicos

**Sidebar**: Usa CSS `transition-all duration-200` + `overflow-hidden` para labels. Tooltip wrapping via shadcn `TooltipProvider` ja presente no arquivo.

**Kanban Activate Leads**: Reutiliza padrao do `PipelineView.tsx` do Leads Premium — `useMemo` para agrupar leads por status, `onDragStart`/`onDrop` handlers, `ScrollArea` horizontal no mobile.

**48h para Activate Leads**: Query direta na tabela `activate_leads` filtrando `status = 'novo'` e `created_at` antigo. Sem necessidade de migration (campos ja existem).

### Arquivos a criar/modificar

| Arquivo | Acao |
|---------|------|
| `src/components/Navigation.tsx` | Refatorar sidebar desktop com collapse |
| `src/modules/activate-leads/ActivateLeadsModule.tsx` | Novo componente principal |
| `src/modules/activate-leads/types.ts` | STATUS_CONFIG + tipos |
| `src/modules/activate-leads/hooks/useActivateLeads.ts` | Hook principal |
| `src/modules/activate-leads/hooks/useActivateOverdueLeads.ts` | Hook 48h |
| `src/modules/activate-leads/views/ActivateListView.tsx` | Lista refatorada |
| `src/modules/activate-leads/views/ActivatePipelineView.tsx` | Kanban novo |
| `src/modules/activate-leads/views/ActivateMetricsView.tsx` | Metricas |
| `src/modules/activate-leads/components/ActivateOverdueBanner.tsx` | Banner bloqueio |
| `src/modules/activate-leads/components/ActivateLeadCard.tsx` | Card Kanban |
| `src/components/ActivateLeads.tsx` | Redirect para novo modulo |
| Ponto de entrada (Index.tsx ou App.tsx) | Atualizar import |

