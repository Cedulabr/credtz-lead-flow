-- Drop the existing check constraint
ALTER TABLE public.propostas DROP CONSTRAINT IF EXISTS propostas_client_status_check;

-- Add the updated check constraint with the new status
ALTER TABLE public.propostas ADD CONSTRAINT propostas_client_status_check 
CHECK (client_status IN ('cliente_intencionado', 'proposta_enviada', 'proposta_digitada', 'proposta_recusada', 'contato_futuro'));