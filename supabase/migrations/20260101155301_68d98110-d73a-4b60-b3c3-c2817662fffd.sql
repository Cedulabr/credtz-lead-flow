-- Fix Televendas permissions for Gestor (company manager) and owners

-- 1) Allow UPDATE for owner OR admin OR gestor of the company
DROP POLICY IF EXISTS "Users can update their own televendas" ON public.televendas;

CREATE POLICY "Users can update televendas (owner or gestor)"
ON public.televendas
FOR UPDATE
TO public
USING (
  (auth.uid() = user_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_company_gestor(company_id, auth.uid())
);

-- 2) Allow DELETE for owner OR admin OR gestor of the company
CREATE POLICY "Users can delete televendas (owner or gestor)"
ON public.televendas
FOR DELETE
TO public
USING (
  (auth.uid() = user_id)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.is_company_gestor(company_id, auth.uid())
);

-- 3) Backfill company_id for existing televendas rows (currently all NULL)
UPDATE public.televendas t
SET company_id = (
  SELECT uc.company_id
  FROM public.user_companies uc
  WHERE uc.user_id = t.user_id
    AND uc.is_active = true
  ORDER BY uc.created_at ASC NULLS LAST, uc.company_id ASC
  LIMIT 1
)
WHERE t.company_id IS NULL;