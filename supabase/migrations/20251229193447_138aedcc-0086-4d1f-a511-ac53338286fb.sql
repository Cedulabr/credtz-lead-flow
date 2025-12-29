-- Atualizar o bucket client-documents para permitir acesso aos arquivos

-- Primeiro, tornar o bucket público para permitir visualização dos arquivos
UPDATE storage.buckets 
SET public = true 
WHERE id = 'client-documents';

-- Criar políticas de acesso para o bucket client-documents

-- Política para permitir upload de arquivos para usuários autenticados
CREATE POLICY "Users can upload client documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

-- Política para permitir visualização pública dos arquivos
CREATE POLICY "Public can view client documents" 
ON storage.objects 
FOR SELECT 
TO public
USING (bucket_id = 'client-documents');

-- Política para permitir que admins deletem arquivos
CREATE POLICY "Admins can delete client documents" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'client-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Política para permitir que usuários atualizem seus próprios arquivos
CREATE POLICY "Users can update their own client documents" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'client-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);