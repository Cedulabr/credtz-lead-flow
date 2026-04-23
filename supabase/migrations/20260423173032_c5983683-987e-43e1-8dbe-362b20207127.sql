
-- ============================================================
-- MÓDULO NOTAS & WORKSPACE
-- ============================================================

-- Helper trigger function: preenche company_id a partir do usuário
CREATE OR REPLACE FUNCTION public.set_company_id_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.get_user_primary_company_id(auth.uid());
  END IF;
  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company_id is required and could not be resolved';
  END IF;
  RETURN NEW;
END;
$$;

-- Helper trigger: updated_at
-- (usa a função padrão update_updated_at_column se existir; caso não, criamos)
CREATE OR REPLACE FUNCTION public.notas_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. NOTE_FOLDERS
-- ============================================================
CREATE TABLE public.note_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  parent_id uuid NULL REFERENCES public.note_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_note_folders_company ON public.note_folders(company_id);
CREATE INDEX idx_note_folders_parent ON public.note_folders(parent_id);

ALTER TABLE public.note_folders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_note_folders_company BEFORE INSERT ON public.note_folders
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_note_folders_updated BEFORE UPDATE ON public.note_folders
  FOR EACH ROW EXECUTE FUNCTION public.notas_set_updated_at();

CREATE POLICY "note_folders_company_access" ON public.note_folders
  FOR ALL TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_global_admin(auth.uid()))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_global_admin(auth.uid()));

-- ============================================================
-- 2. NOTES
-- ============================================================
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  folder_id uuid NULL REFERENCES public.note_folders(id) ON DELETE SET NULL,
  title text,
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  color text NOT NULL DEFAULT 'white',
  pinned boolean NOT NULL DEFAULT false,
  reminder_at timestamptz NULL,
  linked_contact_id uuid NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_company ON public.notes(company_id);
CREATE INDEX idx_notes_folder ON public.notes(folder_id);
CREATE INDEX idx_notes_pinned ON public.notes(company_id, pinned) WHERE pinned = true;
CREATE INDEX idx_notes_tags ON public.notes USING GIN(tags);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_notes_company BEFORE INSERT ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.notas_set_updated_at();

CREATE POLICY "notes_company_access" ON public.notes
  FOR ALL TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_global_admin(auth.uid()))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_global_admin(auth.uid()));

-- ============================================================
-- 3. BOARDS
-- ============================================================
CREATE TABLE public.boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT 'blue',
  icon text DEFAULT 'Trello',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_boards_company ON public.boards(company_id);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_boards_company BEFORE INSERT ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();
CREATE TRIGGER trg_boards_updated BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.notas_set_updated_at();

CREATE POLICY "boards_company_access" ON public.boards
  FOR ALL TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_global_admin(auth.uid()))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_global_admin(auth.uid()));

-- ============================================================
-- 4. BOARD_COLUMNS
-- ============================================================
CREATE TABLE public.board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  name text NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  color text DEFAULT 'gray',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_board_columns_board ON public.board_columns(board_id, order_index);
CREATE INDEX idx_board_columns_company ON public.board_columns(company_id);

ALTER TABLE public.board_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "board_columns_company_access" ON public.board_columns
  FOR ALL TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_global_admin(auth.uid()))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_global_admin(auth.uid()));

-- ============================================================
-- 5. CARDS
-- ============================================================
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_id uuid NOT NULL REFERENCES public.board_columns(id) ON DELETE CASCADE,
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  title text NOT NULL,
  description jsonb DEFAULT '[]'::jsonb,
  due_date timestamptz NULL,
  assignee_id uuid NULL,
  linked_contact_id uuid NULL,
  order_index int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_cards_column ON public.cards(column_id, order_index);
CREATE INDEX idx_cards_board ON public.cards(board_id);
CREATE INDEX idx_cards_company ON public.cards(company_id);
CREATE INDEX idx_cards_assignee ON public.cards(assignee_id);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_cards_updated BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.notas_set_updated_at();

CREATE POLICY "cards_company_access" ON public.cards
  FOR ALL TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_global_admin(auth.uid()))
  WITH CHECK (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_global_admin(auth.uid()));

-- Trigger: log card activity on key changes
CREATE OR REPLACE FUNCTION public.log_card_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.column_id IS DISTINCT FROM NEW.column_id THEN
    INSERT INTO public.card_activity (card_id, user_id, action, metadata)
    VALUES (NEW.id, auth.uid(), 'moved',
      jsonb_build_object('from_column', OLD.column_id, 'to_column', NEW.column_id));
  END IF;
  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    INSERT INTO public.card_activity (card_id, user_id, action, metadata)
    VALUES (NEW.id, auth.uid(), 'due_date_changed',
      jsonb_build_object('from', OLD.due_date, 'to', NEW.due_date));
  END IF;
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO public.card_activity (card_id, user_id, action, metadata)
    VALUES (NEW.id, auth.uid(), 'assignee_changed',
      jsonb_build_object('from', OLD.assignee_id, 'to', NEW.assignee_id));
  END IF;
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO public.card_activity (card_id, user_id, action, metadata)
    VALUES (NEW.id, auth.uid(), 'title_changed',
      jsonb_build_object('from', OLD.title, 'to', NEW.title));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cards_log_activity AFTER UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.log_card_activity();

-- ============================================================
-- 6. CARD_LABELS
-- ============================================================
CREATE TABLE public.card_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT 'blue',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_labels_board ON public.card_labels(board_id);

ALTER TABLE public.card_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "card_labels_via_board" ON public.card_labels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = card_labels.board_id
        AND (public.user_belongs_to_company(auth.uid(), b.company_id) OR public.is_global_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boards b
      WHERE b.id = card_labels.board_id
        AND (public.user_belongs_to_company(auth.uid(), b.company_id) OR public.is_global_admin(auth.uid()))
    )
  );

-- ============================================================
-- 7. CARDS_LABELS (M2M)
-- ============================================================
CREATE TABLE public.cards_labels (
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.card_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);
CREATE INDEX idx_cards_labels_card ON public.cards_labels(card_id);
CREATE INDEX idx_cards_labels_label ON public.cards_labels(label_id);

ALTER TABLE public.cards_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cards_labels_via_card" ON public.cards_labels
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = cards_labels.card_id
        AND (public.user_belongs_to_company(auth.uid(), c.company_id) OR public.is_global_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = cards_labels.card_id
        AND (public.user_belongs_to_company(auth.uid(), c.company_id) OR public.is_global_admin(auth.uid()))
    )
  );

-- ============================================================
-- 8. CHECKLISTS
-- ============================================================
CREATE TABLE public.checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Checklist',
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklists_card ON public.checklists(card_id);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklists_via_card" ON public.checklists
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = checklists.card_id
        AND (public.user_belongs_to_company(auth.uid(), c.company_id) OR public.is_global_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = checklists.card_id
        AND (public.user_belongs_to_company(auth.uid(), c.company_id) OR public.is_global_admin(auth.uid()))
    )
  );

-- ============================================================
-- 9. CHECKLIST_ITEMS
-- ============================================================
CREATE TABLE public.checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id uuid NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  text text NOT NULL,
  checked boolean NOT NULL DEFAULT false,
  order_index int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_checklist_items_checklist ON public.checklist_items(checklist_id, order_index);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_items_via_checklist" ON public.checklist_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.cards c ON c.id = cl.card_id
      WHERE cl.id = checklist_items.checklist_id
        AND (public.user_belongs_to_company(auth.uid(), c.company_id) OR public.is_global_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.cards c ON c.id = cl.card_id
      WHERE cl.id = checklist_items.checklist_id
        AND (public.user_belongs_to_company(auth.uid(), c.company_id) OR public.is_global_admin(auth.uid()))
    )
  );

-- ============================================================
-- 10. CARD_COMMENTS
-- ============================================================
CREATE TABLE public.card_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_comments_card ON public.card_comments(card_id, created_at DESC);

ALTER TABLE public.card_comments ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_card_comments_company BEFORE INSERT ON public.card_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_user();

CREATE POLICY "card_comments_select" ON public.card_comments
  FOR SELECT TO authenticated
  USING (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_global_admin(auth.uid()));

CREATE POLICY "card_comments_insert" ON public.card_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (public.user_belongs_to_company(auth.uid(), company_id) OR public.is_global_admin(auth.uid()))
  );

CREATE POLICY "card_comments_delete_own" ON public.card_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_global_admin(auth.uid()));

CREATE POLICY "card_comments_update_own" ON public.card_comments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_global_admin(auth.uid()));

-- ============================================================
-- 11. CARD_ACTIVITY
-- ============================================================
CREATE TABLE public.card_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_card_activity_card ON public.card_activity(card_id, created_at DESC);

ALTER TABLE public.card_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "card_activity_via_card" ON public.card_activity
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = card_activity.card_id
        AND (public.user_belongs_to_company(auth.uid(), c.company_id) OR public.is_global_admin(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = card_activity.card_id
        AND (public.user_belongs_to_company(auth.uid(), c.company_id) OR public.is_global_admin(auth.uid()))
    )
  );

-- ============================================================
-- STORAGE BUCKET: notas-attachments
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('notas-attachments', 'notas-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Policies: usuários autenticados podem gerenciar arquivos da própria empresa
-- Convenção de path: <company_id>/<resto>
CREATE POLICY "notas_attachments_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'notas-attachments'
    AND (
      public.is_global_admin(auth.uid())
      OR public.user_belongs_to_company(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
    )
  );

CREATE POLICY "notas_attachments_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'notas-attachments'
    AND (
      public.is_global_admin(auth.uid())
      OR public.user_belongs_to_company(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
    )
  );

CREATE POLICY "notas_attachments_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'notas-attachments'
    AND (
      public.is_global_admin(auth.uid())
      OR public.user_belongs_to_company(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
    )
  );

CREATE POLICY "notas_attachments_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'notas-attachments'
    AND (
      public.is_global_admin(auth.uid())
      OR public.user_belongs_to_company(
        auth.uid(),
        ((storage.foldername(name))[1])::uuid
      )
    )
  );

-- ============================================================
-- PERMISSION COLUMN
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_access_notas boolean NOT NULL DEFAULT true;
