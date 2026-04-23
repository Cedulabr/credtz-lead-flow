-- Add new columns to notes
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trashed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS cover_image text NULL,
  ADD COLUMN IF NOT EXISTS checklist_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_notes_archived ON public.notes(company_id, archived) WHERE trashed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notes_trashed ON public.notes(company_id, trashed_at) WHERE trashed_at IS NOT NULL;

-- note_labels (global per company)
CREATE TABLE IF NOT EXISTS public.note_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT 'gray',
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.note_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "note_labels_select" ON public.note_labels FOR SELECT TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR (user_belongs_to_company(auth.uid(), company_id) AND created_by = auth.uid())
);

CREATE POLICY "note_labels_insert" ON public.note_labels FOR INSERT TO authenticated
WITH CHECK (
  user_belongs_to_company(auth.uid(), company_id)
  AND created_by = auth.uid()
);

CREATE POLICY "note_labels_update" ON public.note_labels FOR UPDATE TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR created_by = auth.uid()
);

CREATE POLICY "note_labels_delete" ON public.note_labels FOR DELETE TO authenticated
USING (
  is_global_admin(auth.uid())
  OR is_company_gestor(auth.uid(), company_id)
  OR created_by = auth.uid()
);

-- notes_labels (link)
CREATE TABLE IF NOT EXISTS public.notes_labels (
  note_id uuid NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.note_labels(id) ON DELETE CASCADE,
  PRIMARY KEY(note_id, label_id)
);

ALTER TABLE public.notes_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_labels_select" ON public.notes_labels FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.notes n
    WHERE n.id = notes_labels.note_id
      AND (
        is_global_admin(auth.uid())
        OR is_company_gestor(auth.uid(), n.company_id)
        OR n.created_by = auth.uid()
      )
  )
);

CREATE POLICY "notes_labels_insert" ON public.notes_labels FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.notes n
    WHERE n.id = notes_labels.note_id
      AND (
        is_global_admin(auth.uid())
        OR is_company_gestor(auth.uid(), n.company_id)
        OR n.created_by = auth.uid()
      )
  )
);

CREATE POLICY "notes_labels_delete" ON public.notes_labels FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.notes n
    WHERE n.id = notes_labels.note_id
      AND (
        is_global_admin(auth.uid())
        OR is_company_gestor(auth.uid(), n.company_id)
        OR n.created_by = auth.uid()
      )
  )
);