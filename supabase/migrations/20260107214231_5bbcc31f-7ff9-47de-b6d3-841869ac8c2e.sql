-- saved_proposals: tighten access by user/company and allow admins

ALTER TABLE public.saved_proposals ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own proposals" ON public.saved_proposals;
DROP POLICY IF EXISTS "Users can create their own proposals" ON public.saved_proposals;
DROP POLICY IF EXISTS "Users can update their own proposals" ON public.saved_proposals;
DROP POLICY IF EXISTS "Users can delete their own proposals" ON public.saved_proposals;

-- SELECT: owner OR company members OR global admin
CREATE POLICY "saved_proposals_select_scope"
ON public.saved_proposals
FOR SELECT
TO authenticated
USING (
  public.is_global_admin(auth.uid())
  OR auth.uid() = user_id
  OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
);

-- INSERT: must be owner; company_id must belong to user (or null, trigger will set)
CREATE POLICY "saved_proposals_insert_owner"
ON public.saved_proposals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    public.is_global_admin(auth.uid())
    OR company_id IS NULL
    OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
  )
);

-- UPDATE: owner within company scope OR global admin
CREATE POLICY "saved_proposals_update_scope"
ON public.saved_proposals
FOR UPDATE
TO authenticated
USING (
  public.is_global_admin(auth.uid())
  OR (
    auth.uid() = user_id
    AND (
      company_id IS NULL
      OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    )
  )
)
WITH CHECK (
  public.is_global_admin(auth.uid())
  OR (
    auth.uid() = user_id
    AND (
      company_id IS NULL
      OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    )
  )
);

-- DELETE: owner OR global admin
CREATE POLICY "saved_proposals_delete_scope"
ON public.saved_proposals
FOR DELETE
TO authenticated
USING (
  public.is_global_admin(auth.uid())
  OR auth.uid() = user_id
);
