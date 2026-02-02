-- Add cancellation date column to televendas table
ALTER TABLE public.televendas 
ADD COLUMN IF NOT EXISTS data_cancelamento DATE NULL;

COMMENT ON COLUMN public.televendas.data_cancelamento IS 'Data em que a proposta foi cancelada';