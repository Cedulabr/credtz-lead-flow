

## Corrigir visibilidade do módulo Notas & Workspace

### Problema
Hoje, qualquer usuário da empresa enxerga as notas, pastas, quadros e cards de todos os colegas — as policies usam apenas `user_belongs_to_company(auth.uid(), company_id)`, sem filtrar por autor. Isso quebra a privacidade esperada.

### Regra desejada
- **Colaborador**: vê e gerencia apenas o que ele criou (`created_by = auth.uid()`).
- **Gestor da empresa** (`is_company_gestor(auth.uid(), company_id)`): vê tudo da sua empresa.
- **Admin global** (`is_global_admin`): vê tudo.

### Migration — reescrever RLS

Substituir as policies abertas por versões com filtro de autoria. Política comum aplicada a `notes`, `note_folders`, `boards`:

```sql
DROP POLICY "notes_company_access" ON public.notes;

CREATE POLICY "notes_select" ON public.notes FOR SELECT TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR (user_belongs_to_company(auth.uid(), company_id) AND created_by = auth.uid())
);

CREATE POLICY "notes_insert" ON public.notes FOR INSERT TO authenticated
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND created_by = auth.uid()
);

CREATE POLICY "notes_update" ON public.notes FOR UPDATE TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR created_by = auth.uid()
);

CREATE POLICY "notes_delete" ON public.notes FOR DELETE TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR created_by = auth.uid()
);
```

Mesmo padrão replicado em `note_folders` e `boards` (todas têm `created_by`).

### Tabelas filhas (Kanban)
- `board_columns`, `card_labels`: visibilidade herdada do `board` pai — acesso permitido se o usuário enxerga o board (gestor/admin OU dono do board). Reescrever a subquery para usar a mesma regra.
- `cards`: igual a `notes`, mas autor = `created_by` do card. Cards continuam visíveis para o dono do board (gestor da empresa) e para o `created_by` do próprio card. **Decisão:** card também é visível para `assignee_id = auth.uid()` (responsável precisa ver o que foi atribuído a ele).
- `cards_labels`, `checklists`, `checklist_items`, `card_activity`, `card_comments`: herança via subquery em `cards` — automaticamente passam a respeitar a nova regra.

### Storage `notas-attachments`
Manter a estrutura `userId/...` no path, mas restringir SELECT a:
- dono do arquivo (`auth.uid()::text = (storage.foldername(name))[1]`)
- gestor da empresa do dono
- admin global

### Frontend
Nenhuma mudança obrigatória — as queries em `useNotas.ts` já filtram via RLS. Opcional:
- Em `NotesView` e `BoardsView`, exibir badge **"de João"** nos itens quando o gestor estiver visualizando notas/cards de subordinados (usar `created_by` join com `profiles` via `get_profiles_by_ids`).

### Arquivos
- Nova migration `supabase/migrations/<timestamp>_notas_rls_authorship.sql` com os DROP/CREATE acima para as 11 tabelas + storage policies.
- (Opcional) `src/modules/notas/components/NoteCard.tsx` e `KanbanCard.tsx`: adicionar avatar/nome do autor quando `created_by !== currentUser.id`.

### Resultado
- Colaborador A não vê notas/quadros do Colaborador B.
- Gestor da empresa vê tudo de todos os colaboradores da empresa dele.
- Admin global continua com visão total.

