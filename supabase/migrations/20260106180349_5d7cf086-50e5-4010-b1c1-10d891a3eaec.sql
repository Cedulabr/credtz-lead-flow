-- Update the status constraint to include all required statuses
ALTER TABLE public.televendas DROP CONSTRAINT IF EXISTS televendas_status_check;

ALTER TABLE public.televendas ADD CONSTRAINT televendas_status_check 
CHECK (status = ANY (ARRAY['pendente'::text, 'pago'::text, 'cancelado'::text, 'solicitado_digitacao'::text, 'proposta_digitada'::text]));