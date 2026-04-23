-- ============ NOTES ============
DROP POLICY IF EXISTS "notes_company_access" ON public.notes;
DROP POLICY IF EXISTS "notes_select" ON public.notes;
DROP POLICY IF EXISTS "notes_insert" ON public.notes;
DROP POLICY IF EXISTS "notes_update" ON public.notes;
DROP POLICY IF EXISTS "notes_delete" ON public.notes;

CREATE POLICY "notes_select" ON public.notes FOR SELECT TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR (user_belongs_to_company(auth.uid(), company_id) AND created_by = auth.uid())
);
CREATE POLICY "notes_insert" ON public.notes FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_company(auth.uid(), company_id) AND created_by = auth.uid());
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

-- ============ NOTE_FOLDERS ============
DROP POLICY IF EXISTS "note_folders_company_access" ON public.note_folders;
DROP POLICY IF EXISTS "note_folders_select" ON public.note_folders;
DROP POLICY IF EXISTS "note_folders_insert" ON public.note_folders;
DROP POLICY IF EXISTS "note_folders_update" ON public.note_folders;
DROP POLICY IF EXISTS "note_folders_delete" ON public.note_folders;

CREATE POLICY "note_folders_select" ON public.note_folders FOR SELECT TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR (user_belongs_to_company(auth.uid(), company_id) AND created_by = auth.uid())
);
CREATE POLICY "note_folders_insert" ON public.note_folders FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_company(auth.uid(), company_id) AND created_by = auth.uid());
CREATE POLICY "note_folders_update" ON public.note_folders FOR UPDATE TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR created_by = auth.uid()
);
CREATE POLICY "note_folders_delete" ON public.note_folders FOR DELETE TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR created_by = auth.uid()
);

-- ============ BOARDS ============
DROP POLICY IF EXISTS "boards_company_access" ON public.boards;
DROP POLICY IF EXISTS "boards_select" ON public.boards;
DROP POLICY IF EXISTS "boards_insert" ON public.boards;
DROP POLICY IF EXISTS "boards_update" ON public.boards;
DROP POLICY IF EXISTS "boards_delete" ON public.boards;

CREATE POLICY "boards_select" ON public.boards FOR SELECT TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR (user_belongs_to_company(auth.uid(), company_id) AND created_by = auth.uid())
);
CREATE POLICY "boards_insert" ON public.boards FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_company(auth.uid(), company_id) AND created_by = auth.uid());
CREATE POLICY "boards_update" ON public.boards FOR UPDATE TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR created_by = auth.uid()
);
CREATE POLICY "boards_delete" ON public.boards FOR DELETE TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR created_by = auth.uid()
);

-- ============ BOARD_COLUMNS (herda do board) ============
DROP POLICY IF EXISTS "board_columns_company_access" ON public.board_columns;
DROP POLICY IF EXISTS "board_columns_all" ON public.board_columns;

CREATE POLICY "board_columns_all" ON public.board_columns FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.boards b
  WHERE b.id = board_columns.board_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), b.company_id)
      OR b.created_by = auth.uid()
    )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.boards b
  WHERE b.id = board_columns.board_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), b.company_id)
      OR b.created_by = auth.uid()
    )
));

-- ============ CARD_LABELS (herda do board) ============
DROP POLICY IF EXISTS "card_labels_company_access" ON public.card_labels;
DROP POLICY IF EXISTS "card_labels_all" ON public.card_labels;

CREATE POLICY "card_labels_all" ON public.card_labels FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.boards b
  WHERE b.id = card_labels.board_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), b.company_id)
      OR b.created_by = auth.uid()
    )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.boards b
  WHERE b.id = card_labels.board_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), b.company_id)
      OR b.created_by = auth.uid()
    )
));

-- ============ CARDS ============
DROP POLICY IF EXISTS "cards_company_access" ON public.cards;
DROP POLICY IF EXISTS "cards_select" ON public.cards;
DROP POLICY IF EXISTS "cards_insert" ON public.cards;
DROP POLICY IF EXISTS "cards_update" ON public.cards;
DROP POLICY IF EXISTS "cards_delete" ON public.cards;

CREATE POLICY "cards_select" ON public.cards FOR SELECT TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR (user_belongs_to_company(auth.uid(), company_id) AND (created_by = auth.uid() OR assignee_id = auth.uid()))
);
CREATE POLICY "cards_insert" ON public.cards FOR INSERT TO authenticated
WITH CHECK (user_belongs_to_company(auth.uid(), company_id) AND created_by = auth.uid());
CREATE POLICY "cards_update" ON public.cards FOR UPDATE TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR created_by = auth.uid()
  OR assignee_id = auth.uid()
);
CREATE POLICY "cards_delete" ON public.cards FOR DELETE TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR created_by = auth.uid()
);

-- ============ CARDS_LABELS (herda do card) ============
DROP POLICY IF EXISTS "cards_labels_company_access" ON public.cards_labels;
DROP POLICY IF EXISTS "cards_labels_all" ON public.cards_labels;

CREATE POLICY "cards_labels_all" ON public.cards_labels FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.cards c
  WHERE c.id = cards_labels.card_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), c.company_id)
      OR c.created_by = auth.uid()
      OR c.assignee_id = auth.uid()
    )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cards c
  WHERE c.id = cards_labels.card_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), c.company_id)
      OR c.created_by = auth.uid()
      OR c.assignee_id = auth.uid()
    )
));

-- ============ CHECKLISTS (herda do card) ============
DROP POLICY IF EXISTS "checklists_company_access" ON public.checklists;
DROP POLICY IF EXISTS "checklists_all" ON public.checklists;

CREATE POLICY "checklists_all" ON public.checklists FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.cards c
  WHERE c.id = checklists.card_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), c.company_id)
      OR c.created_by = auth.uid()
      OR c.assignee_id = auth.uid()
    )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cards c
  WHERE c.id = checklists.card_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), c.company_id)
      OR c.created_by = auth.uid()
      OR c.assignee_id = auth.uid()
    )
));

-- ============ CHECKLIST_ITEMS (herda do checklist → card) ============
DROP POLICY IF EXISTS "checklist_items_company_access" ON public.checklist_items;
DROP POLICY IF EXISTS "checklist_items_all" ON public.checklist_items;

CREATE POLICY "checklist_items_all" ON public.checklist_items FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.checklists ck
  JOIN public.cards c ON c.id = ck.card_id
  WHERE ck.id = checklist_items.checklist_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), c.company_id)
      OR c.created_by = auth.uid()
      OR c.assignee_id = auth.uid()
    )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.checklists ck
  JOIN public.cards c ON c.id = ck.card_id
  WHERE ck.id = checklist_items.checklist_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), c.company_id)
      OR c.created_by = auth.uid()
      OR c.assignee_id = auth.uid()
    )
));

-- ============ CARD_ACTIVITY (herda do card) ============
DROP POLICY IF EXISTS "card_activity_company_access" ON public.card_activity;
DROP POLICY IF EXISTS "card_activity_select" ON public.card_activity;
DROP POLICY IF EXISTS "card_activity_insert" ON public.card_activity;

CREATE POLICY "card_activity_select" ON public.card_activity FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.cards c
  WHERE c.id = card_activity.card_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), c.company_id)
      OR c.created_by = auth.uid()
      OR c.assignee_id = auth.uid()
    )
));
CREATE POLICY "card_activity_insert" ON public.card_activity FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.cards c
  WHERE c.id = card_activity.card_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), c.company_id)
      OR c.created_by = auth.uid()
      OR c.assignee_id = auth.uid()
    )
));

-- ============ CARD_COMMENTS (herda do card) ============
DROP POLICY IF EXISTS "card_comments_company_access" ON public.card_comments;
DROP POLICY IF EXISTS "card_comments_select" ON public.card_comments;
DROP POLICY IF EXISTS "card_comments_insert" ON public.card_comments;
DROP POLICY IF EXISTS "card_comments_update" ON public.card_comments;
DROP POLICY IF EXISTS "card_comments_delete" ON public.card_comments;

CREATE POLICY "card_comments_select" ON public.card_comments FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.cards c
  WHERE c.id = card_comments.card_id
    AND (
      is_global_admin(auth.uid())
      OR is_company_gestor(auth.uid(), c.company_id)
      OR c.created_by = auth.uid()
      OR c.assignee_id = auth.uid()
    )
));
CREATE POLICY "card_comments_insert" ON public.card_comments FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.cards c
    WHERE c.id = card_comments.card_id
      AND (
        is_global_admin(auth.uid())
        OR is_company_gestor(auth.uid(), c.company_id)
        OR c.created_by = auth.uid()
        OR c.assignee_id = auth.uid()
      )
  )
);
CREATE POLICY "card_comments_update" ON public.card_comments FOR UPDATE TO authenticated
USING (user_id = auth.uid() OR is_global_admin(auth.uid()));
CREATE POLICY "card_comments_delete" ON public.card_comments FOR DELETE TO authenticated
USING (user_id = auth.uid() OR is_global_admin(auth.uid()));

-- ============ STORAGE: notas-attachments ============
DROP POLICY IF EXISTS "notas_attachments_select" ON storage.objects;
DROP POLICY IF EXISTS "notas_attachments_insert" ON storage.objects;
DROP POLICY IF EXISTS "notas_attachments_update" ON storage.objects;
DROP POLICY IF EXISTS "notas_attachments_delete" ON storage.objects;

CREATE POLICY "notas_attachments_select" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'notas-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR is_global_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id::text = (storage.foldername(name))[1]
        AND uc.is_active = true
        AND is_company_gestor(auth.uid(), uc.company_id)
    )
  )
);
CREATE POLICY "notas_attachments_insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'notas-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "notas_attachments_update" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'notas-attachments'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR is_global_admin(auth.uid()))
);
CREATE POLICY "notas_attachments_delete" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'notas-attachments'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR is_global_admin(auth.uid()))
);