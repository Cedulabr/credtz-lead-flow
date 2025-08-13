-- Create enum for user level
DO $$ BEGIN
  CREATE TYPE public.user_level AS ENUM ('home_office_senior', 'home_office_junior');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add new columns to profiles for company, level and pix key
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS level public.user_level,
  ADD COLUMN IF NOT EXISTS pix_key text;

-- No changes to RLS needed since inserts will be done via service role in Edge Function
