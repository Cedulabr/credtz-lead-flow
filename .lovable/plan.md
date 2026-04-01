

## Leads Premium — Status "Sem Possibilidade" + Kanban Editavel (Admin/Gestor)

### 1. Adicionar status "sem_possibilidade"

**`src/modules/leads-premium/types.ts`**:
- Adicionar entrada `sem_possibilidade` em `PIPELINE_STAGES` com label "Sem Possibilidade", cor vermelha/cinza escuro, order 12
- Adicionar em `STATUS_CATEGORIES.lost`

**`src/modules/leads-premium/components/LeadStatusBadge.tsx`**:
- Adicionar icone para `sem_possibilidade` (ex: `MinusCircle`)

### 2. Kanban editavel — Tabela `pipeline_columns` no banco

**Migration SQL**:
```sql
CREATE TABLE public.pipeline_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL DEFAULT 'leads_premium',
  column_key text NOT NULL,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'Circle',
  color_from text DEFAULT 'from-gray-500',
  color_to text DEFAULT 'to-gray-600',
  text_color text DEFAULT 'text-gray-700',
  bg_color text DEFAULT 'bg-gray-50',
  border_color text DEFAULT 'border-gray-200',
  dot_color text DEFAULT 'bg-gray-500',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(module, column_key)
);

ALTER TABLE public.pipeline_columns ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ler
CREATE POLICY "Authenticated can read pipeline_columns"
  ON public.pipeline_columns FOR SELECT TO authenticated USING (true);

-- Apenas admin pode modificar
CREATE POLICY "Admin can manage pipeline_columns"
  ON public.pipeline_columns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

**Seed com dados iniciais** (insert tool): Inserir as colunas atuais do kanban + `sem_possibilidade` como registros na tabela.

### 3. Hook `usePipelineColumns.ts`

Novo hook que:
- Busca colunas da tabela `pipeline_columns` filtradas por `module = 'leads_premium'` e `is_active = true`, ordenadas por `sort_order`
- Fallback para `PIPELINE_COLUMNS` hardcoded se query falhar
- Funções CRUD para admin/gestor: `addColumn`, `updateColumn`, `removeColumn` (soft delete via `is_active = false`), `reorderColumns`

### 4. Modal de gerenciamento do Kanban

**Novo arquivo**: `src/modules/leads-premium/components/PipelineColumnsManager.tsx`

Dialog acessivel apenas para admin/gestor com:
- Lista das colunas atuais com drag-to-reorder (ou botoes seta)
- Para cada coluna: campos para editar label, escolher cor (preset de cores), ativar/desativar
- Botao "Adicionar Coluna": campo key (slug auto-gerado do label), label, cor
- Botao "Remover" com confirmacao (soft delete — leads existentes naquele status nao sao afetados)

### 5. Integrar no PipelineView

**`src/modules/leads-premium/views/PipelineView.tsx`**:
- Substituir `PIPELINE_COLUMNS` hardcoded pelo hook `usePipelineColumns`
- Mapear icones via lookup de string (ex: `'Sparkles' -> Sparkles`)
- Adicionar botao engrenagem no header do kanban (visivel so para admin/gestor) que abre o `PipelineColumnsManager`
- O `PIPELINE_STAGES` continua como fallback para cores/badges em outros componentes

### 6. Atualizar `LeadStatusBadge` e selects de status

Os selects de status em `LeadListItem`, `LeadDetailDrawer` etc. tambem devem consumir as colunas dinamicas para mostrar todas as opcoes disponiveis.

### Resumo de arquivos

| Arquivo | Acao |
|---------|------|
| Migration SQL | Criar tabela `pipeline_columns` com RLS |
| Insert SQL | Popular com colunas atuais + sem_possibilidade |
| `src/modules/leads-premium/types.ts` | Adicionar `sem_possibilidade` ao PIPELINE_STAGES |
| `src/modules/leads-premium/components/LeadStatusBadge.tsx` | Icone para novo status |
| `src/modules/leads-premium/hooks/usePipelineColumns.ts` | Novo hook CRUD |
| `src/modules/leads-premium/components/PipelineColumnsManager.tsx` | Novo modal de gestao |
| `src/modules/leads-premium/views/PipelineView.tsx` | Consumir colunas dinamicas + botao config |

