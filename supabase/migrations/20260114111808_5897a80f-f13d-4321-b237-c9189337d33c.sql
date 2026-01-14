-- Add fields for resumption and chunk processing
ALTER TABLE public.import_jobs 
ADD COLUMN IF NOT EXISTS last_processed_offset BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS chunk_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_ended_at TIMESTAMP WITH TIME ZONE;