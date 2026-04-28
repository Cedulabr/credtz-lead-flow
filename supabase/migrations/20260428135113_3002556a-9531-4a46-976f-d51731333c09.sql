-- Harden note ownership defaults and fix reminder update checks
CREATE OR REPLACE FUNCTION public.set_notes_insert_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := public.get_user_primary_company_id(auth.uid());
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  IF NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'company_id is required and could not be resolved';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notes_company ON public.notes;
CREATE TRIGGER trg_notes_insert_defaults
BEFORE INSERT ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.set_notes_insert_defaults();

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS reminder_notified_at timestamptz NULL,
  ALTER COLUMN created_by SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notes_due_reminders
ON public.notes(company_id, reminder_at)
WHERE reminder_at IS NOT NULL AND reminder_notified_at IS NULL AND trashed_at IS NULL AND archived = false;

DROP POLICY IF EXISTS "notes_insert" ON public.notes;
DROP POLICY IF EXISTS "notes_update" ON public.notes;

CREATE POLICY "notes_insert" ON public.notes
FOR INSERT TO authenticated
WITH CHECK (
  public.user_belongs_to_company(auth.uid(), company_id)
  AND created_by = auth.uid()
);

CREATE POLICY "notes_update" ON public.notes
FOR UPDATE TO authenticated
USING (
  public.is_global_admin(auth.uid())
  OR public.is_company_gestor(auth.uid(), company_id)
  OR created_by = auth.uid()
)
WITH CHECK (
  public.is_global_admin(auth.uid())
  OR public.is_company_gestor(auth.uid(), company_id)
  OR (
    created_by = auth.uid()
    AND public.user_belongs_to_company(auth.uid(), company_id)
  )
);