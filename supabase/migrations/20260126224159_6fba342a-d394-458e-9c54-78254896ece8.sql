-- Add reason column to televendas_status_history for audit trail
ALTER TABLE public.televendas_status_history 
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.televendas_status_history.reason IS 'Motivo da alteração de status (obrigatório para alterações críticas)';