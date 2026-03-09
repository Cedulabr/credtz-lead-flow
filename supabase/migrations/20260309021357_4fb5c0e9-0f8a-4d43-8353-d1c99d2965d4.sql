
-- Add unique constraint for upsert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'time_clock_hour_bank_user_month_unique'
  ) THEN
    ALTER TABLE public.time_clock_hour_bank ADD CONSTRAINT time_clock_hour_bank_user_month_unique UNIQUE (user_id, reference_month);
  END IF;
END $$;
