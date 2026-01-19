-- Add columns to lead_simulations for storing simulation details
ALTER TABLE public.lead_simulations
ADD COLUMN IF NOT EXISTS produto TEXT,
ADD COLUMN IF NOT EXISTS parcela NUMERIC,
ADD COLUMN IF NOT EXISTS valor_liberado NUMERIC,
ADD COLUMN IF NOT EXISTS banco TEXT;