ALTER TABLE public.televendas DROP CONSTRAINT televendas_status_check;

ALTER TABLE public.televendas ADD CONSTRAINT televendas_status_check CHECK (status = ANY (ARRAY[
  'solicitar_digitacao',
  'bloqueado',
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
]));