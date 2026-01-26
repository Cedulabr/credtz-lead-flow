-- Drop the old status check constraint
ALTER TABLE public.televendas DROP CONSTRAINT IF EXISTS televendas_status_check;

-- Create new check constraint with ALL valid status values (old + new)
ALTER TABLE public.televendas ADD CONSTRAINT televendas_status_check 
CHECK (status = ANY (ARRAY[
  -- Legacy status (keep for backwards compatibility)
  'pendente'::text,
  'pago'::text,
  'cancelado'::text,
  'solicitado_digitacao'::text,
  'proposta_digitada'::text,
  'pago_aguardando'::text,
  'cancelado_aguardando'::text,
  'devolvido'::text,
  'pago_aprovado'::text,
  'cancelado_confirmado'::text,
  -- New workflow status
  'solicitar_digitacao'::text,
  'proposta_paga'::text,
  'proposta_cancelada'::text,
  'solicitar_exclusao'::text,
  'proposta_pendente'::text,
  'exclusao_aprovada'::text,
  'exclusao_rejeitada'::text
]));