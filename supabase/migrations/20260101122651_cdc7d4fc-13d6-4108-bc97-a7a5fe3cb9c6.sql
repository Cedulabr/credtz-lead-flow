-- Allow admins to manage files in the private 'financial-receipts' bucket
-- (Table RLS already allows admins on public.payment_receipts, but Storage needs its own policies.)

-- SELECT
DROP POLICY IF EXISTS "Admins can view all financial receipts files" ON storage.objects;
CREATE POLICY "Admins can view all financial receipts files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'financial-receipts'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- INSERT
DROP POLICY IF EXISTS "Admins can upload financial receipts files" ON storage.objects;
CREATE POLICY "Admins can upload financial receipts files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'financial-receipts'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- DELETE
DROP POLICY IF EXISTS "Admins can delete financial receipts files" ON storage.objects;
CREATE POLICY "Admins can delete financial receipts files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'financial-receipts'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
