-- Drop the existing constraint
ALTER TABLE public.propostas DROP CONSTRAINT IF EXISTS propostas_client_status_check;

-- Add the updated constraint including all existing and new status values
ALTER TABLE public.propostas ADD CONSTRAINT propostas_client_status_check 
CHECK (client_status IN (
  'novo',
  'contato_iniciado',
  'cliente_intencionado',
  'contato_futuro',
  'cliente_recusado',
  'proposta_enviada',
  'proposta_digitada',
  'proposta_recusada',
  'aguardando_retorno'
));