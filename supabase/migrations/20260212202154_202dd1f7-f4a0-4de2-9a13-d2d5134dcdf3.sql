
-- Step 1: Drop constraint first
ALTER TABLE public.televendas DROP CONSTRAINT IF EXISTS televendas_status_check;

-- Step 2: Migrate ALL legacy statuses
UPDATE public.televendas SET status = 'proposta_paga' WHERE status IN ('pago', 'pago_aprovado');
UPDATE public.televendas SET status = 'proposta_cancelada' WHERE status = 'cancelado';
UPDATE public.televendas SET status = 'proposta_pendente' WHERE status = 'pendente';
UPDATE public.televendas SET status = 'solicitar_digitacao' WHERE status = 'solicitado_digitacao';
UPDATE public.televendas SET status = 'em_andamento' WHERE status = 'proposta_digitada';

-- Step 3: Re-add constraint with all valid statuses including em_andamento
ALTER TABLE public.televendas ADD CONSTRAINT televendas_status_check 
CHECK (status IN (
  'solicitar_digitacao',
  'em_andamento',
  'pago_aguardando',
  'cancelado_aguardando',
  'devolvido',
  'proposta_paga',
  'proposta_cancelada',
  'proposta_pendente',
  'solicitar_exclusao',
  'exclusao_aprovada',
  'exclusao_rejeitada'
));
