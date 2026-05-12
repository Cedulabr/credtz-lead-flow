
ALTER TABLE public.televendas
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text,
  ADD COLUMN IF NOT EXISTS reativada_em timestamptz,
  ADD COLUMN IF NOT EXISTS reativacao_score smallint,
  ADD COLUMN IF NOT EXISTS reativacao_justificativa text;

CREATE INDEX IF NOT EXISTS idx_televendas_status_cancel ON public.televendas(status) WHERE status = 'proposta_cancelada';
CREATE INDEX IF NOT EXISTS idx_televendas_reativada_em ON public.televendas(reativada_em) WHERE reativada_em IS NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS can_access_reaproveitamento boolean NOT NULL DEFAULT false;
