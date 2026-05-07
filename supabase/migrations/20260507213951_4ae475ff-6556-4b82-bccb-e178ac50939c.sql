DO $$ BEGIN
  CREATE TYPE public.discount_mode_type AS ENUM ('financeiro', 'banco', 'misto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.hour_bank_settings
  ADD COLUMN IF NOT EXISTS discount_mode public.discount_mode_type NOT NULL DEFAULT 'financeiro';