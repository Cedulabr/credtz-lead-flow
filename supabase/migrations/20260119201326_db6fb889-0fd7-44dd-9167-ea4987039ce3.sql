-- Drop the old constraint
ALTER TABLE public.televendas DROP CONSTRAINT IF EXISTS televendas_status_check;

-- Add new constraint with all valid statuses
ALTER TABLE public.televendas ADD CONSTRAINT televendas_status_check 
CHECK (status = ANY (ARRAY[
  -- Legacy statuses
  'pendente'::text, 
  'pago'::text, 
  'cancelado'::text, 
  -- User operational statuses
  'solicitado_digitacao'::text, 
  'proposta_digitada'::text,
  'pago_aguardando'::text,
  'cancelado_aguardando'::text,
  -- Manager statuses  
  'devolvido'::text,
  'pago_aprovado'::text,
  'cancelado_confirmado'::text
]));