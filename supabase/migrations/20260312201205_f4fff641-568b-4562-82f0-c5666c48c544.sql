
-- Add INSERT policy for users to upload to their own folder
CREATE POLICY "Users can upload to own folder in user-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Add DELETE policy for users to delete their own files
CREATE POLICY "Users can delete own files in user-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Add admin full access to user-documents storage
CREATE POLICY "Admins full access to user-documents storage"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'user-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'user-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
