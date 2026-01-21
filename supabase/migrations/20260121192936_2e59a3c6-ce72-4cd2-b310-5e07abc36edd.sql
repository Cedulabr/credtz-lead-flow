-- Create storage policies for imports bucket

-- Allow authenticated users to upload to imports bucket (their own folder)
CREATE POLICY "Users can upload to imports bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'imports' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow authenticated users to view their own imports
CREATE POLICY "Users can view their own imports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'imports' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- Allow admins to view all imports
CREATE POLICY "Admins can view all imports"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'imports' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Allow service role full access (for edge functions)
CREATE POLICY "Service role full access to imports"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'imports')
WITH CHECK (bucket_id = 'imports');