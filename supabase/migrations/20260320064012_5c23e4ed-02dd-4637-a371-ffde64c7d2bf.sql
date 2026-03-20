
-- Table for audio file metadata
CREATE TABLE public.audio_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_path text NOT NULL,
  file_size integer,
  mime_type text DEFAULT 'audio/mpeg',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own and company audios" ON public.audio_files
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR company_id IN (SELECT public.get_user_company_ids(auth.uid()))
    OR public.is_global_admin(auth.uid())
  );

CREATE POLICY "Users insert own audios" ON public.audio_files
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own audios" ON public.audio_files
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR public.is_global_admin(auth.uid())
  );

-- Storage bucket for audio files (public for easy playback)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio-files', 'audio-files', true);

-- Storage policies
CREATE POLICY "Authenticated users can upload audio files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audio-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can read audio files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'audio-files');

CREATE POLICY "Users can delete own audio files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'audio-files' AND (storage.foldername(name))[1] = auth.uid()::text);
