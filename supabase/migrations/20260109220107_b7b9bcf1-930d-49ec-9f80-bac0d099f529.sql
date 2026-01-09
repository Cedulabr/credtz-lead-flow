-- Atualizar o bucket time-clock-photos para ser público
UPDATE storage.buckets 
SET public = true 
WHERE id = 'time-clock-photos';

-- Criar política para visualização pública das fotos
CREATE POLICY "Time clock photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'time-clock-photos');

-- Criar política para upload de fotos (usuários autenticados podem fazer upload)
CREATE POLICY "Authenticated users can upload time clock photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'time-clock-photos' AND auth.role() = 'authenticated');

-- Criar política para atualização de fotos próprias
CREATE POLICY "Users can update their own time clock photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'time-clock-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Criar política para exclusão de fotos próprias
CREATE POLICY "Users can delete their own time clock photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'time-clock-photos' AND auth.uid()::text = (storage.foldername(name))[1]);