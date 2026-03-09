
-- Add geofence columns to time_clock_settings
ALTER TABLE public.time_clock_settings
  ADD COLUMN IF NOT EXISTS company_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS company_longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS block_on_invalid_photo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS block_on_geofence_violation BOOLEAN DEFAULT false;

-- Add audit columns to time_clock
ALTER TABLE public.time_clock
  ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS audit_flags JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audit_status TEXT DEFAULT 'normal';

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_time_clock_audit_status ON public.time_clock(audit_status);
CREATE INDEX IF NOT EXISTS idx_time_clock_trust_score ON public.time_clock(trust_score);
