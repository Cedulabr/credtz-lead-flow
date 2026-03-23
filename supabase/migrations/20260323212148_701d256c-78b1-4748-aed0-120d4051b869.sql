ALTER TABLE public.autolead_jobs ADD COLUMN IF NOT EXISTS audio_file_id uuid;
ALTER TABLE public.autolead_messages ADD COLUMN IF NOT EXISTS audio_file_id uuid;