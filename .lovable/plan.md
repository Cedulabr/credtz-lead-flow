

## Módulo "Notas & Workspace" — Hub de produtividade integrado ao CRM

Novo módulo combinando o melhor de Notion, Trello, Google Keep, Evernote e Coda, com isolamento por `company_id` e link para contatos do CRM.

### 1. Navegação e estrutura

- Adicionar item **"Notas & Workspace"** no `Navigation.tsx` (ícone `NotebookPen` da lucide), com `permissionKey: "can_access_notas"`.
- Registrar `can_access_notas` em `PERMISSION_MODULES` (categoria `sistema`, defaultValue `true`) e em `Index.tsx` com `purchaseMode: false`.
- Criar pasta `src/modules/notas/` com:
  ```text
  NotasModule.tsx          ← shell com tabs "Notas" | "Quadros" + FAB
  views/
    NotesView.tsx          ← Keep/Evernote (grid masonry + editor)
    BoardsListView.tsx     ← lista de quadros
    BoardView.tsx          ← Kanban Trello
  components/
    FolderTree.tsx         ← árvore esquerda (notas)
    NoteCard.tsx           ← cartão masonry
    NoteEditor.tsx         ← editor por blocos (Notion-like)
    BlockEditor.tsx        ← componente reutilizado em notas e cards
    QuickCaptureFab.tsx    ← + flutuante
    KanbanColumn.tsx
    KanbanCard.tsx
    CardDetailDrawer.tsx   ← drawer lateral do card
    LabelManager.tsx
    ChecklistBlock.tsx
    ContactLinkPicker.tsx  ← reusa contacts via select
  hooks/
    useNotes.ts, useFolders.ts, useBoards.ts, useCards.ts
  types.ts
  ```
- Lazy import em `LazyComponents.tsx` → `LazyNotasModule`.

### 2. Schema (migration Supabase)

10 tabelas novas, todas com `company_id` + RLS isolando por empresa via `user_belongs_to_company(auth.uid(), company_id)`:

```sql
-- Pastas (notas)
CREATE TABLE note_folders (
  id uuid PK, company_id uuid NOT NULL,
  parent_id uuid NULL REFERENCES note_folders(id) ON DELETE CASCADE,
  name text NOT NULL, order_index int DEFAULT 0,
  created_by uuid, created_at timestamptz DEFAULT now()
);

-- Notas
CREATE TABLE notes (
  id uuid PK, company_id uuid NOT NULL,
  folder_id uuid NULL REFERENCES note_folders(id) ON DELETE SET NULL,
  title text, content jsonb DEFAULT '[]'::jsonb,
  tags text[] DEFAULT '{}', color text DEFAULT 'white',
  pinned boolean DEFAULT false, reminder_at timestamptz NULL,
  linked_contact_id uuid NULL REFERENCES contacts(id) ON DELETE SET NULL,
  created_by uuid, created_at, updated_at
);

-- Kanban
CREATE TABLE boards (id, company_id, name, description, color, icon, created_by, created_at);
CREATE TABLE board_columns (id, board_id FK CASCADE, company_id, name, order_index, color);
CREATE TABLE cards (
  id, column_id FK CASCADE, board_id FK CASCADE, company_id,
  title, description jsonb, due_date timestamptz NULL,
  assignee_id uuid NULL, linked_contact_id uuid NULL REFERENCES contacts(id),
  order_index int, created_by, created_at, updated_at
);
CREATE TABLE card_labels (id, board_id FK CASCADE, name, color);
CREATE TABLE cards_labels (card_id FK CASCADE, label_id FK CASCADE, PK(card_id,label_id));
CREATE TABLE checklists (id, card_id FK CASCADE, title, order_index);
CREATE TABLE checklist_items (id, checklist_id FK CASCADE, text, checked bool, order_index);
CREATE TABLE card_comments (id, card_id FK CASCADE, company_id, user_id, content, created_at);
CREATE TABLE card_activity (id, card_id FK CASCADE, user_id, action text, metadata jsonb, created_at);
```

**RLS (todas as 10 tabelas):**
- SELECT/INSERT/UPDATE/DELETE: `user_belongs_to_company(auth.uid(), company_id)` OU admin global (`is_global_admin(auth.uid())`).
- `cards_labels`, `checklists`, `checklist_items`, `card_activity`, `card_comments` herdam acesso via subquery no `card_id` → `cards.company_id`.

**Trigger** `set_company_id_from_user()` em `notes`, `note_folders`, `boards`, `card_comments` para preencher `company_id` automaticamente quando NULL.
**Trigger** `log_card_activity()` em `cards` UPDATE para popular `card_activity` (mudança de coluna, due_date, assignee).

### 3. Aba "Notas" — features

**Painel esquerdo (`FolderTree`):**
- Árvore com até 2 níveis de aninhamento, badge de contagem por pasta (subquery `COUNT(notes WHERE folder_id)`).
- Pastas padrão criadas no primeiro acesso: Pessoal, Reuniões, Clientes, Ideias.
- Drag-and-drop (`@dnd-kit`) atualiza `order_index` e `parent_id`.
- Busca global (debounce 300ms) → filtra por `title ILIKE %q% OR content::text ILIKE %q% OR %q% = ANY(tags)`, com highlight de match.

**Grid central:**
- Masonry padrão (CSS columns), toggles `list` e `table`.
- `NoteCard` mostra título, preview 3 linhas (extraído de `content` jsonb), tags, data de edição, borda esquerda colorida.
- Linha "📌 Fixadas" no topo quando há `pinned=true`.
- ColorPicker (8 cores: white/yellow/green/blue/purple/red/orange/gray).
- Hover actions: editar, duplicar, mover, excluir, vincular contato.

**Editor (`NoteEditor` + `BlockEditor`):**
- Editor por blocos baseado em **TipTap** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-table`).
- Slash menu `/` para inserir: H1/H2/H3, lista, lista numerada, checklist, divider, code, quote, imagem (upload p/ bucket `notas-attachments` privado, signed URL), tabela.
- Toolbar inline: bold, italic, underline, strike, code inline, cor.
- Campo de tags (chips) com autocomplete cruzando `SELECT DISTINCT unnest(tags) FROM notes WHERE company_id=...`.
- `linked_contact_id` via `ContactLinkPicker` (busca `contacts` por nome).
- Reminder via date/time picker → toast quando atinge horário (verifica a cada 60s no client).
- Auto-save debounced 5s; indicador "Salvando..." → "Salvo".
- Word count + datas no rodapé.

**Quick capture FAB:**
- Botão `+` flutuante (bottom-right, visível nas 2 abas), abre dialog compacto: título, conteúdo plano, tags, pasta. Salva e adiciona ao topo do grid otimisticamente.

### 4. Aba "Quadros" — Kanban

**Lista de quadros:**
- Grid de cards grandes (nome, descrição, contagem de cards via subquery, última atividade = `MAX(card_activity.created_at)`).
- Botão **+ Novo Quadro** → modal (nome, descrição, cor, ícone).
- Quadros padrão no primeiro acesso: "Tarefas da Semana", "Pipeline de Projetos".

**Visão do quadro:**
- Colunas horizontais com header (nome + contagem). Drag para reordenar colunas e cards (`@dnd-kit/sortable`) atualizando `order_index` em batch.
- **+ Adicionar Lista** ao final; **+ Adicionar Cartão** inline no rodapé de cada coluna.
- `KanbanCard` exibe: título, etiquetas coloridas, badge de prazo (vermelho se vencido), avatar do responsável, barra de progresso checklist (`checked/total`), contagem de anexos.

**Drawer de detalhes do card:**
- Título inline editável; descrição (mesmo `BlockEditor` das notas).
- **Checklists** múltiplas, cada uma com itens checáveis e barra de progresso; checklist completa marca verde.
- **Etiquetas** (6 cores nomeáveis por quadro, gerenciadas em `LabelManager`).
- **Prazo** (date+time), badge vermelho se vencido.
- **Responsável**: dropdown com membros da empresa (`SELECT profiles.* FROM user_companies WHERE company_id = currentCompany`).
- **Contato vinculado** (`ContactLinkPicker`).
- **Anexos**: upload para bucket `notas-attachments`, signed URL de 1h ao baixar.
- **Atividade**: lista cronológica de `card_activity` (renderizada via templates por `action`).
- **Comentários**: input com avatar + timestamp, deletar próprios.

**Filtros do quadro (top bar):**
- Chips de avatar (responsáveis), chips de cor (etiquetas), filtro de prazo (vencidos / hoje / esta semana), busca por título.

### 5. Detalhes técnicos transversais

- **Realtime opcional** via `supabase.channel` em `cards` e `notes` para refletir alterações de outros membros sem reload.
- **Atualizações otimistas** em todas as operações de drag, criação rápida e edição inline.
- **Empty states** ilustrados (lucide `NotebookPen`, `Trello`) em: módulo vazio (primeira abertura), quadro sem cards, pasta sem notas — com CTA contextual.
- **Permissão**: `PermissionGate` com `can_access_notas` envolvendo `LazyNotasModule` em `Index.tsx`.
- **i18n**: 100% em português, segue tokens do design system (cores semânticas, `Card`, `Button`, `Drawer`, `Tabs` já existentes).

### 6. Ordem de execução

1. Migration: 10 tabelas + RLS + triggers + bucket privado `notas-attachments` com policies.
2. Registrar permissão `can_access_notas` em `PERMISSION_MODULES`, `Navigation.tsx`, `Index.tsx`.
3. Scaffold `src/modules/notas/` (shell + tabs + FAB) e lazy import.
4. Aba **Notas**: FolderTree, NoteCard grid, BlockEditor (TipTap), tags/contato/reminder, quick capture, busca.
5. Aba **Quadros**: lista, board view, drag-and-drop, CardDetailDrawer (checklists, labels, comments, activity, attachments).
6. Empty states + realtime + polimento.

### Dependências novas
- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-table`, `@tiptap/extension-placeholder`
- `@dnd-kit/core`, `@dnd-kit/sortable` (já comum no projeto, validar)

### Resultado
Hub de produtividade unificado dentro do CRM Easyn Flow: notas tipo Keep/Notion + quadros Kanban tipo Trello, ambos com vínculo direto a contatos da empresa, isolamento total por `company_id`, e UX fluida com drag-and-drop, auto-save e capture rápido.

