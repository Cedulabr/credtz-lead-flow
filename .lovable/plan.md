

## Evolução do módulo "Notas & Workspace" — estilo Google Keep + Evernote + Notion

Transformar a aba **Notas** em uma experiência idêntica ao Google Keep, adicionando arquivamento, lixeira, lembretes dedicados, marcadores globais, criador inline e visual mais limpo — preservando o editor por blocos (Notion) e a aba Quadros (Trello).

### 1. Banco — novas colunas e tabela

Migration adicionando ao schema existente (sem quebrar dados atuais):

```sql
ALTER TABLE public.notes
  ADD COLUMN archived boolean NOT NULL DEFAULT false,
  ADD COLUMN trashed_at timestamptz NULL,
  ADD COLUMN cover_image text NULL,
  ADD COLUMN checklist_mode boolean NOT NULL DEFAULT false;

-- Marcadores (labels globais por empresa, separados de "tags ad-hoc")
CREATE TABLE public.note_labels (
  id uuid PK, company_id uuid NOT NULL,
  name text NOT NULL, color text DEFAULT 'gray',
  created_by uuid, created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE TABLE public.notes_labels (
  note_id uuid REFERENCES notes(id) ON DELETE CASCADE,
  label_id uuid REFERENCES note_labels(id) ON DELETE CASCADE,
  PRIMARY KEY(note_id, label_id)
);
```

RLS herdando o mesmo padrão (autor + gestor + admin) já aplicado às notas. Job/cron simples opcional para purgar `notes` com `trashed_at < now() - 30 days`.

### 2. Layout estilo Keep

Substituir o painel esquerdo atual por uma **sidebar de navegação Keep** com seções fixas + marcadores dinâmicos:

```text
┌────────────────────────────────────────────────────────────┐
│  💡 Notas        [seleção destaque amarelo, igual Keep]    │
│  🔔 Lembretes                                              │
│  ✏️  Editar marcadores                                      │
│  🏷  Pessoal                                                │
│  🏷  Reuniões                                               │
│  🏷  Clientes                                               │
│  📁 Pastas (collapse — funcionalidade Evernote mantida)    │
│  📦 Arquivo                                                 │
│  🗑  Lixeira                                                │
└────────────────────────────────────────────────────────────┘
```

- Item ativo com pílula arredondada amarelo/âmbar (`bg-amber-100/dark:bg-amber-900/30`) e ícone tingido — idêntico ao Keep.
- Sidebar colapsável (só ícones) via toggle no topo.
- Mobile: sheet lateral acionado pelo menu hamburger.

### 3. Criador inline no topo (Keep-style)

Substituir o botão "Nova nota" atual por um **input expansível** centralizado acima do grid:

- Estado colapsado: barra única "Criar uma nota..." com ícones à direita: ✅ checklist, 🎨 cor, 🖼 imagem, 🔔 lembrete.
- Ao focar/clicar: expande para card com título + corpo + barra de ações (cor, marcador, lembrete, arquivar, fechar).
- Salva ao clicar fora ou em "Fechar" — feedback otimista no grid.
- Atalho `c` para abrir rapidamente (estilo Keep).

### 4. Notas em modo checklist (Keep)

Quando `checklist_mode=true`, a nota renderiza como lista de itens (não como editor de blocos):

- `[ ] item 1 / [x] item 2`
- Botão "+ Item da lista" ao final.
- Itens marcados vão para seção "concluídos" colapsável.
- Conversão bidirecional: menu da nota → "Mostrar caixas de seleção" / "Ocultar caixas de seleção".
- Cards no grid mostram preview com checkboxes e contagem `3/7 concluídos`.

### 5. Lembretes (seção dedicada)

- Sidebar item **🔔 Lembretes** filtra notas com `reminder_at NOT NULL`, agrupadas em: **Hoje**, **Amanhã**, **Esta semana**, **Vencidos**, **Sem data** (igual Keep).
- Notas com lembrete mostram chip discreto no card: 🔔 *25 abr, 14:00* (vermelho se vencido).
- Toast notificação quando o horário chega (já existe — manter polling 60s).
- Lembretes recorrentes opcionais: diário/semanal/mensal (`recurrence` em `metadata jsonb` na nota).

### 6. Marcadores globais (Keep + Evernote)

- Item **✏️ Editar marcadores** abre dialog de gerenciamento (criar, renomear, escolher cor, excluir).
- Marcadores funcionam como filtro persistente na sidebar (clique = mostra só notas com aquele marcador).
- Diferença das **tags ad-hoc** existentes: marcadores são curados/coloridos pela empresa; tags continuam livres no editor.
- Card mostra chips coloridos dos marcadores no rodapé.

### 7. Arquivo e Lixeira

- Botão "Arquivar" no card e no editor → `archived=true` (não aparece em Notas, aparece em Arquivo).
- Botão "Excluir" passa a fazer **soft delete** (`trashed_at = now()`). Item vai para Lixeira por 30 dias.
- Lixeira: ações **Restaurar** e **Excluir permanentemente**. Banner no topo: "Itens são excluídos definitivamente após 30 dias".

### 8. Recursos Notion/Evernote mantidos e potencializados

- **Editor de blocos** (TipTap) continua sendo o padrão das notas longas — mesmo `BlockEditor.tsx`.
- Adicionar slash menu `/` real (popover com busca de blocos: H1/H2/H3, lista, checklist, divisor, citação, código, tabela, callout colorido, toggle list).
- **Toggle list** (Notion): blocos colapsáveis dentro da nota.
- **Callouts coloridos** (info/aviso/erro/sucesso) — extensão TipTap `Node.create`.
- Auto-save mantido (800ms debounce).
- **Histórico de versões** (Evernote): tabela `note_versions` salvando snapshots a cada 5 min de edição com diff visual (botão "Ver versões anteriores" no editor).
- **Vínculo com contato CRM** mantido — chip de contato aparece no card quando existe.

### 9. Visual e UX

- Tema: respeitar tokens existentes; cards com `rounded-xl`, sombra suave (`shadow-sm hover:shadow-md`), fundo `bg-card` com tinte da cor escolhida (já temos 8 cores).
- Grid masonry continua, mas com **animação de entrada** (Framer Motion stagger) e **drag-and-drop para reordenar** (`@dnd-kit`) — campo `order_index` na tabela `notes`.
- Hover do card: ações revelam via fade (pin, marcador, cor, arquivar, mais).
- Toggle de visualização **Grid ↔ Lista** (botão no topo direito, igual Keep).
- Empty state ilustrado por seção (Notas / Lembretes / Arquivo / Lixeira) com ícone gigante e mensagem contextual (igual ao "Carregando notas..." da imagem, mas com lottie estático).

### 10. Arquivos e ordem de execução

**Migration**
- `supabase/migrations/<ts>_notas_keep_evolution.sql` — colunas em `notes`, tabelas `note_labels` + `notes_labels`, trigger `set_company_id_from_user`, RLS espelhando regras existentes.

**Novos componentes**
- `src/modules/notas/components/KeepSidebar.tsx` — nova navegação lateral (Notas/Lembretes/Marcadores/Pastas/Arquivo/Lixeira).
- `src/modules/notas/components/InlineNoteCreator.tsx` — criador expansível no topo.
- `src/modules/notas/components/ChecklistNote.tsx` — modo checklist do card e do editor.
- `src/modules/notas/components/LabelManagerDialog.tsx` — gerenciar marcadores globais.
- `src/modules/notas/components/RemindersView.tsx` — agrupamento por data.
- `src/modules/notas/components/ArchiveView.tsx` e `TrashView.tsx`.
- `src/modules/notas/components/SlashMenu.tsx` + extensão TipTap para callouts/toggle.

**Atualizações**
- `NotesView.tsx`: substituir layout (sidebar Keep + criador inline + roteamento por seção).
- `NoteCard.tsx`: suporte a checklist preview, marcadores coloridos, lembrete chip, ações arquivar.
- `NoteEditor.tsx`: botões arquivar/lixeira/versões, suporte a checklist mode, marcadores.
- `useNotas.ts`: `archiveNote`, `restoreNote`, `permanentDelete`, hooks `useLabels`, `useReminders`, filtros por seção.
- `types.ts`: novos campos + `NoteLabel`.

### Resultado
- **Visual idêntico ao Keep**: sidebar com Notas/Lembretes/Marcadores/Arquivo/Lixeira, criador inline, grid colorido, atalho `c`, toggle grid/lista.
- **Profundidade do Evernote**: pastas hierárquicas, lixeira com 30 dias, histórico de versões, marcadores curados.
- **Poder do Notion**: editor por blocos com slash menu, toggle lists, callouts, auto-save.
- Aba **Quadros** (Trello) intocada.
- Privacidade preservada (RLS já corrigida na etapa anterior).

