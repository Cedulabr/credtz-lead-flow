-- Make voicer-audios bucket public
INSERT INTO storage.buckets (id, name, public)
VALUES ('voicer-audios', 'voicer-audios', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for voicer-audios' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Public read access for voicer-audios"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'voicer-audios');
  END IF;
END $$;

-- Allow service role to upload
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role upload for voicer-audios' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Service role upload for voicer-audios"
    ON storage.objects FOR INSERT
    TO service_role
    WITH CHECK (bucket_id = 'voicer-audios');
  END IF;
END $$;

-- Allow service role to update (upsert)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Service role update for voicer-audios' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Service role update for voicer-audios"
    ON storage.objects FOR UPDATE
    TO service_role
    USING (bucket_id = 'voicer-audios');
  END IF;
END $$;